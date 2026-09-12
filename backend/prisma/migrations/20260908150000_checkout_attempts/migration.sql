-- CreateEnum
CREATE TYPE "checkout_attempt_state" AS ENUM ('quoted', 'submitting', 'confirmed', 'uncertain', 'rejected');

-- CreateTable
CREATE TABLE "checkout_attempts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "token_hash" TEXT NOT NULL,
    "cart_token" TEXT,
    "input" JSONB NOT NULL,
    "totals" JSONB NOT NULL,
    "state" "checkout_attempt_state" NOT NULL DEFAULT 'quoted',
    "order_number" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempts_token_hash_key" ON "checkout_attempts"("token_hash");

-- CreateIndex
CREATE INDEX "checkout_attempts_state_expires_at_idx" ON "checkout_attempts"("state", "expires_at");
