import { db } from "@/lib/server/db";

/* Empties every table in the test database (suka_test, see vitest.config.ts).
   Call at the start of a test that needs a clean slate. MariaDB/MySQL: foreign
   keys are switched off for the session while the tables are truncated. */
export async function resetDb() {
  const tables = await db.$queryRaw<{ name: string }[]>`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'`;
  if (!tables.length) return;
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of tables) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${t.name}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
}
