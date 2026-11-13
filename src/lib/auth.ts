import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "ttk_session";
const secret = process.env.SESSION_SECRET || "development-only-change-this-secret";

function sign(value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function createSession(userId: number) {
  const value = `${userId}.${Date.now() + 1000 * 60 * 60 * 12}`;
  const token = `${value}.${sign(value)}`;
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 12
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expiry, signature] = parts;
  const value = `${id}.${expiry}`;
  const expected = sign(value);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b) || Number(expiry) < Date.now()) return null;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return null;
  return prisma.user.findFirst({
    where: { id: userId, active: true },
    select: { id: true, username: true, fullName: true, role: true }
  });
}
