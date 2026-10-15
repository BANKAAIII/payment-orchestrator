import { pgTable, uuid, pgEnum, text, numeric, timestamp } from 'drizzle-orm/pg-core';
export const accountStatusEnum = pgEnum('account_status', [
    'ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED'
]);
export const walletSchema = pgTable('wallet', {
    id: uuid('id').primaryKey().defaultRandom(),
    client_id: uuid('client_id').notNull(),
    upi_id: text('upi_id').unique().notNull(),
    balance: numeric('balance', { precision: 12, scale: 2 }).default('0.00'),
    password: text('password').notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
    status: accountStatusEnum('status').notNull().default('ACTIVE')
});
