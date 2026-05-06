-- AlterTable
ALTER TABLE "Event" ADD COLUMN "recurrenceType" TEXT,
ADD COLUMN "recurrenceDaysOfWeek" TEXT,
ADD COLUMN "recurrenceEndDate" TIMESTAMP(3),
ADD COLUMN "parentEventId" TEXT,
ADD COLUMN "isRecurrenceInstance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recurrenceInstanceDate" TIMESTAMP(3),
ADD COLUMN "recurrenceStatus" TEXT NOT NULL DEFAULT 'active';

CREATE INDEX "Event_parentEventId_recurrenceInstanceDate_idx" ON "Event"("parentEventId", "recurrenceInstanceDate");
