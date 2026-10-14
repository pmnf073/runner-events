-- Money columns: double precision -> numeric(10,2). Existing values are rounded to cents.
-- AlterTable
ALTER TABLE "AccountEntry" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "AnnualFeeConfig" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "earlybirdDiscount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "discount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "paidAmount" SET DATA TYPE DECIMAL(10,2);

