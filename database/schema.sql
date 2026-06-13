-- =============================================================================
-- Pamodzi Finance — Reference Database Schema
-- =============================================================================
-- This file mirrors backend/migrations/0001_init.sql with added documentation.
-- Apply manually with:
--     psql -U postgres -d pamodzi -f database/schema.sql
-- The backend also applies the migration automatically on startup via SQLx.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

-- Access level of an account across the platform.
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('platform_admin', 'group_admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- How often a savings group collects contributions.
DO $$ BEGIN
    CREATE TYPE contribution_frequency AS ENUM ('weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Lifecycle of a savings group.
DO $$ BEGIN
    CREATE TYPE group_status AS ENUM ('active', 'completed', 'paused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Whether a member has paid their contribution for a cycle.
DO $$ BEGIN
    CREATE TYPE contribution_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Lifecycle of a rotating payout.
DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Category of a wallet/ledger transaction.
DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('wallet_funding', 'contribution', 'payout', 'transfer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Settlement state of a transaction.
DO $$ BEGIN
    CREATE TYPE tx_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Lifecycle of an email invitation to a group.
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Whether a membership is still active in a group.
DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'removed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- -----------------------------------------------------------------------------
-- users — platform accounts. Each user owns a custodial Stellar testnet keypair.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           TEXT        NOT NULL,
    email               TEXT        NOT NULL UNIQUE,          -- login identity
    phone               TEXT,                                  -- optional contact
    password_hash       TEXT        NOT NULL,                  -- bcrypt hash
    role                user_role   NOT NULL DEFAULT 'member',
    stellar_public_key  TEXT,                                  -- G... address
    stellar_secret_key  TEXT,                                  -- S... seed (custodial)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- -----------------------------------------------------------------------------
-- savings_groups — a chama / stokvel. The admin manages members and rotation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_groups (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT                   NOT NULL,
    description           TEXT,
    admin_id              UUID                   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contribution_amount   NUMERIC(20, 7)         NOT NULL DEFAULT 0,   -- 7dp = Stellar precision
    currency              TEXT                   NOT NULL DEFAULT 'XLM',
    frequency             contribution_frequency NOT NULL DEFAULT 'monthly',
    current_cycle         INTEGER                NOT NULL DEFAULT 1,   -- active rotation cycle
    status                group_status           NOT NULL DEFAULT 'active',
    invite_code           TEXT                   NOT NULL UNIQUE,      -- share to join
    created_at            TIMESTAMPTZ            NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ            NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_groups_admin ON savings_groups (admin_id);

-- -----------------------------------------------------------------------------
-- group_members — membership + rotation order within a group.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID              NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    user_id         UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rotation_order  INTEGER           NOT NULL DEFAULT 0,    -- position in payout queue
    status          membership_status NOT NULL DEFAULT 'active',
    has_received_payout BOOLEAN       NOT NULL DEFAULT false, -- paid out this round?
    joined_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)                                -- one membership per user/group
);
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_members_user  ON group_members (user_id);

-- -----------------------------------------------------------------------------
-- contributions — a member's payment into a specific cycle.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID                NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    user_id         UUID                NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    cycle           INTEGER             NOT NULL,
    amount          NUMERIC(20, 7)      NOT NULL,
    status          contribution_status NOT NULL DEFAULT 'pending',
    stellar_tx_hash TEXT,                                     -- on-chain reference
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id, cycle)                         -- one contribution per cycle
);
CREATE INDEX IF NOT EXISTS idx_contrib_group_cycle ON contributions (group_id, cycle);

-- -----------------------------------------------------------------------------
-- payouts — the rotating lump-sum paid to one member per cycle.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID          NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    cycle           INTEGER       NOT NULL,
    recipient_id    UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount          NUMERIC(20, 7) NOT NULL,
    status          payout_status NOT NULL DEFAULT 'pending',
    stellar_tx_hash TEXT,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (group_id, cycle)                                  -- one payout per cycle
);
CREATE INDEX IF NOT EXISTS idx_payouts_group ON payouts (group_id);

-- -----------------------------------------------------------------------------
-- transactions — ledger of all wallet movements (funding, contributions, etc.).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          REFERENCES users (id) ON DELETE SET NULL,
    group_id        UUID          REFERENCES savings_groups (id) ON DELETE SET NULL,
    tx_type         tx_type       NOT NULL,
    amount          NUMERIC(20, 7) NOT NULL DEFAULT 0,
    currency        TEXT          NOT NULL DEFAULT 'XLM',
    status          tx_status     NOT NULL DEFAULT 'pending',
    stellar_tx_hash TEXT,
    memo            TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_user  ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_tx_group ON transactions (group_id);

-- -----------------------------------------------------------------------------
-- invitations — pending email invites to join a group.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID              NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    email       TEXT              NOT NULL,
    invited_by  UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token       TEXT              NOT NULL UNIQUE,            -- single-use accept token
    status      invitation_status NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);

-- -----------------------------------------------------------------------------
-- notifications — in-app messages to users.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);

-- -----------------------------------------------------------------------------
-- audit_logs — immutable record of sensitive actions for platform oversight.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,                          -- e.g. 'group.created'
    entity_type TEXT        NOT NULL,                          -- e.g. 'savings_group'
    entity_id   TEXT,
    metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,      -- extra context
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
