CREATE TABLE `AdminInvitation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdminInvitation_tokenHash_key`(`tokenHash`),
    INDEX `AdminInvitation_email_expiresAt_idx`(`email`, `expiresAt`),
    INDEX `AdminInvitation_usedAt_expiresAt_idx`(`usedAt`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AdminInvitation`
    ADD CONSTRAINT `AdminInvitation_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
