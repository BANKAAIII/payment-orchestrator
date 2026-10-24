ALTER TYPE "public"."outboxStatus" RENAME TO "outbox_status";--> statement-breakpoint
DROP TYPE "public"."outbox_status";--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED');--> statement-breakpoint
ALTER TABLE "outbox_events" ALTER COLUMN "outbox_status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "routing_key" text DEFAULT 'INITIATED' NOT NULL;