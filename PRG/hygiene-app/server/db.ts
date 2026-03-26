import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  checklistCompletions,
  checklistItems,
  checklists,
  cleaningCompletions,
  cleaningPlans,
  goodsReceipts,
  haccpEntries,
  haccpPoints,
  InsertUser,
  pestControls,
  temperatureLogs,
  trainingRecords,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

// ─── Temperature Logs ─────────────────────────────────────────────────────────

export async function createTemperatureLog(data: {
  location: string;
  locationCategory: "fridge" | "freezer" | "storage" | "food_hot" | "food_cold" | "delivery";
  temperatureCelsius: number;
  minThreshold?: number;
  maxThreshold?: number;
  notes?: string;
  recordedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const isWithinRange =
    (data.minThreshold == null || data.temperatureCelsius >= data.minThreshold) &&
    (data.maxThreshold == null || data.temperatureCelsius <= data.maxThreshold);

  await db.insert(temperatureLogs).values({ ...data, isWithinRange });
}

export async function getTemperatureLogs(filters?: {
  location?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.location) conditions.push(eq(temperatureLogs.location, filters.location));
  if (filters?.from) conditions.push(gte(temperatureLogs.recordedAt, filters.from));
  if (filters?.to) conditions.push(lte(temperatureLogs.recordedAt, filters.to));

  return db
    .select()
    .from(temperatureLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(temperatureLogs.recordedAt))
    .limit(filters?.limit ?? 100);
}

export async function getTemperatureWarnings() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(temperatureLogs)
    .where(eq(temperatureLogs.isWithinRange, false))
    .orderBy(desc(temperatureLogs.recordedAt))
    .limit(20);
}

// ─── Checklists ───────────────────────────────────────────────────────────────

export async function getChecklists(frequency?: "daily" | "weekly" | "monthly") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(checklists.isActive, true)];
  if (frequency) conditions.push(eq(checklists.frequency, frequency));
  return db.select().from(checklists).where(and(...conditions)).orderBy(checklists.title);
}

export async function getChecklistWithItems(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [checklist] = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  if (!checklist) return null;
  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.checklistId, id))
    .orderBy(checklistItems.position);
  return { ...checklist, items };
}

