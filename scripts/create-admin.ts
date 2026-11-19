/**
 * Creates an admin account:  npm run admin:create -- owner@sukavillage.com
 * Username, display name and password are asked for on the terminal; the
 * password is never passed as an argument, so it does not end up in the shell
 * history. Later accounts can be made in the admin under Pengguna.
 */
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { type AdminError, createAdmin, MIN_PASSWORD } from "@/lib/server/admins";

const MESSAGES: Record<AdminError, string> = {
  email: "Email tidak valid.",
  username: "Username 3–32 karakter: huruf kecil, angka, titik, garis bawah, tanda hubung.",
  displayName: "Nama tampilan wajib diisi.",
  password: `Kata sandi minimal ${MIN_PASSWORD} karakter.`,
  exists: "Email atau username sudah dipakai admin lain.",
  self: "Anda tidak bisa menghapus akun sendiri.",
  notFound: "Admin tidak ditemukan.",
  current: "Kata sandi saat ini salah.",
};

/* tsx runs scripts as CommonJS, which has no top-level await. */
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Pakai: npm run admin:create -- <email>");
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const username = await rl.question("Username: ");
  const displayName = await rl.question("Nama tampilan: ");
  const password = await rl.question(`Kata sandi (minimal ${MIN_PASSWORD} karakter): `);
  rl.close();

  const db = new PrismaClient();
  const result = await createAdmin(db, { email, username, displayName, password });
  await db.$disconnect();

  if (result.ok) console.log(`Admin ${result.admin.email} (${result.admin.username}) dibuat.`);
  else {
    console.error(MESSAGES[result.error]);
    process.exitCode = 1;
  }
}

void main();
