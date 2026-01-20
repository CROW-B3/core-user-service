import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const userBuilder = sqliteTable('user_builder', {
  id: text('id').primaryKey(),
  betterAuthUserId: text('betterAuthUserId').notNull(),
  organizationId: text('organizationId').notNull(),
  permissions: text('permissions').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  betterAuthUserId: text('betterAuthUserId').notNull().unique(),
  organizationId: text('organizationId').notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  permissions: text('permissions').notNull(),
  role: text('role').notNull().default('member'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});
