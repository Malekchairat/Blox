import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { InsertUser, users, cases, casePhotos, donations, events, favorites } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      _db = drizzle({ client: sql });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Cases queries
export async function getCases(filters?: {
  category?: string;
  status?: string;
  isUrgent?: boolean;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(cases);
  
  // Apply filters here if needed
  const result = await query;
  return result;
}

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCasePhotos(caseId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(casePhotos).where(eq(casePhotos.caseId, caseId));
  return result;
}

export async function createCase(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(cases).values(data);
  return result;
}

export async function getDonationsByCase(caseId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(donations).where(eq(donations.caseId, caseId));
  return result;
}

export async function getDonationsByDonor(donorId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(donations).where(eq(donations.donorId, donorId));
  return result;
}

export async function getEvents() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(events);
  return result;
}

// Admin queries
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users);
  return result;
}

export async function updateUserRole(userId: number, role: "donor" | "association" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateCaseStatus(caseId: number, status: "pending" | "approved" | "rejected" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(cases).set({ status }).where(eq(cases.id, caseId));
}

// Association queries
export async function getCasesByAssociation(associationId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(cases).where(eq(cases.associationId, associationId));
  return result;
}

// Favorites queries
export async function getFavoritesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(favorites).where(eq(favorites.userId, userId));
  return result;
}
