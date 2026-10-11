-- AlterTable
ALTER TABLE "vehicle_types" ALTER COLUMN "internalLength" DROP NOT NULL,
ALTER COLUMN "internalWidth" DROP NOT NULL,
ALTER COLUMN "internalHeight" DROP NOT NULL,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "verifiedBy" TEXT;
