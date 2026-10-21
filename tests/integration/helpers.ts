import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "MINIDSP_TEST_USER_A_EMAIL",
  "MINIDSP_TEST_USER_A_PASSWORD",
  "MINIDSP_TEST_USER_B_EMAIL",
  "MINIDSP_TEST_USER_B_PASSWORD",
] as const;

export function requireEnv(): Record<(typeof REQUIRED)[number], string> {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing integration env vars: ${missing.join(", ")}`);
  }
  return Object.fromEntries(
    REQUIRED.map((name) => [name, process.env[name] as string]),
  ) as Record<(typeof REQUIRED)[number], string>;
}

export function anonClient(): SupabaseClient {
  const env = requireEnv();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function signedInClient(
  user: "A" | "B",
): Promise<{ client: SupabaseClient; userId: string }> {
  const env = requireEnv();
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: env[`MINIDSP_TEST_USER_${user}_EMAIL`],
    password: env[`MINIDSP_TEST_USER_${user}_PASSWORD`],
  });
  if (error || !data.user) {
    throw new Error(`Test user ${user} could not sign in (${error?.code ?? "no user"})`);
  }
  return { client, userId: data.user.id };
}

export const RAW_SYNTHETIC_VALUES = [
  "alex@example.test",
  "07700 900123",
  "07700900123",
  "AB 12 34 56 C",
  "AB123456C",
  "4111 1111 1111 1111",
  "4111111111111111",
];

export const SYNTHETIC_CONTENT =
  "alex@example.test,07700 900123,AB 12 34 56 C,4111 1111 1111 1111\nalex@example.test\n";
