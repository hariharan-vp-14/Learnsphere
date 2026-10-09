CREATE TABLE `CourseView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courseId` INTEGER NOT NULL,
    `visitorId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CourseView_courseId_visitorId_key`(`courseId`, `visitorId`),
    INDEX `CourseView_courseId_createdAt_idx`(`courseId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CourseView`
    ADD CONSTRAINT `CourseView_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
