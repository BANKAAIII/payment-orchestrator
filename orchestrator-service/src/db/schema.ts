
import { pgEnum, pgTable, text, timestamp, uuid, integer, numeric, boolean } from 'drizzle-orm/pg-core';

export const routingKeyEnum = pgEnum( 'routingQueue', [
    'INITIATED' , 'PROCESSING' ,'PENDING', 'COMPLETED' , 'FAILED' , 'REFUND' , 'DLQ'
] );

export const txnStatusEnum = pgEnum( 'transaction_status' , [
    'PENDING' , 'SUCCESS' , 'FAILED' , 'REVERSED' , 'CANCELLED'
] );

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
    gateway_id: string
}


export const clientReqSchema = pgTable( 'clientReq' , {
    id:uuid('id').primaryKey(),
    payer_upi_id : text('payerUpiId').notNull(),
    payee_upi_id : text('payeeUpiId').notNull(),
    amount: numeric('amount',{ precision:10,scale:2 }).default('0.00'),
    idempotency_key: text('idempotencyKey').notNull().unique(),
    idempotency_ttl: timestamp('ttl', { withTimezone: true }),
    transaction_id: text('transactionId'),
    gatewayId: text('gatewayId').notNull(),
    client_id: text('clientId').notNull(),
    transaction_status: txnStatusEnum('transaction_status').default('PENDING'),
    orchestrator_id:text('orchestratorId'),
    // alspo redis key give me shape

} )

export const routingQueueSchema = pgTable( 'routingKeyWorkers', {
    id: uuid('id').primaryKey().defaultRandom(),
    transaction_id: text('transaction_id').notNull(),
    routing_key: routingKeyEnum('routing_key').notNull(),
    error_message: text('error_message').default('null'),
    route_retry: text('route_retry').notNull().default('0'),
    priority: transactionPriorityEnum('priority').default('1'),
    workerCount:numeric('workerNumber'),
    totalWorkerRetries:numeric('totalWorkersRetries').default('0').notNull(),
    transaction_status: txnStatusEnum('transaction_status').default('PENDING'),
    redisLogKey: text('redis_log_key'),

    timeElapsed: timestamp('totalTime',{ withTimezone: true }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow()
} )
