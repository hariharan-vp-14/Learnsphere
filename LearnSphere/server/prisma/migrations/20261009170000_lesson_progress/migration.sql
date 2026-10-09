CREATE TABLE `LessonProgress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `enrollmentId` INTEGER NOT NULL,
    `lessonId` INTEGER NOT NULL,
    `studentId` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LessonProgress_enrollmentId_lessonId_key`(`enrollmentId`, `lessonId`),
    INDEX `LessonProgress_studentId_idx`(`studentId`),
    INDEX `LessonProgress_lessonId_idx`(`lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `LessonProgress`
    ADD CONSTRAINT `LessonProgress_enrollmentId_fkey`
    FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollment`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `LessonProgress_lessonId_fkey`
    FOREIGN KEY (`lessonId`) REFERENCES `Lesson`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `LessonProgress_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
