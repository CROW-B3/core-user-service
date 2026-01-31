import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';

export type User = typeof schema.user.$inferSelect;
export type Database = DrizzleD1Database<typeof schema>;

export const fetchUserById = async (
  database: Database,
  userId: string
): Promise<User | null> => {
  const results = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return results[0] ?? null;
};

export const fetchUserByBetterAuthId = async (
  database: Database,
  betterAuthUserId: string
): Promise<User | null> => {
  const results = await database
    .select()
    .from(schema.user)
    .where(eq(schema.user.betterAuthUserId, betterAuthUserId))
    .limit(1);

  return results[0] ?? null;
};

export const checkEmailsExist = async (
  database: Database,
  emails: string[]
): Promise<string[]> => {
  const existingUsers = await database
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(inArray(schema.user.email, emails));

  return existingUsers.map(user => user.email);
};

export const uploadProfilePictureToR2 = async (
  bucket: R2Bucket,
  userId: string,
  file: File
): Promise<string> => {
  const timestamp = Date.now();
  const key = `profile-pictures/${userId}/${timestamp}-${file.name}`;

  await bucket.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  return `https://pub-YOUR_R2_PUBLIC_URL/${key}`;
};

export const updateUserProfile = async (
  database: Database,
  userId: string,
  updates: { name?: string; profilePictureUrl?: string }
): Promise<User | null> => {
  const timestamp = new Date();

  await database
    .update(schema.user)
    .set({
      ...updates,
      updatedAt: timestamp,
    })
    .where(eq(schema.user.id, userId));

  return fetchUserById(database, userId);
};

export const canManageTeam = (permissions: string): boolean => {
  try {
    const parsed = JSON.parse(permissions);
    return parsed.teamManagement === true;
  } catch {
    return false;
  }
};

export const isAdmin = (permissions: string): boolean => {
  return canManageTeam(permissions);
};
