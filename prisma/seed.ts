import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "@/lib/server/seed-db";
import { seedFirstAdmin } from "@/lib/server/seed-admin";

const db = new PrismaClient();

async function main() {
  await seedDatabase(db);
  console.log("Seeded rooms, content and settings.");
  const admin = await seedFirstAdmin(db, process.env);
  if (!admin.created) {
    console.log("Admin accounts already exist: none added.");
    return;
  }
  console.log(`First admin: ${admin.username} / ${admin.email}`);
  if (admin.generatedPassword) {
    console.log(`Password (shown once, write it down): ${admin.generatedPassword}`);
    console.log("Change it or delete this account later in the admin, under Pengguna.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
