import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session-cookie";
import { hubUserFromHeaders } from "./hub-auth";

export { SESSION_COOKIE };
const MAX_AGE = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short. Set it in .env.local.");
  }
  return new TextEncoder().encode(secret);
}

export function passwordsMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const token = await new SignJWT({ family: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<boolean> {
  if (hubUserFromHeaders(await headers())) return true;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function requireSession() {
  if (!(await readSession())) {
    redirect("/login");
  }
}
