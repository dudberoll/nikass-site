-- CreateTable
CREATE TABLE "manager_contact_requests" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "dedupe_key" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_contact_requests_dedupe_key_key" ON "manager_contact_requests"("dedupe_key");
