CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"upi_id" text NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0.00',
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "wallet_upi_id_unique" UNIQUE("upi_id")
);
