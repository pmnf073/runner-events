-- Data only: memberships created before the ledger kept an "Anuidade <year>" debit
-- get that debit now (this replaces the "Sincronizar conta corrente" button).
-- Exempt memberships owe nothing, so their debit is 0.
INSERT INTO "AccountEntry" ("id", "memberId", "type", "description", "amount", "date", "createdAt")
SELECT
    gen_random_uuid()::text,
    m."memberId",
    'debit',
    'Anuidade ' || m."year",
    CASE WHEN m."status" = 'exempt' THEN 0 ELSE GREATEST(0, m."amount" - COALESCE(m."discount", 0)) END,
    m."createdAt",
    CURRENT_TIMESTAMP
FROM "Membership" m
WHERE NOT EXISTS (
    SELECT 1 FROM "AccountEntry" e
    WHERE e."memberId" = m."memberId" AND e."type" = 'debit' AND e."description" = 'Anuidade ' || m."year"
);
