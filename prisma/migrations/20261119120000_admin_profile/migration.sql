-- AlterTable
ALTER TABLE `Admin` ADD COLUMN `username` VARCHAR(191) NULL,
    ADD COLUMN `displayName` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX `Admin_username_key` ON `Admin`(`username`);

-- Existing admins: display name from the email before @.
UPDATE `Admin` SET `displayName` = SUBSTRING_INDEX(`email`, '@', 1) WHERE `displayName` = '';
