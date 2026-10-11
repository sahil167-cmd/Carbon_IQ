-- CreateTable
CREATE TABLE "activity_type_mappings" (
    "id" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "emissionCategory" TEXT NOT NULL,
    "subCategoryFieldName" TEXT,
    "fallbackSubCategory" TEXT NOT NULL,
    "strategyKey" TEXT NOT NULL,
    "sourceCitation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_type_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_type_mappings_categoryCode_key" ON "activity_type_mappings"("categoryCode");
