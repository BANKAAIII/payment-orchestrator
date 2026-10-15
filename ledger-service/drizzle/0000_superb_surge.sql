CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."transaction_flag" AS ENUM('NORMAL', 'SUSPICIOUS', 'HIGH_VALUE', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TABLE "ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"orchestrator_id" uuid NOT NULL,
	"gateway_id" uuid NOT NULL,
	"payer_upi_id" text NOT NULL,
	"payee_upi_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"flag" "transaction_flag" DEFAULT 'NORMAL' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
