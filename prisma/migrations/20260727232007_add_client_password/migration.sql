-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "passwordSetAt" TIMESTAMP(3);
