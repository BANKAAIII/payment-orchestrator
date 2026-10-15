#!/bin/bash
set -e

echo "Initializing databases (scripts/init-db.sh)..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Note: PostgreSQL does not support CREATE DATABASE IF NOT EXISTS directly.
    -- If running multiple times, these might need checks, or you rely on fresh volumes.
    CREATE DATABASE my_wallet;
    CREATE DATABASE my_ledger;
    CREATE DATABASE my_orchestrator;

    CREATE USER my_wallet_user WITH PASSWORD 'my_wallet_password';
    CREATE USER my_ledger_user WITH PASSWORD 'my_ledger_password';
    CREATE USER my_orchestrator_user WITH PASSWORD 'my_orchestrator_password';

    ALTER DATABASE my_wallet OWNER TO my_wallet_user;
    ALTER DATABASE my_ledger OWNER TO my_ledger_user;
    ALTER DATABASE my_orchestrator OWNER TO my_orchestrator_user;

    CREATE USER my_super_user WITH PASSWORD 'my_super_password';

    GRANT ALL PRIVILEGES ON DATABASE my_wallet TO my_super_user;
    GRANT ALL PRIVILEGES ON DATABASE my_ledger TO my_super_user;
    GRANT ALL PRIVILEGES ON DATABASE my_orchestrator TO my_super_user;
EOSQL

echo "Databases initialized successfully."