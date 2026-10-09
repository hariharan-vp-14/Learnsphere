ALTER TABLE `User`
    ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `emailVerificationTokenHash` CHAR(64) NULL,
    ADD COLUMN `emailVerificationTokenExpiresAt` DATETIME(3) NULL,
    ADD UNIQUE INDEX `User_emailVerificationTokenHash_key` (`emailVerificationTokenHash`);
