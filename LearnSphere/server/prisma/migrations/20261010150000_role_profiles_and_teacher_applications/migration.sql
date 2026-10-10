CREATE TABLE `StudentProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `learningGoals` TEXT NULL,
    `preferredLearningCategories` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StudentProfile`
    ADD CONSTRAINT `StudentProfile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InstructorProfile`
    ADD COLUMN `applicationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    ADD COLUMN `professionalBio` TEXT NULL,
    ADD COLUMN `expertise` TEXT NULL,
    ADD COLUMN `qualifications` TEXT NULL,
    ADD COLUMN `profileImageUrl` VARCHAR(191) NULL,
    ADD COLUMN `teachingInterests` TEXT NULL;

INSERT INTO `InstructorProfile` (
    `userId`,
    `applicationStatus`,
    `createdAt`,
    `updatedAt`
)
SELECT
    `User`.`id`,
    'APPROVED',
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
FROM `User`
LEFT JOIN `InstructorProfile`
    ON `InstructorProfile`.`userId` = `User`.`id`
WHERE `User`.`role` = 'INSTRUCTOR'
  AND `InstructorProfile`.`id` IS NULL;

INSERT INTO `StudentProfile` (`userId`, `createdAt`, `updatedAt`)
SELECT `id`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `User`
WHERE `role` = 'STUDENT';
