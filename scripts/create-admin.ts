/**
 * Creates an admin account:  npm run admin:create -- owner@sukavillage.com
 * The password is asked for on the terminal and never passed as an argument,
 * so it does not end up in the shell history.
 */
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { createAdmin, MIN_PASSWORD } from "@/lib/server/admins";

const email = process.argv[2];
if (!email) {
  console.error("Pakai: npm run admin:create -- <email>");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(`Kata sandi (minimal ${MIN_PASSWORD} karakter): `);
rl.close();

const db = new PrismaClient();
const result = await createAdmin(db, email, password);
await db.$disconnect();

const messages = { email: "Email tidak valid.", password: `Kata sandi minimal ${MIN_PASSWORD} karakter.`, exists: "Admin dengan email ini sudah ada." };
if (result.ok) console.log(`Admin ${result.email} dibuat.`);
else {
  console.error(messages[result.error]);
  process.exitCode = 1;
}
