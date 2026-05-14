-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_appointmentId_key" ON "time_slots"("appointmentId");

-- CreateIndex
CREATE INDEX "time_slots_professionalId_startsAt_available_idx" ON "time_slots"("professionalId", "startsAt", "available");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_professionalId_startsAt_key" ON "time_slots"("professionalId", "startsAt");

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
