import { pgTable , uuid , pgEnum , text , numeric , timestamp} from 'drizzle-orm/pg-core'


export const statusEnum = pgEnum( 'transaction_status' , [
    'PENDING' , 'SUCCESS' , 'FAILED' , 'REVERSED' , 'CANCELLED'
] );


export const transactionFlagEnum = pgEnum('transaction_flag', [
  'NORMAL',
  'SUSPICIOUS',
  'HIGH_VALUE',
  'MANUAL_REVIEW'
]);


// ... enums ...

export const ledgerSchema = pgTable( 'ledger' , {
    id : uuid('id').primaryKey().defaultRandom(),
    transaction_id: uuid('transaction_id').notNull(),
    client_id: uuid('client_id').notNull(),
    orchestrator_id: uuid('orchestrator_id').notNull(),
    gateway_id: uuid('gateway_id').notNull(),
    payer_upi_id: text('payer_upi_id').notNull(), // Usually text since UPI IDs are strings like "user@oksbi"
    payee_upi_id: text('payee_upi_id').notNull(), // Usually text
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Corrected type
    status: statusEnum('status').notNull().default('PENDING'),
    flag: transactionFlagEnum('flag').notNull().default('NORMAL'),
    created_at : timestamp( 'created_at' ).notNull().defaultNow(),
    upadted_at : timestamp( 'updated_at' ).notNull().defaultNow()
} );