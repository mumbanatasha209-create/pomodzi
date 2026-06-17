-- Security hardening: treasury wallets, transaction sources, decimal precision.

DO $$ BEGIN
    CREATE TYPE transaction_source AS ENUM (
        'stellar_testnet',
        'internal_ledger',
        'mobile_money_demo',
        'bank_transfer_demo'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Group treasury wallets (secret stored encrypted at application layer).
ALTER TABLE savings_groups
    ADD COLUMN IF NOT EXISTS treasury_public_key TEXT,
    ADD COLUMN IF NOT EXISTS treasury_secret_key TEXT;

-- Rename legacy hash column to blockchain_hash.
ALTER TABLE contributions RENAME COLUMN stellar_tx_hash TO blockchain_hash;
ALTER TABLE payouts RENAME COLUMN stellar_tx_hash TO blockchain_hash;
ALTER TABLE transactions RENAME COLUMN stellar_tx_hash TO blockchain_hash;

ALTER TABLE contributions
    ADD COLUMN IF NOT EXISTS transaction_source transaction_source NOT NULL DEFAULT 'internal_ledger';
ALTER TABLE payouts
    ADD COLUMN IF NOT EXISTS transaction_source transaction_source NOT NULL DEFAULT 'internal_ledger';
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS transaction_source transaction_source NOT NULL DEFAULT 'internal_ledger';

-- Strip fake demo hashes from prior versions.
UPDATE contributions
SET blockchain_hash = NULL, transaction_source = 'internal_ledger'
WHERE blockchain_hash LIKE 'contrib-%';

UPDATE payouts
SET blockchain_hash = NULL, transaction_source = 'internal_ledger'
WHERE blockchain_hash LIKE 'payout-%';

UPDATE transactions
SET blockchain_hash = NULL, transaction_source = 'internal_ledger'
WHERE blockchain_hash LIKE 'contrib-%' OR blockchain_hash LIKE 'payout-%';

-- Exact decimal money columns (18 digits, 2 decimal places).
ALTER TABLE savings_groups ALTER COLUMN contribution_amount TYPE NUMERIC(18, 2);
ALTER TABLE contributions ALTER COLUMN amount TYPE NUMERIC(18, 2);
ALTER TABLE payouts ALTER COLUMN amount TYPE NUMERIC(18, 2);
ALTER TABLE transactions ALTER COLUMN amount TYPE NUMERIC(18, 2);
