import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  betterAuthUserId: text('betterAuthUserId').notNull().unique(),
  organizationId: text('organizationId').notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  profilePictureUrl: text('profilePictureUrl'),
  onboardingId: text('onboardingId'),
  permissions: text('permissions').notNull(),
  status: text('status').notNull().default('pending'),
  role: text('role').notNull().default('member'),
  preferences: text('preferences').default(
    '{"emailPatternAlerts":true,"emailBillingNotices":true,"emailTeamInvites":true,"emailWeeklyDigest":true}'
  ),
  createdAt: integer('createdAt').notNull(),
  updatedAt: integer('updatedAt').notNull(),
});
