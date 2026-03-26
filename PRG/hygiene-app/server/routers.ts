import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  completeChecklist,
  completeCleaningTask,
  createChecklist,
  createCleaningPlan,
  createGoodsReceipt,
  createHaccpEntry,
  createPestControl,
  createTemperatureLog,
  createTrainingRecord,
  getAllUsers,
  setUserRole,
  getChecklistCompletions,
  getChecklistWithItems,
  getChecklists,
  getCleaningCompletions,
  getCleaningPlans,
  getDashboardStats,
  getGoodsReceipts,
  getHaccpEntries,
  getHaccpPoints,
  updateHaccpPoint,
  getPestControls,
  getTemperatureLogs,
  getTemperatureWarnings,
  getTrainingRecords,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ─── Auth Router ──────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ─── Users Router ─────────────────────────────────────────────────────────────

const usersRouter = router({
  list: protectedProcedure.query(() => getAllUsers()),
  setRole: protectedProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Forbidden");
      return setUserRole(input.userId, input.role);
    }),
});

// ─── Temperature Router ───────────────────────────────────────────────────────

const temperatureRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        location: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().min(1).max(500).optional(),
      }).optional()
    )
    .query(({ input }) => getTemperatureLogs(input)),

  warnings: protectedProcedure.query(() => getTemperatureWarnings()),

  create: protectedProcedure
    .input(
      z.object({
        location: z.string().min(1),
        locationCategory: z.enum(["fridge", "freezer", "storage", "food_hot", "food_cold", "delivery"]),
        temperatureCelsius: z.number().int(),
        minThreshold: z.number().int().optional(),
        maxThreshold: z.number().int().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      createTemperatureLog({ ...input, recordedBy: ctx.user.id })
    ),
});

// ─── Checklists Router ────────────────────────────────────────────────────────

