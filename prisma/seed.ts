import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "@/lib/server/seed-db";

const db = new PrismaClient();
seedDatabase(db)
  .then(() => console.log("Seeded rooms, content and settings."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
