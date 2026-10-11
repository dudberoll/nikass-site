-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "checkout_payment_state" ADD VALUE 'creating';
ALTER TYPE "checkout_payment_state" ADD VALUE 'uncertain';

-- AlterTable
ALTER TABLE "checkout_attempts" ADD COLUMN     "payment_create_started_at" TIMESTAMP(3);
