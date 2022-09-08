-- CreateTable
CREATE TABLE "Module" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "namespace" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "location" TEXT,
    "definition" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "published_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "root" TEXT,
    "submodules" TEXT
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "namespace" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "protocols" TEXT NOT NULL,
    "platforms" TEXT NOT NULL,
    "gpgPublicKeys" TEXT NOT NULL,
    "published_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
