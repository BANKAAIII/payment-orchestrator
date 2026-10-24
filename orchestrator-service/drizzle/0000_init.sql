CREATE TYPE "public"."outboxStatus" AS ENUM('DBCOMPLETE', 'BROKERCOMPLETE');--> statement-breakpoint
CREATE TYPE "public"."routingQueue" AS ENUM('INITIATED', 'PROCESSING', 'PENDING', 'COMPLETED', 'FAILED', 'REFUND', 'DLQ');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('1', '2', '3', '4', '5', '6', '7');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_id" text NOT NULL,
	"outbox_status" text DEFAULT 'DBCOMPLETE' NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routeWorkers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" text NOT NULL,
	"routing_key" "routingQueue" NOT NULL,
	"error_message" text DEFAULT 'null',
	"route_retry" text DEFAULT '0' NOT NULL,
	"priority" "priority" DEFAULT '1',
	"workerNumber" numeric,
	"totalWorkersRetries" numeric DEFAULT '0' NOT NULL,
	"transaction_status" "transaction_status" DEFAULT 'PENDING',
	"redis_log_key" text,
	"totalTime" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payer_upi_id" text NOT NULL,
	"payee_upi_id" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0.00',
	"idempotency_key" text NOT NULL,
	"idempotency_ttl" timestamp with time zone,
	"transaction_id" text NOT NULL,
	"gateway_id" text NOT NULL,
	"client_id" text NOT NULL,
	"transaction_status" "transaction_status" DEFAULT 'PENDING',
	"orchestrator_id" text DEFAULT 'hardcodeFnEditAtScale',
	"priority" numeric DEFAULT '1' NOT NULL,
	"workerRedis" text NOT NULL,
	"startTimestamp" time,
	"endTimestamp" time,
	CONSTRAINT "transactions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "transactions_transaction_id_unique" UNIQUE("transaction_id")
);
