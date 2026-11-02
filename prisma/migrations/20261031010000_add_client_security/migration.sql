-- AlterTable
ALTER TABLE "users"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
