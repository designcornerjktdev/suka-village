-- CreateTable
CREATE TABLE `Charge` (
    `trxId` VARCHAR(64) NOT NULL,
    `bookingCode` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Charge_bookingCode_idx`(`bookingCode`),
    PRIMARY KEY (`trxId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Charge` ADD CONSTRAINT `Charge_bookingCode_fkey` FOREIGN KEY (`bookingCode`) REFERENCES `Booking`(`code`) ON DELETE CASCADE ON UPDATE CASCADE;
