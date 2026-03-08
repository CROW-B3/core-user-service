CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`betterAuthUserId` text NOT NULL,
	`organizationId` text NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`permissions` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_betterAuthUserId_unique` ON `user` (`betterAuthUserId`);--> statement-breakpoint
CREATE TABLE `user_builder` (
	`id` text PRIMARY KEY NOT NULL,
	`betterAuthUserId` text NOT NULL,
	`organizationId` text NOT NULL,
	`permissions` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer NOT NULL
);
