import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Cases router
  cases: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        isUrgent: z.boolean().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getCases(input);
      }),
    
    listByAssociation: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux associations" });
        }
        return await db.getCasesByAssociation(ctx.user.id);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const caseData = await db.getCaseById(input.id);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        const photos = await db.getCasePhotos(input.id);
        return { ...caseData, photos };
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string(),
        category: z.enum(["health", "disability", "children", "education", "renovation", "emergency"]),
        coverImage: z.string().url().optional(),
        cha9a9aLink: z.string().url(),
        targetAmount: z.number(),
        isUrgent: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can create cases" });
        }
        return await db.createCase({
          ...input,
          associationId: ctx.user.id,
          isUrgent: input.isUrgent ?? false,
          coverImage: input.coverImage ?? null,
        });
      }),
  }),

  // Donations router
  donations: router({
    getByCase: publicProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDonationsByCase(input.caseId);
      }),
    
    getMyDonations: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getDonationsByDonor(ctx.user.id);
      }),
  }),

  // Events router
  events: router({
    list: publicProcedure.query(async () => {
      return await db.getEvents();
    }),
  }),

  // User profile router
  profile: router({
    update: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        bio: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Update user profile logic here
        return { success: true };
      }),
  }),

  // Admin router
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["donor", "association", "admin"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    updateCaseStatus: adminProcedure
      .input(z.object({
        caseId: z.number(),
        status: z.enum(["approved", "rejected", "completed"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateCaseStatus(input.caseId, input.status);
        return { success: true };
      }),
  }),

  // Favorites router
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFavoritesByUser(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
