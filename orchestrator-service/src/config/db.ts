import {Pool} from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Wallet Service connected to PostgreSQL.');
});

pool.on('error', (err:any) => {
  console.error('Unexpected error on idle wallet database client', err);
  process.exit(-1);
});