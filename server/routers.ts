import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { sendEmail, newMeetingEmail, newCaseEmail } from "./_core/email";

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
        includeAll: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getCases(input ?? undefined);
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
        associationId: z.number().optional(), // admin can specify which association
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can create cases" });
        }

        let assignedAssociationId: number;
        let associationName: string;

        if (ctx.user.role === "admin" && input.associationId) {
          // Admin specifies which association
          const assoc = await db.getUserById(input.associationId);
          if (!assoc || assoc.role !== "association") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid association" });
          }
          assignedAssociationId = assoc.id;
          associationName = assoc.name || "Association";
        } else {
          // Association creates for itself
          assignedAssociationId = ctx.user.id;
          associationName = ctx.user.name || "Association";
        }

        const newCase = await db.createCase({
          ...input,
          associationId: assignedAssociationId,
          associationName,
          isUrgent: input.isUrgent ?? false,
          coverImage: input.coverImage ?? null,
        });

        // Send email to all followers of this association (fire-and-forget)
        db.getFollowerEmails(assignedAssociationId).then(emails => {
          if (emails.length > 0) {
            const { subject, html } = newCaseEmail({
              associationName,
              caseTitle: input.title,
              category: input.category,
              description: input.description,
              targetAmount: input.targetAmount,
              isUrgent: input.isUrgent ?? false,
            });
            sendEmail({ to: emails, subject, html });
          }
        });

        return newCase;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["health", "disability", "children", "education", "renovation", "emergency"]).optional(),
        coverImage: z.string().url().optional().nullable(),
        cha9a9aLink: z.string().url().optional(),
        targetAmount: z.number().optional(),
        isUrgent: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updateData } = input;

        // Check the case exists
        const existingCase = await db.getCaseById(id);
        if (!existingCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }

        // Admin can edit any case, association can only edit their own
        if (ctx.user.role === "admin") {
          // Admin can edit any case
        } else if (ctx.user.role === "association") {
          if (existingCase.associationId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own cases" });
          }
        } else {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and associations can edit cases" });
        }

        return await db.updateCase(id, updateData);
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
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
        avatar: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.loginMethod !== "email") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Password change is only available for email accounts",
          });
        }
        if (!ctx.user.passwordHash) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No password set for this account",
          });
        }
        const { verifyPassword, hashPassword } = await import("./_core/auth");
        const valid = await verifyPassword(input.currentPassword, ctx.user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }
        const newHash = await hashPassword(input.newPassword);
        await db.updateUserPassword(ctx.user.id, newHash);
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

    getUserById: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        return user;
      }),

    createUser: adminProcedure
      .input(z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        role: z.enum(["donor", "association", "admin"]),
        phone: z.string().optional(),
        bio: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
        }
        return await db.adminCreateUser(input);
      }),

    updateUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["donor", "association", "admin"]).optional(),
        phone: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...data } = input;
        if (data.email) {
          const existing = await db.getUserByEmail(data.email);
          if (existing && existing.id !== userId) {
            throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
          }
        }
        await db.adminUpdateUser(userId, data);
        return { success: true };
      }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.adminDeleteUser(input.userId);
        return { success: true };
      }),
  }),

  // Favorites router
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFavoritesByUser(ctx.user.id);
    }),

    listWithCases: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFavoritesWithCases(ctx.user.id);
    }),

    toggle: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.toggleFavorite(ctx.user.id, input.caseId);
      }),

    isFavorited: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.isCaseFavorited(ctx.user.id, input.caseId);
      }),
  }),

  // ── Social: Posts router ──────────────────────────────────────

  socialPosts: router({
    create: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        type: z.enum(["photo", "event", "activity"]).default("photo"),
        imageUrls: z.array(z.string()).optional(),
        videoUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can create posts" });
        }
        return await db.createPost({
          associationId: ctx.user.id,
          content: input.content,
          type: input.type,
          imageUrls: input.imageUrls,
          videoUrl: input.videoUrl,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        postId: z.number(),
        content: z.string().min(1).optional(),
        type: z.enum(["photo", "event", "activity"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const { postId, ...data } = input;
        await db.updatePost(postId, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.deletePost(input.postId, ctx.user.id);
        return { success: true };
      }),

    getById: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getPostById(input.postId);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
        return post;
      }),

    listByAssociation: publicProcedure
      .input(z.object({ associationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPostsByAssociation(input.associationId);
      }),

    feed: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input, ctx }) => {
        return await db.getFeedPosts(ctx.user.id, input?.limit ?? 20, input?.offset ?? 0);
      }),
  }),

  // ── Social: Likes router ──────────────────────────────────────

  socialLikes: router({
    toggle: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.toggleLike(input.postId, ctx.user.id);
      }),

    isLiked: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.isPostLiked(input.postId, ctx.user.id);
      }),

    count: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLikesCount(input.postId);
      }),
  }),

  // ── Social: Comments router ──────────────────────────────────────

  socialComments: router({
    create: protectedProcedure
      .input(z.object({
        postId: z.number(),
        content: z.string().min(1).max(1000),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createComment(input.postId, ctx.user.id, input.content);
      }),

    delete: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteComment(input.commentId, ctx.user.id);
        return { success: true };
      }),

    listByPost: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCommentsByPost(input.postId);
      }),
  }),

  // ── Social: Follows router ──────────────────────────────────────

  socialFollows: router({
    toggle: protectedProcedure
      .input(z.object({ associationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.id === input.associationId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot follow yourself" });
        }
        return await db.toggleFollow(ctx.user.id, input.associationId);
      }),

    isFollowing: protectedProcedure
      .input(z.object({ associationId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.isFollowing(ctx.user.id, input.associationId);
      }),

    followersCount: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFollowersCount(input.userId);
      }),

    followingCount: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getFollowingCount(ctx.user.id);
      }),

    followingIds: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getFollowingIds(ctx.user.id);
      }),

    searchAssociations: publicProcedure
      .input(z.object({ query: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.searchAssociations(input?.query);
      }),

    getAssociationProfile: publicProcedure
      .input(z.object({ associationId: z.number() }))
      .query(async ({ input }) => {
        const profile = await db.getAssociationProfile(input.associationId);
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Association not found" });
        return profile;
      }),
  }),

  // ── Influencer / Sponsor Solidaire ──────────────────────────────

  influencers: router({
    // Public: get approved influencers for a case
    getByCase: publicProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInfluencersByCase(input.caseId);
      }),

    // Admin: list all influencers
    list: adminProcedure.query(async () => {
      return await db.getAllInfluencers();
    }),

    // Admin: get one influencer
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const inf = await db.getInfluencerById(input.id);
        if (!inf) throw new TRPCError({ code: "NOT_FOUND", message: "Influencer not found" });
        return inf;
      }),

    // Admin: create
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["influencer", "sponsor"]).default("influencer"),
        photo: z.string().optional(),
        socialLinks: z.string().optional(),
        solidarityMessage: z.string().optional(),
        isApproved: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        return await db.createInfluencer(input);
      }),

    // Admin: update
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        type: z.enum(["influencer", "sponsor"]).optional(),
        photo: z.string().nullable().optional(),
        socialLinks: z.string().nullable().optional(),
        solidarityMessage: z.string().nullable().optional(),
        isApproved: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInfluencer(id, data);
        return { success: true };
      }),

    // Admin: delete
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteInfluencer(input.id);
        return { success: true };
      }),

    // Admin: link to case
    linkToCase: adminProcedure
      .input(z.object({
        influencerId: z.number(),
        caseId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.linkInfluencerToCase(input.influencerId, input.caseId);
        return { success: true };
      }),

    // Admin: unlink from case
    unlinkFromCase: adminProcedure
      .input(z.object({
        influencerId: z.number(),
        caseId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.unlinkInfluencerFromCase(input.influencerId, input.caseId);
        return { success: true };
      }),

    // Admin: get linked case IDs
    getLinkedCaseIds: adminProcedure
      .input(z.object({ influencerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLinkedCaseIds(input.influencerId);
      }),
  }),

  // ── Memberships ──────────────────────────────────────────────

  memberships: router({
    join: protectedProcedure
      .input(z.object({ associationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.joinMembership(ctx.user.id, input.associationId);
      }),

    leave: protectedProcedure
      .input(z.object({ associationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await db.leaveMembership(ctx.user.id, input.associationId);
      }),

    getMy: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getMembershipsByUser(ctx.user.id);
      }),

    getStatus: protectedProcedure
      .input(z.object({ associationId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getMembership(ctx.user.id, input.associationId);
      }),

    getMembers: protectedProcedure
      .input(z.object({ associationId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.id !== input.associationId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the association can view its members" });
        }
        return await db.getMembersByAssociation(input.associationId);
      }),

    getPendingRequests: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can view pending requests" });
        }
        return await db.getPendingMembershipsByAssociation(ctx.user.id);
      }),

    approve: protectedProcedure
      .input(z.object({ membershipId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can approve memberships" });
        }
        return await db.approveMembership(input.membershipId);
      }),

    reject: protectedProcedure
      .input(z.object({ membershipId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can reject memberships" });
        }
        return await db.rejectMembership(input.membershipId);
      }),

    getMemberCount: publicProcedure
      .input(z.object({ associationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMemberCount(input.associationId);
      }),
  }),

  // ── Meetings (Jitsi) ──────────────────────────────────────────

  meetings: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledAt: z.string().transform(s => new Date(s)),
        duration: z.number().min(15).max(480).default(60),
        membersOnly: z.boolean().default(true),
        maxParticipants: z.number().min(2).max(200).default(50),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "association" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only associations can create meetings" });
        }
        const meeting = await db.createMeeting({
          ...input,
          associationId: ctx.user.id,
        });

        // Send email to all approved members (fire-and-forget)
        db.getApprovedMemberEmails(ctx.user.id).then(emails => {
          if (emails.length > 0) {
            const { subject, html } = newMeetingEmail({
              associationName: ctx.user.name || "Association",
              meetingTitle: input.title,
              scheduledAt: input.scheduledAt,
              duration: input.duration ?? 60,
              description: input.description,
            });
            sendEmail({ to: emails, subject, html });
          }
        });

        return meeting;
      }),

    listByAssociation: protectedProcedure
      .input(z.object({ associationId: z.number() }).optional())
      .query(async ({ input, ctx }) => {
        const assocId = input?.associationId ?? ctx.user.id;
        return await db.getMeetingsByAssociation(assocId);
      }),

    upcoming: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getUpcomingMeetingsForUser(ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.object({ meetingId: z.number() }))
      .query(async ({ input }) => {
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
        return meeting;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        meetingId: z.number(),
        status: z.enum(["scheduled", "live", "ended", "cancelled"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && meeting.associationId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateMeetingStatus(input.meetingId, input.status);
        return { success: true };
      }),

    join: protectedProcedure
      .input(z.object({ meetingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
        // If members only, check membership
        if (meeting.membersOnly) {
          const membership = await db.getMembership(ctx.user.id, meeting.associationId);
          if (!membership && ctx.user.role !== "admin" && ctx.user.id !== meeting.associationId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "This meeting is for members only" });
          }
        }
        return await db.joinMeeting(input.meetingId, ctx.user.id);
      }),

    participantCount: protectedProcedure
      .input(z.object({ meetingId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMeetingParticipantCount(input.meetingId);
      }),

    delete: protectedProcedure
      .input(z.object({ meetingId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && meeting.associationId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return await db.deleteMeeting(input.meetingId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
