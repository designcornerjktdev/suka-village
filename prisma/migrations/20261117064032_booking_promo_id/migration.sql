-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "promoId" TEXT;

-- CreateIndex
CREATE INDEX "Booking_promoId_idx" ON "Booking"("promoId");