const checklistsRouter = router({
  list: protectedProcedure
    .input(z.object({ frequency: z.enum(["daily", "weekly", "monthly"]).optional() }).optional())
    .query(({ input }) => getChecklists(input?.frequency)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getChecklistWithItems(input.id)),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        category: z.string().optional(),
        items: z.array(
          z.object({
            label: z.string().min(1),
            description: z.string().optional(),
            isRequired: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(({ input, ctx }) => createChecklist({ ...input, createdBy: ctx.user.id })),

  complete: protectedProcedure
    .input(
      z.object({
        checklistId: z.number(),
        completedItems: z.array(z.number()),
        notes: z.string().optional(),
        totalItems: z.number(),
      })
    )
    .mutation(({ input, ctx }) =>
      completeChecklist({ ...input, completedBy: ctx.user.id })
    ),

  completions: protectedProcedure
    .input(z.object({ checklistId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => getChecklistCompletions(input?.checklistId, input?.limit)),
});

// ─── Goods Receipt Router ─────────────────────────────────────────────────────

const goodsReceiptRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => getGoodsReceipts(input?.limit)),

  create: protectedProcedure
    .input(
      z.object({
        supplierName: z.string().min(1),
        deliveryNote: z.string().optional(),
        productName: z.string().min(1),
        productCategory: z.enum(["meat", "fish", "dairy", "vegetables", "frozen", "dry_goods", "beverages", "other"]),
        quantityKg: z.number().positive().optional(),
        deliveryTemperature: z.number().int().optional(),
        requiredMinTemp: z.number().int().optional(),
        requiredMaxTemp: z.number().int().optional(),
        packagingOk: z.boolean(),
        labelingOk: z.boolean(),
        qualityAccepted: z.boolean(),
        rejectionReason: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      createGoodsReceipt({ ...input, receivedBy: ctx.user.id })
    ),
});

// ─── Cleaning Router ──────────────────────────────────────────────────────────

const cleaningRouter = router({
  plans: protectedProcedure
    .input(z.object({ frequency: z.enum(["daily", "weekly", "monthly"]).optional() }).optional())
    .query(({ input }) => getCleaningPlans(input?.frequency)),

  createPlan: protectedProcedure
    .input(
      z.object({
        area: z.string().min(1),
        task: z.string().min(1),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        cleaningAgent: z.string().optional(),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(({ input, ctx }) => createCleaningPlan({ ...input, createdBy: ctx.user.id })),

  complete: protectedProcedure
    .input(
      z.object({
        cleaningPlanId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      completeCleaningTask({ ...input, completedBy: ctx.user.id })
    ),

  completions: protectedProcedure
    .input(z.object({ planId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => getCleaningCompletions(input?.planId, input?.limit)),
});

// ─── Pest Control Router ──────────────────────────────────────────────────────

const pestControlRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => getPestControls(input?.limit)),

  create: protectedProcedure
    .input(
      z.object({
        inspectionDate: z.date(),
        inspector: z.string().min(1),
        area: z.string().min(1),
        pestType: z.string().optional(),
        findingsDescription: z.string().optional(),
        measuresToken: z.string().optional(),
        photoUrl: z.string().optional(),
        nextInspectionDate: z.date().optional(),
        status: z.enum(["ok", "findings", "treated", "follow_up"]),
      })
    )
    .mutation(({ input, ctx }) =>
      createPestControl({ ...input, recordedBy: ctx.user.id })
    ),

  uploadPhoto: protectedProcedure
    .input(z.object({ base64: z.string(), mimeType: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const key = `pest-control/${nanoid()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
});

// ─── HACCP Router ─────────────────────────────────────────────────────────────

const haccpRouter = router({
  points: protectedProcedure.query(() => getHaccpPoints()),
  updatePoint: protectedProcedure
    .input(z.object({ id: z.number(), notes: z.string().optional() }))
    .mutation(({ input }) => updateHaccpPoint(input.id, { notes: input.notes })),
  toggleApplicable: protectedProcedure
    .input(z.object({ id: z.number(), isApplicable: z.boolean() }))
    .mutation(({ input }) => updateHaccpPoint(input.id, { isApplicable: input.isApplicable })),

  entries: protectedProcedure
    .input(z.object({ pointId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(({ input }) => getHaccpEntries(input?.pointId, input?.limit)),

  createEntry: protectedProcedure
    .input(
      z.object({
        haccpPointId: z.number(),
        status: z.enum(["ok", "deviation", "corrective_action", "pending"]),
        description: z.string().optional(),
        correctiveAction: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      createHaccpEntry({ ...input, recordedBy: ctx.user.id })
    ),
});

// ─── Training Router ──────────────────────────────────────────────────────────

const trainingRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => getTrainingRecords(input?.limit)),

  create: protectedProcedure
    .input(
      z.object({
        trainingTitle: z.string().min(1),
        trainingDate: z.date(),
        trainer: z.string().min(1),
        participantIds: z.array(z.number()),
        topics: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      createTrainingRecord({ ...input, recordedBy: ctx.user.id })
    ),
});

// ─── Reports Router ─────────────────────────────────────────────────────────────
const reportsRouter = router({
  generate: protectedProcedure
    .input(z.object({
      dateFrom: z.date(),
      dateTo: z.date(),
      sections: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate a simple JSON report and upload to S3
      const report: Record<string, unknown> = {
        generatedAt: new Date().toISOString(),
        generatedBy: ctx.user.name ?? ctx.user.openId,
        period: { from: input.dateFrom.toISOString(), to: input.dateTo.toISOString() },
        sections: input.sections,
      };
      if (input.sections.includes('temperatures')) {
        report.temperatures = await getTemperatureLogs({ from: input.dateFrom, to: input.dateTo, limit: 1000 });
      }
      if (input.sections.includes('goodsReceipts')) {
        report.goodsReceipts = await getGoodsReceipts(1000);
      }
      if (input.sections.includes('pestControl')) {
        report.pestControl = await getPestControls(1000);
      }
      if (input.sections.includes('training')) {
        report.training = await getTrainingRecords(1000);
      }
      const json = JSON.stringify(report, null, 2);
      const filename = `haccp-bericht-${input.dateFrom.toISOString().slice(0,10)}-${input.dateTo.toISOString().slice(0,10)}.json`;
      const { url } = await storagePut(`reports/${nanoid()}-${filename}`, Buffer.from(json), 'application/json');
      return { url, filename };
    }),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────

const dashboardRouter = router({
  stats: protectedProcedure.query(() => getDashboardStats()),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  temperature: temperatureRouter,
  checklists: checklistsRouter,
  goodsReceipt: goodsReceiptRouter,
  cleaning: cleaningRouter,
  pestControl: pestControlRouter,
  haccp: haccpRouter,
  training: trainingRouter,
  reports: reportsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
