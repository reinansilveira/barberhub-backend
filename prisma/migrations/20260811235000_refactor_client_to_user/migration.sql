CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "users" ADD COLUMN "gender" "Gender";
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "passwordSetAt" TIMESTAMP(3);
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "clients" ADD COLUMN "userId" TEXT;

WITH email_matches AS (
  SELECT
    c.id AS client_id,
    u.id AS user_id,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY c.id) AS match_order
  FROM "clients" c
  INNER JOIN "users" u ON u.email = c.email
  WHERE c."userId" IS NULL
    AND c.email IS NOT NULL
)
UPDATE "clients" c
SET "userId" = matches.user_id
FROM email_matches matches
WHERE c.id = matches.client_id
  AND matches.match_order = 1;

WITH phone_matches AS (
  SELECT
    c.id AS client_id,
    u.id AS user_id,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY c.id) AS match_order
  FROM "clients" c
  INNER JOIN "users" u ON u.phone = c.phone
  WHERE c."userId" IS NULL
    AND c.phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "clients" assigned
      WHERE assigned."userId" = u.id
    )
)
UPDATE "clients" c
SET "userId" = matches.user_id
FROM phone_matches matches
WHERE c.id = matches.client_id
  AND matches.match_order = 1;

UPDATE "clients" c
SET "userId" = CASE
  WHEN EXISTS (SELECT 1 FROM "users" u WHERE u.id = c.id)
    THEN gen_random_uuid()::TEXT
  ELSE c.id
END
WHERE c."userId" IS NULL;

INSERT INTO "users" (
  "id",
  "email",
  "password",
  "name",
  "phone",
  "avatar",
  "gender",
  "role",
  "active",
  "emailVerified",
  "mustChangePassword",
  "passwordSetAt",
  "lastLoginAt",
  "createdAt",
  "updatedAt"
)
WITH clients_without_user AS (
  SELECT
    c.*,
    ROW_NUMBER() OVER (PARTITION BY c.email ORDER BY c.id) AS email_order,
    ROW_NUMBER() OVER (PARTITION BY c.phone ORDER BY c.id) AS phone_order
  FROM "clients" c
  WHERE NOT EXISTS (
    SELECT 1
    FROM "users" existing_user
    WHERE existing_user.id = c."userId"
  )
)
SELECT
  c."userId",
  CASE
    WHEN c.email IS NOT NULL
      AND c.email_order = 1
      AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.email = c.email)
      THEN c.email
    ELSE NULL
  END,
  c."password",
  c."name",
  CASE
    WHEN c.phone IS NOT NULL
      AND c.phone_order = 1
      AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u.phone = c.phone)
      THEN c.phone
    ELSE NULL
  END,
  c."avatar",
  c."gender",
  'CLIENT',
  c."active",
  CASE WHEN c."emailVerifiedAt" IS NULL THEN FALSE ELSE TRUE END,
  COALESCE(c."mustChangePassword", FALSE),
  c."passwordSetAt",
  NULL,
  c."createdAt",
  c."updatedAt"
FROM clients_without_user c;

ALTER TABLE "clients" ALTER COLUMN "userId" SET NOT NULL;
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clients" DROP COLUMN "name";
ALTER TABLE "clients" DROP COLUMN "email";
ALTER TABLE "clients" DROP COLUMN "phone";
ALTER TABLE "clients" DROP COLUMN "password";
ALTER TABLE "clients" DROP COLUMN "passwordSetAt";
ALTER TABLE "clients" DROP COLUMN "mustChangePassword";
ALTER TABLE "clients" DROP COLUMN "cpf";
ALTER TABLE "clients" DROP COLUMN "birthDate";
ALTER TABLE "clients" DROP COLUMN "gender";
ALTER TABLE "clients" DROP COLUMN "avatar";
ALTER TABLE "clients" DROP COLUMN "address";
ALTER TABLE "clients" DROP COLUMN "city";
ALTER TABLE "clients" DROP COLUMN "state";
ALTER TABLE "clients" DROP COLUMN "zipCode";
