-- AlterTable
ALTER TABLE "vehicle_types" ADD COLUMN     "externalHeight" DECIMAL(10,2),
ADD COLUMN     "externalLength" DECIMAL(10,2),
ADD COLUMN     "externalWidth" DECIMAL(10,2),
ADD COLUMN     "make" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sourceName" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "variant" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
