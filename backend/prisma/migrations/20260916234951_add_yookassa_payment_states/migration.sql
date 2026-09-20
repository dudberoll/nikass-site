/*
  Warnings:

  - A unique constraint covering the columns `[payment_id]` on the table `checkout_attempts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "checkout_payment_state" AS ENUM ('not_started', 'pending', 'succeeded', 'canceled');

-- CreateEnum
CREATE TYPE "checkout_fulfillment_state" AS ENUM ('not_started', 'queued', 'processing', 'confirmed', 'uncertain', 'skipped');

-- AlterTable
ALTER TABLE "checkout_attempts" ADD COLUMN     "fulfillment_state" "checkout_fulfillment_state" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "payment_state" "checkout_payment_state" NOT NULL DEFAULT 'not_started';

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempts_payment_id_key" ON "checkout_attempts"("payment_id");
