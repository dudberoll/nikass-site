-- AlterTable
ALTER TABLE "checkout_attempts" ADD COLUMN     "woo_order_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempts_woo_order_id_key" ON "checkout_attempts"("woo_order_id");

-- CreateIndex
CREATE INDEX "checkout_attempts_payment_state_updated_at_idx" ON "checkout_attempts"("payment_state", "updated_at");