export async function createChecklist(data: {
  title: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  category?: string;
  createdBy: number;
  items: { label: string; description?: string; isRequired?: boolean }[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [result] = await db.insert(checklists).values({
    title: data.title,
    description: data.description,
    frequency: data.frequency,
    category: data.category,
    createdBy: data.createdBy,
  });

  const insertId = (result as any).insertId as number;

  if (data.items.length > 0) {
    await db.insert(checklistItems).values(
      data.items.map((item, i) => ({
        checklistId: insertId,
        position: i,
        label: item.label,
        description: item.description,
        isRequired: item.isRequired ?? true,
      }))
    );
  }
  return insertId;
}

export async function completeChecklist(data: {
  checklistId: number;
  completedBy: number;
  completedItems: number[];
  notes?: string;
  totalItems: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const status =
    data.completedItems.length === 0
      ? "pending"
      : data.completedItems.length >= data.totalItems
      ? "complete"
      : "partial";

  await db.insert(checklistCompletions).values({
    checklistId: data.checklistId,
    completedBy: data.completedBy,
    completedItems: JSON.stringify(data.completedItems),
    notes: data.notes,
    status,
  });
}

export async function getChecklistCompletions(checklistId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = checklistId ? [eq(checklistCompletions.checklistId, checklistId)] : [];
  return db
    .select()
    .from(checklistCompletions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(checklistCompletions.completedAt))
    .limit(limit);
}

// ─── Goods Receipts ───────────────────────────────────────────────────────────

export async function createGoodsReceipt(data: {
  supplierName: string;
  deliveryNote?: string;
  productName: string;
  productCategory: "meat" | "fish" | "dairy" | "vegetables" | "frozen" | "dry_goods" | "beverages" | "other";
  quantityKg?: number;
  deliveryTemperature?: number;
  requiredMinTemp?: number;
  requiredMaxTemp?: number;
  packagingOk: boolean;
  labelingOk: boolean;
  qualityAccepted: boolean;
  rejectionReason?: string;
  notes?: string;
  receivedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const temperatureOk =
    data.deliveryTemperature == null
      ? null
      : (data.requiredMinTemp == null || data.deliveryTemperature >= data.requiredMinTemp) &&
        (data.requiredMaxTemp == null || data.deliveryTemperature <= data.requiredMaxTemp);

  const { quantityKg, ...rest } = data;
  await db.insert(goodsReceipts).values({
    ...rest,
    quantityKg: quantityKg != null ? String(quantityKg) : undefined,
    temperatureOk: temperatureOk,
  });
}

export async function getGoodsReceipts(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goodsReceipts).orderBy(desc(goodsReceipts.receivedAt)).limit(limit);
}

// ─── Cleaning Plans ───────────────────────────────────────────────────────────

export async function getCleaningPlans(frequency?: "daily" | "weekly" | "monthly") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(cleaningPlans.isActive, true)];
  if (frequency) conditions.push(eq(cleaningPlans.frequency, frequency));
  return db.select().from(cleaningPlans).where(and(...conditions)).orderBy(cleaningPlans.area);
}

export async function createCleaningPlan(data: {
  area: string;
  task: string;
  frequency: "daily" | "weekly" | "monthly";
  cleaningAgent?: string;
  assignedTo?: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(cleaningPlans).values(data);
}

export async function completeCleaningTask(data: {
  cleaningPlanId: number;
  completedBy: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(cleaningCompletions).values(data);
}

export async function getCleaningCompletions(planId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = planId ? [eq(cleaningCompletions.cleaningPlanId, planId)] : [];
  return db
    .select()
    .from(cleaningCompletions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(cleaningCompletions.completedAt))
    .limit(limit);
}

// ─── Pest Controls ────────────────────────────────────────────────────────────

export async function createPestControl(data: {
  inspectionDate: Date;
  inspector: string;
  area: string;
  pestType?: string;
  findingsDescription?: string;
  measuresToken?: string;
  photoUrl?: string;
  nextInspectionDate?: Date;
  status: "ok" | "findings" | "treated" | "follow_up";
  recordedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(pestControls).values(data);
}

export async function getPestControls(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pestControls).orderBy(desc(pestControls.inspectionDate)).limit(limit);
}

// ─── HACCP Points ─────────────────────────────────────────────────────────────

export async function getHaccpPoints() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(haccpPoints).orderBy(haccpPoints.pointNumber);
}

export async function createHaccpEntry(data: {
  haccpPointId: number;
  status: "ok" | "deviation" | "corrective_action" | "pending";
  description?: string;
  correctiveAction?: string;
  recordedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(haccpEntries).values({ ...data, entryDate: new Date() });
}

export async function updateHaccpPoint(id: number, data: { notes?: string; isApplicable?: boolean; inapplicableReason?: string }) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.update(haccpPoints).set(data).where(eq(haccpPoints.id, id));
}

export async function getHaccpEntries(pointId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const conditions = pointId ? [eq(haccpEntries.haccpPointId, pointId)] : [];
  return db
    .select()
    .from(haccpEntries)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(haccpEntries.entryDate))
    .limit(limit);
}

// ─── Training Records ─────────────────────────────────────────────────────────

export async function createTrainingRecord(data: {
  trainingTitle: string;
  trainingDate: Date;
  trainer: string;
  participantIds: number[];
  topics?: string;
  notes?: string;
  recordedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(trainingRecords).values({
    ...data,
    participantIds: JSON.stringify(data.participantIds),
  });
}

export async function getTrainingRecords(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trainingRecords).orderBy(desc(trainingRecords.trainingDate)).limit(limit);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [tempWarnings, todayTemps, todayCompletions, recentReceipts] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(temperatureLogs)
      .where(eq(temperatureLogs.isWithinRange, false)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(temperatureLogs)
      .where(and(gte(temperatureLogs.recordedAt, today), lte(temperatureLogs.recordedAt, tomorrow))),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(checklistCompletions)
      .where(and(gte(checklistCompletions.completedAt, today), lte(checklistCompletions.completedAt, tomorrow))),
    db.select().from(goodsReceipts).orderBy(desc(goodsReceipts.receivedAt)).limit(5),
  ]);

  return {
    temperatureWarnings: Number(tempWarnings[0]?.count ?? 0),
    todayTemperatureChecks: Number(todayTemps[0]?.count ?? 0),
    todayChecklistCompletions: Number(todayCompletions[0]?.count ?? 0),
    recentReceipts,
  };
}
