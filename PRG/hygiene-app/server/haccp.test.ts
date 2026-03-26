import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getAllUsers: vi.fn().mockResolvedValue([]),
  setUserRole: vi.fn().mockResolvedValue(undefined),
  getTemperatureLogs: vi.fn().mockResolvedValue([]),
  getTemperatureWarnings: vi.fn().mockResolvedValue([]),
  createTemperatureLog: vi.fn().mockResolvedValue(undefined),
  getChecklists: vi.fn().mockResolvedValue([]),
  getChecklistWithItems: vi.fn().mockResolvedValue(null),
  getChecklistCompletions: vi.fn().mockResolvedValue([]),
  createChecklist: vi.fn().mockResolvedValue(undefined),
  completeChecklist: vi.fn().mockResolvedValue(undefined),
  getGoodsReceipts: vi.fn().mockResolvedValue([]),
  createGoodsReceipt: vi.fn().mockResolvedValue(undefined),
  getCleaningPlans: vi.fn().mockResolvedValue([]),
  getCleaningCompletions: vi.fn().mockResolvedValue([]),
  createCleaningPlan: vi.fn().mockResolvedValue(undefined),
  completeCleaningTask: vi.fn().mockResolvedValue(undefined),
  getPestControls: vi.fn().mockResolvedValue([]),
  createPestControl: vi.fn().mockResolvedValue(undefined),
  getHaccpPoints: vi.fn().mockResolvedValue([
    { id: 1, pointNumber: 1, title: "HACCP Konzept", isApplicable: true, isActive: true, description: null, inapplicableReason: null, notes: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  updateHaccpPoint: vi.fn().mockResolvedValue(undefined),
  getHaccpEntries: vi.fn().mockResolvedValue([]),
  createHaccpEntry: vi.fn().mockResolvedValue(undefined),
  getTrainingRecords: vi.fn().mockResolvedValue([]),
  createTrainingRecord: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({
    temperaturesToday: 0,
    checklistsCompletedToday: 0,
    temperatureWarnings: 0,
    activeHaccpPoints: 16,
  }),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/report.json", key: "reports/test.json" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://example.com/file.json", key: "reports/test.json" }),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test-id"),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: 1, role: "admin" });
  });

  it("returns null when not authenticated", async () => {
    const ctx = { ...createAdminContext(), user: null };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("haccp.points", () => {
  it("returns HACCP points list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.haccp.points();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatchObject({ pointNumber: 1, title: "HACCP Konzept" });
  });
});

describe("haccp.toggleApplicable", () => {
  it("allows toggling HACCP point applicability", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.haccp.toggleApplicable({ id: 1, isApplicable: false })).resolves.not.toThrow();
  });
});

describe("haccp.updatePoint", () => {
  it("allows updating HACCP point notes", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.haccp.updatePoint({ id: 1, notes: "Betriebsspezifische Notiz" })).resolves.not.toThrow();
  });
});

describe("temperature.list", () => {
  it("returns temperature logs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.temperature.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("temperature.create", () => {
  it("creates a temperature log entry", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.temperature.create({
        location: "Kühlschrank 1",
        locationCategory: "fridge",
        temperatureCelsius: 4,
        minThreshold: 0,
        maxThreshold: 7,
      })
    ).resolves.not.toThrow();
  });
});

describe("users.setRole", () => {
  it("allows admin to change user role", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.setRole({ userId: 2, role: "admin" })).resolves.not.toThrow();
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.users.setRole({ userId: 1, role: "admin" })).rejects.toThrow("Forbidden");
  });
});

describe("dashboard.stats", () => {
  it("returns dashboard statistics", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.stats();
    expect(result).toMatchObject({
      temperaturesToday: expect.any(Number),
      checklistsCompletedToday: expect.any(Number),
      temperatureWarnings: expect.any(Number),
      activeHaccpPoints: expect.any(Number),
    });
  });
});

describe("reports.generate", () => {
  it("generates a report and returns a URL", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reports.generate({
      dateFrom: new Date("2026-03-01"),
      dateTo: new Date("2026-03-31"),
      sections: ["temperatures", "goodsReceipts"],
    });
    expect(result).toMatchObject({
      url: expect.any(String),
      filename: expect.stringContaining("haccp-bericht"),
    });
  });
});

describe("checklists.list", () => {
  it("returns checklists", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checklists.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("goodsReceipt.list", () => {
  it("returns goods receipts", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.goodsReceipt.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cleaning.plans", () => {
  it("returns cleaning plans", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cleaning.plans();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("pestControl.list", () => {
  it("returns pest control records", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pestControl.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("training.list", () => {
  it("returns training records", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.training.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
