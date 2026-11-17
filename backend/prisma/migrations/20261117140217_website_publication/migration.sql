-- CreateTable
CREATE TABLE "website_publications" (
    "id" TEXT NOT NULL,
    "desired_revision" TEXT NOT NULL,
    "desired_snapshot" JSONB NOT NULL,
    "published_revision" TEXT,
    "active_revision" TEXT,
    "active_snapshot" JSONB,
    "active_deployment_id" TEXT,
    "started_at" TIMESTAMP(3),
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_publications_pkey" PRIMARY KEY ("id")
);
