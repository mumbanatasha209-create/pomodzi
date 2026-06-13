-- Pamodzi Finance — initial migration (mirrors database/schema.sql)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('platform_admin', 'group_admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE contribution_frequency AS ENUM ('weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE group_status AS ENUM ('active', 'completed', 'paused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE contribution_status AS ENUM ('pending', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('wallet_funding', 'contribution', 'payout', 'transfer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tx_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE membership_status AS ENUM ('active', 'removed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           TEXT        NOT NULL,
    email               TEXT        NOT NULL UNIQUE,
    phone               TEXT,
    password_hash       TEXT        NOT NULL,
    role                user_role   NOT NULL DEFAULT 'member',
    stellar_public_key  TEXT,
    stellar_secret_key  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS savings_groups (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT                   NOT NULL,
    description           TEXT,
    admin_id              UUID                   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    contribution_amount   NUMERIC(20, 7)         NOT NULL DEFAULT 0,
    currency              TEXT                   NOT NULL DEFAULT 'XLM',
    frequency             contribution_frequency NOT NULL DEFAULT 'monthly',
    current_cycle         INTEGER                NOT NULL DEFAULT 1,
    status                group_status           NOT NULL DEFAULT 'active',
    invite_code           TEXT                   NOT NULL UNIQUE,
    created_at            TIMESTAMPTZ            NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ            NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_groups_admin ON savings_groups (admin_id);

CREATE TABLE IF NOT EXISTS group_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID              NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    user_id         UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rotation_order  INTEGER           NOT NULL DEFAULT 0,
    status          membership_status NOT NULL DEFAULT 'active',
    has_received_payout BOOLEAN       NOT NULL DEFAULT false,
    joined_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_members_user  ON group_members (user_id);

CREATE TABLE IF NOT EXISTS contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID                NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    user_id         UUID                NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    cycle           INTEGER             NOT NULL,
    amount          NUMERIC(20, 7)      NOT NULL,
    status          contribution_status NOT NULL DEFAULT 'pending',
    stellar_tx_hash TEXT,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id, cycle)
);
CREATE INDEX IF NOT EXISTS idx_contrib_group_cycle ON contributions (group_id, cycle);

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
    UNIQUE (group_id, cycle)
);
CREATE INDEX IF NOT EXISTS idx_payouts_group ON payouts (group_id);

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

CREATE TABLE IF NOT EXISTS invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID              NOT NULL REFERENCES savings_groups (id) ON DELETE CASCADE,
    email       TEXT              NOT NULL,
    invited_by  UUID              NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token       TEXT              NOT NULL UNIQUE,
    status      invitation_status NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);

CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,
    entity_id   TEXT,
    metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
