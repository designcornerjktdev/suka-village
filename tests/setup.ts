import { db } from "@/lib/server/db";

/* Empties every table in the test database (suka_test, see vitest.config.ts).
   Call at the start of a test that needs a clean slate. */
export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (!tables.length) return;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}
