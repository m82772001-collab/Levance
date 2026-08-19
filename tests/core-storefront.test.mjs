import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("home page degrades when catalog queries fail", async () => {
  const source = await read("app/(storefront)/page.tsx");
  assert.match(source, /listProducts\([^)]*\)\.catch\(\(\) => \(\{ products: \[\]/s);
  assert.match(source, /listCategories\(\)\.catch\(\(\) => \[\]\)/s);
});

test("home page is server rendered and delegates auth state to the server header", async () => {
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
  assert.doesNotMatch(source, /error\.message.*return \{ error: error\.message \}/s);
});

test("signup uses Supabase auth and generic account-creation errors", async () => {
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

test("Google button uses Supabase OAuth with a safe application callback", async () => {
  const source = await read("components/auth/google-button.tsx");
  assert.match(source, /signInWithOAuth/);
  assert.match(source, /provider: \"google\"/);
  assert.match(source, /\/auth\/callback/);
  assert.match(source, /startsWith\("\/"\).*startsWith\("\/\/"\)/s);
});

test("guest cart claim is server-cookie based and merges quantities", async () => {
  const source = await read("lib/cart/service.ts");
  assert.match(source, /cookies\(\)/);
  assert.match(source, /guest_token/);
  assert.match(source, /onConflict: \"cart_id,variant_id\"/);
  assert.match(source, /delete\(\)\.eq\("id", guestCartId\)/);
});

test("failure-mode contract: OAuth errors redirect to a retryable login state", async () => {
  const callback = await read("app/auth/callback/route.ts");
  assert.match(callback, /if \(oauthError \|\| !code\)/);
  assert.match(callback, /searchParams\.set\("error", "oauth_failed"\)/);
});
