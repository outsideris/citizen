-- CreateTable
CREATE TABLE `Module` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `namespace` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `owner` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `definition` VARCHAR(191) NULL,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `root` JSON NULL,
    `submodules` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Provider` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `namespace` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `protocols` JSON NOT NULL,
    `platforms` JSON NOT NULL,
    `gpgPublicKeys` JSON NOT NULL,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
