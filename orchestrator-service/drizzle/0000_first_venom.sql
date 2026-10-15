CREATE TYPE "public"."routingQueue" AS ENUM('INITIATED', 'PROCESSING', 'PENDING', 'COMPLETED', 'FAILED', 'REFUND', 'DLQ');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('1', '2', '3', '5');--> statement-breakpoint
CREATE TABLE "clientReq" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payerUpiId" text NOT NULL,
	"payeeUpiId" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0.00',
	"idempotencyKey" boolean DEFAULT false,
	"transactionId" text,
	"gatewayId" text NOT NULL,
	"clientId" text NOT NULL,
	"orchestratorId" text
);
--> statement-breakpoint
CREATE TABLE "routingKeyWorkers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" text NOT NULL,
	"routing_key" "routingQueue" NOT NULL,
	"error_message" text DEFAULT 'null',
	"route_retry" text DEFAULT '0' NOT NULL,
	"priority" "priority" DEFAULT '1',
	"totalWorkersRetries" numeric DEFAULT '0' NOT NULL,
	"redis_log_key" text,
	"totalTime" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
