import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["donor", "association", "admin"]);
export const categoryEnum = pgEnum("category", ["health", "disability", "children", "education", "renovation", "emergency"]);
export const statusEnum = pgEnum("status", ["pending", "approved", "rejected", "completed"]);
export const postTypeEnum = pgEnum("post_type", ["photo", "event", "activity"]);
export const membershipTierEnum = pgEnum("membership_tier", ["bronze", "silver", "gold", "platinum"]);
export const membershipStatusEnum = pgEnum("membership_status", ["pending", "approved", "rejected"]);
export const meetingStatusEnum = pgEnum("meeting_status", ["scheduled", "live", "ended", "cancelled"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: roleEnum("role").default("donor").notNull(),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
  streakCount: integer("streak_count").default(1).notNull(),
  lastStreakDate: timestamp("last_streak_date", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  coverImage: text("cover_image"),
  cha9a9aLink: varchar("cha9a9a_link", { length: 500 }).notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").default(0).notNull(),
  status: statusEnum("status").default("pending").notNull(),
  isUrgent: boolean("is_urgent").default(false).notNull(),
  associationId: integer("association_id").notNull(),
  associationName: varchar("association_name", { length: 255 }),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const casePhotos = pgTable("case_photos", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  photoKey: varchar("photo_key", { length: 500 }).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  donorId: integer("donor_id").notNull(),
  amount: integer("amount").notNull(),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  location: varchar("location", { length: 255 }),
  imageUrl: text("image_url"),
  imageKey: varchar("image_key", { length: 500 }),
  associationId: integer("association_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const caseViews = pgTable("case_views", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  viewDate: timestamp("view_date", { withTimezone: true }).defaultNow().notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  caseId: integer("case_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("favorites_user_case_unique").on(table.userId, table.caseId),
]);

// ── Social features ──────────────────────────────────────────────

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  associationId: integer("association_id").notNull(),
  content: text("content").notNull(),
  type: postTypeEnum("type").default("photo").notNull(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const postImages = pgTable("post_images", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  imageUrl: text("image_url").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("likes_post_user_unique").on(table.postId, table.userId),
]);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("follows_unique").on(table.followerId, table.followingId),
]);

// ── Influencer / Sponsor Solidaire ──────────────────────────────

export const influencerTypeEnum = pgEnum("influencer_type", ["influencer", "sponsor"]);

export const influencers = pgTable("influencers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: influencerTypeEnum("type").default("influencer").notNull(),
  photo: text("photo"),
  socialLinks: text("social_links"),          // JSON string: { instagram?, youtube?, twitter?, tiktok?, website? }
  solidarityMessage: text("solidarity_message"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const influencerCases = pgTable("influencer_cases", {
  id: serial("id").primaryKey(),
  influencerId: integer("influencer_id").notNull(),
  caseId: integer("case_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("influencer_case_unique").on(table.influencerId, table.caseId),
]);

// ── Membership system ──────────────────────────────────────────

export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  associationId: integer("association_id").notNull(),
  tier: membershipTierEnum("tier").default("bronze").notNull(),
  totalDonated: integer("total_donated").default(0).notNull(),
  status: membershipStatusEnum("membership_status").default("pending").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("membership_user_assoc_unique").on(table.userId, table.associationId),
]);

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;

// ── Jitsi Meetings ──────────────────────────────────────────

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  associationId: integer("association_id").notNull(),
  roomName: varchar("room_name", { length: 255 }).notNull().unique(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  duration: integer("duration").default(60).notNull(), // minutes
  status: meetingStatusEnum("status").default("scheduled").notNull(),
  membersOnly: boolean("members_only").default(true).notNull(),
  maxParticipants: integer("max_participants").default(50).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = typeof meetings.$inferInsert;

export const meetingParticipants = pgTable("meeting_participants", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("meeting_participant_unique").on(table.meetingId, table.userId),
]);

// ── WebAuthn Credentials (Face ID / Biometric) ─────────────────

export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").default(0).notNull(),
  transports: text("transports"),  // JSON string array
  deviceName: varchar("device_name", { length: 255 }).default("Mon appareil").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;

// ── Password Reset Tokens ───────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Face Recognition Descriptors ────────────────────────────────

export const faceDescriptors = pgTable("face_descriptors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  descriptor: text("descriptor").notNull(),  // JSON array of 128 floats
  label: varchar("label", { length: 255 }).default("Mon visage").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});