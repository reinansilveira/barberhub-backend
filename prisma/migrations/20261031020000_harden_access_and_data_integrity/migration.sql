-- Additive hardening migration. Existing data is retained and backfilled before
-- constraints are enabled so the migration is safe for the current database.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId", "role"),
    CONSTRAINT "user_roles_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "user_roles_role_userId_idx" ON "user_roles"("role", "userId");

INSERT INTO "user_roles" ("userId", "role")
SELECT "id", "role" FROM "users"
ON CONFLICT ("userId", "role") DO NOTHING;

INSERT INTO "user_roles" ("userId", "role")
SELECT "userId", 'CLIENT'::"UserRole" FROM "clients"
ON CONFLICT ("userId", "role") DO NOTHING;

INSERT INTO "user_roles" ("userId", "role")
SELECT "userId", 'PROFESSIONAL'::"UserRole" FROM "professionals"
ON CONFLICT ("userId", "role") DO NOTHING;

CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "password_reset_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "password_reset_tokens_userId_expiresAt_idx"
  ON "password_reset_tokens"("userId", "expiresAt");
CREATE INDEX "password_reset_tokens_expiresAt_idx"
  ON "password_reset_tokens"("expiresAt");

ALTER TABLE "appointments" ADD COLUMN "endsAt" TIMESTAMP(3);
UPDATE "appointments"
SET "endsAt" = "scheduledAt" + ("duration" * INTERVAL '1 minute')
WHERE "endsAt" IS NULL;
ALTER TABLE "appointments" ALTER COLUMN "endsAt" SET NOT NULL;

ALTER TABLE "notifications" ADD COLUMN "recipientUserId" TEXT;
ALTER TABLE "notifications" ADD COLUMN "idempotencyKey" TEXT;

WITH matches AS (
  SELECT n."id" AS notification_id, u."id" AS user_id
  FROM "notifications" n
  JOIN "users" u ON
    (u."email" IS NOT NULL AND lower(u."email") = lower(n."recipient"))
    OR (
      u."phone" IS NOT NULL
      AND regexp_replace(u."phone", '[^0-9]', '', 'g') <> ''
      AND regexp_replace(n."recipient", '[^0-9]', '', 'g') <> ''
      AND regexp_replace(u."phone", '[^0-9]', '', 'g') =
          regexp_replace(n."recipient", '[^0-9]', '', 'g')
    )
),
unambiguous AS (
  SELECT notification_id, min(user_id) AS user_id
  FROM matches
  GROUP BY notification_id
  HAVING count(DISTINCT user_id) = 1
)
UPDATE "notifications" n
SET "recipientUserId" = m.user_id
FROM unambiguous m
WHERE n."id" = m.notification_id;

UPDATE "notifications"
SET "readAt" = COALESCE("readAt", "updatedAt")
WHERE "status" = 'READ'::"NotificationStatus" AND "readAt" IS NULL;

UPDATE "notifications"
SET "status" = CASE
  WHEN "deliveredAt" IS NOT NULL THEN 'DELIVERED'::"NotificationStatus"
  WHEN "sentAt" IS NOT NULL THEN 'SENT'::"NotificationStatus"
  WHEN "errorMessage" IS NOT NULL THEN 'FAILED'::"NotificationStatus"
  ELSE 'PENDING'::"NotificationStatus"
END
WHERE "status" = 'READ'::"NotificationStatus";

CREATE TABLE "notification_read_receipts" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_read_receipts_pkey" PRIMARY KEY ("notificationId", "userId"),
    CONSTRAINT "notification_read_receipts_notificationId_fkey"
      FOREIGN KEY ("notificationId") REFERENCES "notifications"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notification_read_receipts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "notification_read_receipts" ("notificationId", "userId", "readAt")
SELECT "id", "recipientUserId", "readAt"
FROM "notifications"
WHERE "recipientUserId" IS NOT NULL AND "readAt" IS NOT NULL
ON CONFLICT ("notificationId", "userId") DO NOTHING;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notifications_idempotencyKey_key"
  ON "notifications"("idempotencyKey");
