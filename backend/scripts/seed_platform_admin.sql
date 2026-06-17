-- Promote an existing user to platform_admin.
-- Edit the email below, then run:
--   psql -U postgres -d pamodzi -f backend/scripts/seed_platform_admin.sql

UPDATE users
SET role = 'platform_admin', updated_at = now()
WHERE email = lower(trim('REPLACE_WITH_ADMIN_EMAIL'));
