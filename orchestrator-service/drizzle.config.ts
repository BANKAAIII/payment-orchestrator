import type { Config } from 'drizzle-kit';

import * as dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:'postgres://my_orchestrator_user:my_orchestrator_password@localhost:5432/my_orchestrator',
  },
} satisfies Config;