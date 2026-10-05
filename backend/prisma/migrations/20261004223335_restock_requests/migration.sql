-- CreateTable
CREATE TABLE "restock_requests" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "dedupe_key" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restock_requests_dedupe_key_key" ON "restock_requests"("dedupe_key");
