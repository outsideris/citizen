-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "namespace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "location" TEXT,
    "definition" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "root" JSONB,
    "submodules" JSONB,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "namespace" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "protocols" JSONB NOT NULL,
    "platforms" JSONB NOT NULL,
    "gpgPublicKeys" JSONB NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);
