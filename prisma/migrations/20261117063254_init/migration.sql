-- CreateTable
CREATE TABLE "Booking" (
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "guests" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "notes" TEXT,
    "quote" JSONB NOT NULL,
    "internalNote" TEXT,
    "rejectReason" TEXT,
    "refundOwed" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "BookingUnit" (
    "bookingCode" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "BookingUnit_pkey" PRIMARY KEY ("bookingCode","unit")
);

-- CreateTable
CREATE TABLE "Night" (
    "id" SERIAL NOT NULL,
    "unit" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bookingCode" TEXT,
    "blockId" TEXT,

    CONSTRAINT "Night_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "bookingCode" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "gatewayId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("bookingCode")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" SERIAL NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "adminId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "hash" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "unit" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "photos" JSONB NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("unit")
);

-- CreateTable
CREATE TABLE "Rate" (
    "unit" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "weekend" INTEGER NOT NULL,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxGuests" INTEGER,
    "bookable" BOOLEAN NOT NULL DEFAULT false,
    "seasons" JSONB NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("unit")
);

-- CreateTable
CREATE TABLE "Promo" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "validFrom" DATE,
    "validTo" DATE,
    "units" JSONB NOT NULL,
    "quota" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("section","id")
);

-- CreateTable
CREATE TABLE "Media" (
    "src" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alt" JSONB NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("src")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateHit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateHit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_checkIn_idx" ON "Booking"("checkIn");

-- CreateIndex
CREATE INDEX "Night_bookingCode_idx" ON "Night"("bookingCode");

-- CreateIndex
CREATE INDEX "Night_blockId_idx" ON "Night"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "Night_unit_date_key" ON "Night"("unit", "date");

-- CreateIndex
CREATE INDEX "Notification_bookingCode_idx" ON "Notification"("bookingCode");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingCode_idx" ON "BookingEvent"("bookingCode");

-- CreateIndex
CREATE INDEX "AccessToken_bookingCode_idx" ON "AccessToken"("bookingCode");

-- CreateIndex
CREATE INDEX "Block_unit_idx" ON "Block"("unit");

-- CreateIndex
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- AddForeignKey
ALTER TABLE "BookingUnit" ADD CONSTRAINT "BookingUnit_bookingCode_fkey" FOREIGN KEY ("bookingCode") REFERENCES "Booking"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingUnit" ADD CONSTRAINT "BookingUnit_unit_fkey" FOREIGN KEY ("unit") REFERENCES "Room"("unit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Night" ADD CONSTRAINT "Night_bookingCode_fkey" FOREIGN KEY ("bookingCode") REFERENCES "Booking"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Night" ADD CONSTRAINT "Night_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingCode_fkey" FOREIGN KEY ("bookingCode") REFERENCES "Booking"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingCode_fkey" FOREIGN KEY ("bookingCode") REFERENCES "Booking"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingCode_fkey" FOREIGN KEY ("bookingCode") REFERENCES "Booking"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_bookingCode_fkey" FOREIGN KEY ("bookingCode") REFERENCES "Booking"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_unit_fkey" FOREIGN KEY ("unit") REFERENCES "Room"("unit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_unit_fkey" FOREIGN KEY ("unit") REFERENCES "Room"("unit") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
