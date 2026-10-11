ALTER TABLE `InstructorProfile`
    ADD COLUMN `reviewerId` INTEGER NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectionReason` TEXT NULL;

CREATE TABLE `InstructorApplicationReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `instructorProfileId` INTEGER NOT NULL,
    `reviewerId` INTEGER NOT NULL,
    `applicationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL,
    `rejectionReason` TEXT NULL,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `InstructorApplicationReview_instructorProfileId_reviewedAt_idx`(`instructorProfileId`, `reviewedAt`),
    INDEX `InstructorApplicationReview_reviewerId_reviewedAt_idx`(`reviewerId`, `reviewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `InstructorProfile`
    ADD CONSTRAINT `InstructorProfile_reviewerId_fkey`
    FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InstructorApplicationReview`
    ADD CONSTRAINT `InstructorApplicationReview_instructorProfileId_fkey`
    FOREIGN KEY (`instructorProfileId`) REFERENCES `InstructorProfile`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `InstructorApplicationReview_reviewerId_fkey`
    FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `AdminCapacityLock` (
    `id` INTEGER NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `AdminCapacityLock` (`id`) VALUES (1);

INSERT INTO `InstructorApplicationReview` (
    `instructorProfileId`,
    `reviewerId`,
    `applicationStatus`,
    `reviewedAt`
)
SELECT
    `InstructorProfile`.`id`,
    `InstructorProfile`.`reviewerId`,
    `InstructorProfile`.`applicationStatus`,
    `InstructorProfile`.`reviewedAt`
FROM `InstructorProfile`
WHERE `InstructorProfile`.`reviewerId` IS NOT NULL
  AND `InstructorProfile`.`reviewedAt` IS NOT NULL
  AND `InstructorProfile`.`applicationStatus` IN ('APPROVED', 'REJECTED');

UPDATE `User`
INNER JOIN `InstructorProfile`
    ON `InstructorProfile`.`userId` = `User`.`id`
SET `User`.`role` = 'INSTRUCTOR'
WHERE `User`.`role` = 'STUDENT'
  AND `InstructorProfile`.`applicationStatus` = 'APPROVED';
