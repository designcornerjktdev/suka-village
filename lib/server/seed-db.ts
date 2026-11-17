import type { Prisma, PrismaClient } from "@prisma/client";
import { DEMO_RATES, seedContent, seedRooms, seedSettings } from "@/lib/booking/seed";
import type { ContentSection } from "@/lib/booking/types";

/**
 * First import of the site's own data into an empty database: the three
 * rooms, every content section and the default settings. Run once, then the
 * owner edits everything in the admin; running it again only fills what is
 * missing and never overwrites an edit.
 *
 * Deliberately NOT imported: demo bookings, demo promo codes and demo prices
 * being for sale. Rates start from the prototype's example figures but with
 * `bookable: false`, because the real prices are still pending (REPLACE.md #5).
 */
export async function seedDatabase(db: PrismaClient) {
  const rooms = seedRooms();
  for (const [position, room] of rooms.entries()) {
    const { unit, ...rest } = room;
    await db.room.upsert({
      where: { unit },
      update: {},
      create: { unit, ...rest, features: rest.features, description: rest.description, photos: rest.photos, archived: false, position },
    });
    const rate = DEMO_RATES.find((r) => r.unit === unit);
    await db.rate.upsert({
      where: { unit },
      update: {},
      create: {
        unit,
        weekday: rate?.weekday ?? 0,
        weekend: rate?.weekend ?? 0,
        minNights: rate?.minNights ?? 1,
        bookable: false,
        seasons: [],
      },
    });
  }

  const content = seedContent();
  for (const section of Object.keys(content) as ContentSection[]) {
    for (const [position, item] of content[section].entries()) {
      const { id, ...data } = item;
      await db.contentItem.upsert({
        where: { section_id: { section, id } },
        update: {},
        create: { section, id, position, data: data as Prisma.InputJsonValue },
      });
    }
  }

  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, data: seedSettings() as unknown as Prisma.InputJsonValue },
  });
}
