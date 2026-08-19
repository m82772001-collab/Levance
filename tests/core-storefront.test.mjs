import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("home page degrades when catalog queries fail", async () => {
  const source = await read("app/(storefront)/page.tsx");
  assert.match(source, /listProducts\([^)]*\)\.catch\(\(\) => \(\{ products: \[\]/s);
  assert.match(source, /listCategories\(\)\.catch\(\(\) => \[\]\)/s);
});

test("home page is server rendered and header reflects auth state", async () => {
  const source = await read("app/(storefront)/page.tsx");
  const header = await read("components/shared/header.tsx");
  assert.doesNotMatch(source, /^['\"]use client['\"]/m);
  assert.match(header, /getCurrentUser/);
  assert.match(header, /Sign in/);
  assert.match(header, /user \?/);
});

test("login uses Supabase password auth and generic credential errors", async () => {
  const source = await read("lib/auth/actions.ts");
  assert.match(source, /signInWithPassword/);
  assert.match(source, /Invalid email or password\./);
  assert.match(source, /assertAuthRateLimit\(parsed\.data\.email\)/);
  assert.doesNotMatch(source, /return \{ error: error\.message \}/);
});

test("signup uses Supabase auth, generic duplicate errors, and cart claim", async () => {
  const source = await read("lib/auth/actions.ts");
  assert.match(source, /auth\.signUp/);
  assert.match(source, /GENERIC_SIGNUP_ERROR/);
  assert.match(source, /claimGuestCart\(data\.user\.id\)/);
});

test("OAuth callback exchanges the authorization code and handles invalid callbacks", async () => {
  const callback = await read("app/auth/callback/route.ts");
  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /oauth_failed/);
  assert.match(callback, /claimGuestCart\(data\.user\.id\)/);
});

test("Google button uses Supabase OAuth with a safe callback", async () => {
  const source = await read("components/auth/google-button.tsx");
  assert.match(source, /signInWithOAuth/);
  assert.match(source, /provider: \"google\"/);
  assert.match(source, /\/auth\/callback/);
  assert.match(source, /safeNext/);
});

test("guest cart claim is server-cookie based and merges quantities", async () => {
  const source = await read("lib/cart/service.ts");
  assert.match(source, /cookies\(\)/);
  assert.match(source, /guest_token/);
  assert.match(source, /onConflict: \"cart_id,variant_id\"/);
  assert.match(source, /delete\(\)\.eq\("id", guestCartId\)/);
});

test("failure mode: OAuth errors redirect to a retryable login state", async () => {
  const callback = await read("app/auth/callback/route.ts");
  assert.match(callback, /if \(oauthError \|\| !code\)/);
  assert.match(callback, /searchParams\.set\("error", "oauth_failed"\)/);
});

test("failure mode: rate limiter fails closed and limits five attempts per IP/email window", async () => {
  const source = await read("lib/security/auth-rate-limit.ts");
  const migration = await read("supabase/migrations/0013_auth_rate_limits.sql");
  assert.match(source, /return false/);
  assert.match(migration, /p_limit integer default 5/);
  assert.match(migration, /p_window_seconds integer default 900/);
  assert.match(migration, /attempts < p_limit/);
});
