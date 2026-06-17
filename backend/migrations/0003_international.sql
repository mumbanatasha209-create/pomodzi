-- International fields for users, groups, contributions, and payouts.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS phone_country_code TEXT,
    ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'XLM',
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE savings_groups
    ADD COLUMN IF NOT EXISTS primary_country TEXT,
    ADD COLUMN IF NOT EXISTS settlement_asset TEXT NOT NULL DEFAULT 'XLM',
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- currency column serves as primary_currency for existing rows.
UPDATE savings_groups SET settlement_asset = 'XLM' WHERE settlement_asset IS NULL OR settlement_asset = '';

ALTER TABLE contributions
    ADD COLUMN IF NOT EXISTS original_currency TEXT,
    ADD COLUMN IF NOT EXISTS settlement_currency TEXT,
    ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(18, 8),
    ADD COLUMN IF NOT EXISTS payment_provider TEXT,
    ADD COLUMN IF NOT EXISTS payment_country TEXT;

ALTER TABLE payouts
    ADD COLUMN IF NOT EXISTS payout_country TEXT,
    ADD COLUMN IF NOT EXISTS payout_provider TEXT,
    ADD COLUMN IF NOT EXISTS original_currency TEXT,
    ADD COLUMN IF NOT EXISTS settlement_currency TEXT;

CREATE INDEX IF NOT EXISTS idx_users_country ON users (country);
CREATE INDEX IF NOT EXISTS idx_groups_primary_country ON savings_groups (primary_country);

ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'treasury_deposit';
ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'cross_border_contribution';
ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'settlement_transfer';
