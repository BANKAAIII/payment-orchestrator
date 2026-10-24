
import { pgEnum, pgTable, text, timestamp, uuid, integer, numeric, boolean, time } from 'drizzle-orm/pg-core';
import { string } from 'zod';

export const ROUTE_WORKER_COUNTS = {
    'initiated': 3,   // e.g., VPA check, Fraud scoring, Read-only balance check
    'processing': 2,  // e.g., Ledger lock, Gateway dispatcher
    'pending': 1,     // Watchdog check
    'failed': 1,      // Error classifier
    'refund': 1,      // Reversal ledger posting
} as const;

export type RouteName = keyof typeof ROUTE_WORKER_COUNTS
export const routingKeyEnum = pgEnum( 'routingQueue', [
    'INITIATED' , 'PROCESSING' ,'PENDING', 'COMPLETED' , 'FAILED' , 'REFUND' , 'DLQ'
] );

export const txnStatusEnum = pgEnum( 'transaction_status' , [
    'PENDING' , 'SUCCESS' , 'FAILED' , 'REVERSED' , 'CANCELLED'
] );

export const txnFlagEnum = pgEnum( 'transaction_flag',[
    'NORMAL' , 'SUSPICIOUS' , 'BLOCK'
] )
export const outboxStatusEnum = pgEnum('outbox_status',['PENDING' , 'PROCESSING' , 'SENT' , 'FAILED']);

// worker payload inputs(interfaces);


// priorities:
// 1 : fresh transaction.
// 2 : more than 3-5 sec in processing 
// 3 : dropped transaction,
// 4 : transaction without db write
// 5 : transaction with db write
// 6 : workers fail > 3-4
// 7 : more than 3-5 sec in processing 
export const transactionPriorityEnum = pgEnum( 'priority', [
    '1','2','3','4','5','6','7'
] )

export interface clientReqInitiateSchemaType{
    payer_upi_id : string,
    payee_upi_id : string,
    amount : number , 
    idempotency_key : string,
    idempotency_ttl : string,
    gateway_id: string,
    payer_client_id:string
}


export const transactionSchema = pgTable( 'transactions' , {
     id:uuid('id').primaryKey().defaultRandom(),
     payer_upi_id : text('payer_upi_id').notNull(),
     payee_upi_id : text('payee_upi_id').notNull(),
     amount: numeric('amount',{ precision:10,scale:2 }).default('0.00'),
     idempotency_key: text('idempotency_key').notNull().unique(),
     idempotency_ttl: timestamp('idempotency_ttl', { withTimezone: true }),
     transaction_id: text('transaction_id').unique().notNull(),
        transaction_flag:txnFlagEnum('transaction_flag').default('NORMAL'),
     gateway_id: text('gateway_id').notNull(),
     client_id: text('client_id').notNull(),
     transaction_status: txnStatusEnum('transaction_status').default('PENDING'),
     orchestrator_id:text('orchestrator_id').default('hardcodeFnEditAtScale'),
     transactionPriorityEnum:numeric('priority').notNull().default('1'),
     worker_redis:text('worker_redis').notNull(),
     start_timestamp:timestamp('start_timestamp',{withTimezone:true}),
     end_timeStamp:timestamp('end_timestamp',{withTimezone:true}),
     routingKeyEnum:text("current_routing_key").default('INITIATED')

} )
export interface RouteWorkerRecord {
    id?: string;                               // Optional on insert (UUID default)
    transaction_id: string;                    // Not null
        transaction_flag:string;    
    routing_key:typeof routingKeyEnum;                   // From routingKeyEnum
    error_message?: string | null;             // Default 'null'
    route_retry: string;                       // Default '0'
    priority?:typeof transactionPriorityEnum| null;                // From transactionPriorityEnum
    workerCount?: string | null;               // Numeric column maps to string in JS/TS
    maxWorkerCount?: string | null;            // Numeric column maps to string in JS/TS
    totalWorkerRetries?: string ;                // Not null, default '0'
    transaction_status?: typeof txnStatusEnum | null;     // From txnStatusEnum
    redisLogKey?: string | null;               // Optional string
    timeElapsed?: Date | string | null;        // Timestamp with timezone
    created_at?: Date | string;                // Default now()
    updated_at?: Date | string | null;                // Default now()
}

export const routeWorkersSchema = pgTable( 'routeWorkers', {
    id: uuid('id').primaryKey().defaultRandom(),
    transaction_id: text('transaction_id').notNull(),
        transaction_flag:txnFlagEnum('transaction_flag').default('NORMAL'), 
    routing_key: routingKeyEnum('routing_key').notNull(),
    error_message: text('error_message').default('null'),
    route_retry: text('route_retry').notNull().default('0'),
    priority: transactionPriorityEnum('priority').default('1'),
    workerCount:numeric('workerNumber'),
    maxWorkerCount:numeric('maxWorkers'),
    totalWorkerRetries:numeric('totalWorkersRetries').default('0').notNull(),
    transaction_status: txnStatusEnum('transaction_status').default('PENDING'),
    redisLogKey: text('redis_log_key'),
    timeElapsed: timestamp('totalTime',{ withTimezone: true }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow()
} )

export const outboxEvents = pgTable("outbox_events", {
    id: uuid("id").primaryKey().defaultRandom(),
    aggregateId: text("aggregate_id").notNull(), // maps to transaction_id
    outbox_Status: text("outbox_status").notNull().default('PENDING'),     // e.g., "TRANSACTION_INITIATED"
    payload: text("payload").notNull(),          // JSON stringified transaction details
    status: text("status").notNull().default("PENDING"), // 'PENDING' or 'PUBLISHED'
    routing_key:text("routing_key").notNull().default('INITIATED'),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

