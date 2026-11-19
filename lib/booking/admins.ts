"use client";

import useSWR from "swr";
import { getJSON, refreshAll, send } from "./client";

/**
 * Admin accounts in the CMS (Pengguna): the list hook and its writes, against
 * /api/admin/users and /api/admin/me/password. Every write answers
 * { ok: true } or { ok: false, error } with the server's AdminError code, so
 * the screen can show the matching message.
 */

export type AdminAccount = { id: string; email: string; username: string | null; displayName: string; createdAt: string };
export type AdminProfileInput = { email: string; username: string; displayName: string };
export type AdminWrite = { ok: true } | { ok: false; error: string };

export function useAdmins(): AdminAccount[] | undefined {
  const { data } = useSWR("/api/admin/users", (u: string) => getJSON<{ admins: AdminAccount[] }>(u));
  return data?.admins;
}

async function write(url: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<AdminWrite> {
  try {
    const r = await send<{ ok?: boolean; error?: string }>(url, method, body);
    if (r.ok) {
      await refreshAll();
      /* Own name or username may have changed: the sidebar asks again. */
      window.dispatchEvent(new Event("sv-admin-session"));
      return { ok: true };
    }
    return { ok: false, error: r.data.error ?? "network" };
  } catch {
    return { ok: false, error: "network" };
  }
}

const enc = encodeURIComponent;
export const createAdminUser = (input: AdminProfileInput & { password: string }) => write("/api/admin/users", "POST", input);
export const updateAdminUser = (id: string, input: AdminProfileInput) => write(`/api/admin/users/${enc(id)}`, "PATCH", input);
export const deleteAdminUser = (id: string) => write(`/api/admin/users/${enc(id)}`, "DELETE");
export const resetAdminPassword = (id: string, password: string) => write(`/api/admin/users/${enc(id)}/password`, "PUT", { password });
export const changeMyPassword = (current: string, next: string) => write("/api/admin/me/password", "PUT", { current, next });
