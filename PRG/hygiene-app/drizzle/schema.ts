import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Temperature Logs ─────────────────────────────────────────────────────────

export const temperatureLogs = mysqlTable("temperature_logs", {
  id: int("id").autoincrement().primaryKey(),
  location: varchar("location", { length: 128 }).notNull(), // z.B. "Kühlschrank 1", "Tiefkühler"
  locationCategory: mysqlEnum("locationCategory", [
    "fridge",
    "freezer",
    "storage",
    "food_hot",
    "food_cold",
    "delivery",
  ]).notNull(),
  temperatureCelsius: int("temperatureCelsius").notNull(), // Ganzzahl (kein Dezimal)
  minThreshold: int("minThreshold"), // Untere Grenze (z.B. -18 für TK)
  maxThreshold: int("maxThreshold"), // Obere Grenze (z.B. 7 für Kühlschrank)
  isWithinRange: boolean("isWithinRange").notNull().default(true),
  notes: text("notes"),
  recordedBy: int("recordedBy").notNull(), // FK users.id
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TemperatureLog = typeof temperatureLogs.$inferSelect;
export type InsertTemperatureLog = typeof temperatureLogs.$inferInsert;

// ─── Checklist Templates ──────────────────────────────────────────────────────

export const checklists = mysqlTable("checklists", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).notNull(),
  category: varchar("category", { length: 128 }), // z.B. "Reinigung", "Hygiene"
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Checklist = typeof checklists.$inferSelect;
export type InsertChecklist = typeof checklists.$inferInsert;

export const checklistItems = mysqlTable("checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(), // FK checklists.id
  position: int("position").notNull().default(0),
  label: varchar("label", { length: 512 }).notNull(),
  description: text("description"),
  isRequired: boolean("isRequired").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

export const checklistCompletions = mysqlTable("checklist_completions", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(),
  completedBy: int("completedBy").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  notes: text("notes"),
  // JSON-Array der erledigten Item-IDs
  completedItems: text("completedItems").notNull(),
  status: mysqlEnum("status", ["complete", "partial", "pending"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistCompletion = typeof checklistCompletions.$inferSelect;
export type InsertChecklistCompletion = typeof checklistCompletions.$inferInsert;

// ─── Goods Receipt (Warenannahme) ─────────────────────────────────────────────

export const goodsReceipts = mysqlTable("goods_receipts", {
  id: int("id").autoincrement().primaryKey(),
  supplierName: varchar("supplierName", { length: 256 }).notNull(),
  deliveryNote: varchar("deliveryNote", { length: 128 }), // Lieferscheinnummer
  productName: varchar("productName", { length: 256 }).notNull(),
  productCategory: mysqlEnum("productCategory", [
    "meat",
    "fish",
    "dairy",
    "vegetables",
    "frozen",
    "dry_goods",
    "beverages",
    "other",
  ]).notNull(),
  quantityKg: decimal("quantityKg", { precision: 8, scale: 2 }),
  deliveryTemperature: int("deliveryTemperature"), // Ganzzahl
  requiredMinTemp: int("requiredMinTemp"),
  requiredMaxTemp: int("requiredMaxTemp"),
  temperatureOk: boolean("temperatureOk"),
  packagingOk: boolean("packagingOk").notNull().default(true),
  labelingOk: boolean("labelingOk").notNull().default(true),
  qualityAccepted: boolean("qualityAccepted").notNull().default(true),
  rejectionReason: text("rejectionReason"),
  notes: text("notes"),
  receivedBy: int("receivedBy").notNull(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type InsertGoodsReceipt = typeof goodsReceipts.$inferInsert;

// ─── Cleaning Plans ───────────────────────────────────────────────────────────

export const cleaningPlans = mysqlTable("cleaning_plans", {
  id: int("id").autoincrement().primaryKey(),
  area: varchar("area", { length: 256 }).notNull(), // z.B. "Küche", "Toiletten"
  task: varchar("task", { length: 512 }).notNull(),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).notNull(),
  cleaningAgent: varchar("cleaningAgent", { length: 256 }), // Reinigungsmittel
  assignedTo: int("assignedTo"), // FK users.id (optional)
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CleaningPlan = typeof cleaningPlans.$inferSelect;
export type InsertCleaningPlan = typeof cleaningPlans.$inferInsert;

export const cleaningCompletions = mysqlTable("cleaning_completions", {
  id: int("id").autoincrement().primaryKey(),
  cleaningPlanId: int("cleaningPlanId").notNull(),
  completedBy: int("completedBy").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CleaningCompletion = typeof cleaningCompletions.$inferSelect;
export type InsertCleaningCompletion = typeof cleaningCompletions.$inferInsert;

// ─── Pest Control ─────────────────────────────────────────────────────────────

export const pestControls = mysqlTable("pest_controls", {
  id: int("id").autoincrement().primaryKey(),
  inspectionDate: timestamp("inspectionDate").notNull(),
  inspector: varchar("inspector", { length: 256 }).notNull(), // Externer Schädlingsbekämpfer oder Mitarbeiter
  area: varchar("area", { length: 256 }).notNull(),
  pestType: varchar("pestType", { length: 128 }), // z.B. "Mäuse", "Insekten"
  findingsDescription: text("findingsDescription"),
  measuresToken: text("measuresToken"), // Ergriffene Maßnahmen
  photoUrl: text("photoUrl"), // S3 URL
  nextInspectionDate: timestamp("nextInspectionDate"),
  status: mysqlEnum("status", ["ok", "findings", "treated", "follow_up"]).notNull().default("ok"),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PestControl = typeof pestControls.$inferSelect;
export type InsertPestControl = typeof pestControls.$inferInsert;

// ─── HACCP Points ─────────────────────────────────────────────────────────────

export const haccpPoints = mysqlTable("haccp_points", {
  id: int("id").autoincrement().primaryKey(),
  pointNumber: int("pointNumber").notNull().unique(), // QP 1–19
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  isApplicable: boolean("isApplicable").notNull().default(true), // Manche QPs entfallen
   inapplicableReason: text("inapplicableReason"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type HaccpPoint = typeof haccpPoints.$inferSelect;
export type InsertHaccpPoint = typeof haccpPoints.$inferInsert;

export const haccpEntries = mysqlTable("haccp_entries", {
  id: int("id").autoincrement().primaryKey(),
  haccpPointId: int("haccpPointId").notNull(),
  entryDate: timestamp("entryDate").defaultNow().notNull(),
  status: mysqlEnum("status", ["ok", "deviation", "corrective_action", "pending"]).notNull().default("pending"),
  description: text("description"),
  correctiveAction: text("correctiveAction"),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HaccpEntry = typeof haccpEntries.$inferSelect;
export type InsertHaccpEntry = typeof haccpEntries.$inferInsert;

// ─── Training Records (QP 15) ─────────────────────────────────────────────────

export const trainingRecords = mysqlTable("training_records", {
  id: int("id").autoincrement().primaryKey(),
  trainingTitle: varchar("trainingTitle", { length: 256 }).notNull(),
  trainingDate: timestamp("trainingDate").notNull(),
  trainer: varchar("trainer", { length: 256 }).notNull(),
  participantIds: text("participantIds").notNull(),
  topics: text("topics"),
  notes: text("notes"),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type InsertTrainingRecord = typeof trainingRecords.$inferInsert;
