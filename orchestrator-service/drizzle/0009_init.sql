CREATE TYPE "public"."transaction_flag" AS ENUM('NORMAL', 'SUSPICIOUS', 'BLOCK');--> statement-breakpoint
ALTER TABLE "routeWorkers" ADD COLUMN "transaction_flag" "transaction_flag" DEFAULT 'NORMAL';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transaction_flag" "transaction_flag" DEFAULT 'NORMAL';