CREATE INDEX "notifications_recipientUserId_createdAt_idx"
  ON "notifications"("recipientUserId", "createdAt" DESC);
CREATE INDEX "notification_read_receipts_userId_readAt_idx"
  ON "notification_read_receipts"("userId", "readAt");

CREATE UNIQUE INDEX "users_email_lower_key"
  ON "users" (lower("email")) WHERE "email" IS NOT NULL;

CREATE INDEX "appointments_clientId_scheduledAt_idx"
  ON "appointments"("clientId", "scheduledAt");
CREATE INDEX "time_slots_professionalId_available_startsAt_idx"
  ON "time_slots"("professionalId", "available", "startsAt");

ALTER TABLE "services"
  ADD CONSTRAINT "services_duration_positive" CHECK ("duration" > 0),
  ADD CONSTRAINT "services_price_nonnegative" CHECK ("price" >= 0);

ALTER TABLE "professional_services"
  ADD CONSTRAINT "professional_services_duration_positive"
    CHECK ("customDuration" IS NULL OR "customDuration" > 0),
  ADD CONSTRAINT "professional_services_price_nonnegative"
    CHECK ("customPrice" IS NULL OR "customPrice" >= 0);

ALTER TABLE "professionals"
  ADD CONSTRAINT "professionals_commission_range" CHECK ("commission" >= 0 AND "commission" <= 100),
  ADD CONSTRAINT "professionals_rating_range" CHECK ("rating" IS NULL OR ("rating" >= 0 AND "rating" <= 5)),
  ADD CONSTRAINT "professionals_totalReviews_nonnegative" CHECK ("totalReviews" >= 0);

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_duration_positive" CHECK ("duration" > 0),
  ADD CONSTRAINT "appointments_price_nonnegative" CHECK ("price" >= 0),
  ADD CONSTRAINT "appointments_end_after_start" CHECK ("endsAt" > "scheduledAt"),
  ADD CONSTRAINT "appointments_no_active_overlap"
    EXCLUDE USING gist (
      "professionalId" WITH =,
      tsrange("scheduledAt", "endsAt", '[)') WITH &&
    ) WHERE ("status" IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS'));

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_nonnegative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "payments_discount_nonnegative" CHECK ("discount" >= 0),
  ADD CONSTRAINT "payments_finalAmount_nonnegative" CHECK ("finalAmount" >= 0),
  ADD CONSTRAINT "payments_total_consistent" CHECK ("finalAmount" = "amount" - "discount");

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);

ALTER TABLE "time_slots"
  ADD CONSTRAINT "time_slots_availability_consistent"
    CHECK (("available" AND "appointmentId" IS NULL) OR (NOT "available" AND "appointmentId" IS NOT NULL));

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_attempts_nonnegative" CHECK ("attempts" >= 0),
  ADD CONSTRAINT "notifications_maxAttempts_nonnegative" CHECK ("maxAttempts" >= 0);

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_date_or_weekday"
    CHECK (("date" IS NULL) <> ("dayOfWeek" IS NULL)),
  ADD CONSTRAINT "schedules_weekday_range"
    CHECK ("dayOfWeek" IS NULL OR "dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "schedules_times_valid"
    CHECK (
      "startTime" ~ '^[0-2][0-9]:[0-5][0-9]$'
      AND "endTime" ~ '^[0-2][0-9]:[0-5][0-9]$'
      AND "startTime" < "endTime"
      AND (
        ("breakStart" IS NULL AND "breakEnd" IS NULL)
        OR (
          "breakStart" ~ '^[0-2][0-9]:[0-5][0-9]$'
          AND "breakEnd" ~ '^[0-2][0-9]:[0-5][0-9]$'
          AND "breakStart" < "breakEnd"
          AND "breakStart" > "startTime"
          AND "breakEnd" < "endTime"
        )
      )
    );
