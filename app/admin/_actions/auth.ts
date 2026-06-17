"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_session";

async function signToken(sub: string): Promise<string> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET not set");

  const header  = btoa(JSON.stringify({ alg: "HS256", typ: "admin" }));
  const payload = btoa(JSON.stringify({ sub, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  const data    = `${header}.${payload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sig    = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${data}.${sig}`;
}

export async function loginAction(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const username = (formData.get("username") as string || "").trim();
  const password = formData.get("password") as string || "";

  const expectedUser = process.env.ADMIN_USERNAME || "";
  const expectedPass = process.env.ADMIN_PASSWORD || "";

  if (!expectedUser || !expectedPass) {
    return { error: "Admin credentials not configured on this server." };
  }

  if (username !== expectedUser || password !== expectedPass) {
    return { error: "Invalid username or password." };
  }

  const token = await signToken(username);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  cookies().delete(COOKIE_NAME);
  redirect("/admin/login");
}
