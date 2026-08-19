import "server-only";

/**
 * CJ Dropshipping API client — verified against official API 2.0 docs:
 * https://developers.cjdropshipping.com/en/api/api2/
 *
 * Auth (confirmed):
 * - POST /api2.0/v1/authentication/getAccessToken  body: { apiKey }
 * - POST /api2.0/v1/authentication/refreshAccessToken body: { refreshToken }
 * - Subsequent requests: header CJ-Access-Token
 * - Base host: https://developers.cjdropshipping.com
 *
 * Success: HTTP 200 AND (code === 200 OR code field absent)
 * Access token stored server-side only — never returned to the browser.
 */

const DEFAULT_BASE = "https://developers.cjdropshipping.com";

export function isCjConfigured(): boolean {
  return Boolean(process.env.CJ_API_KEY);
}

export function getCjBaseUrl(): string {
  return (process.env.CJ_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

type TokenCache = {
  accessToken: string;
  refreshToken: string;
  accessExpiry: number; // epoch ms
  refreshExpiry: number;
};

let tokenCache: TokenCache | null = null;

type CjEnvelope<T> = {
  code?: number;
  result?: boolean;
  message?: string;
  data?: T;
  requestId?: string;
  success?: boolean;
};

function isSuccess(status: number, body: CjEnvelope<unknown>): boolean {
  if (status !== 200) return false;
  if (body.code === undefined || body.code === null) return true;
  return body.code === 200;
}

async function rawFetch<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    searchParams?: Record<string, string | number | undefined>;
  } = {}
): Promise<T> {
  const base = getCjBaseUrl();
  const url = new URL(`${base}/api2.0/v1${path}`);
  if (options.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["CJ-Access-Token"] = options.token;
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    // Avoid caching auth/business responses
    cache: "no-store",
  });

  let body: CjEnvelope<T>;
  try {
    body = (await res.json()) as CjEnvelope<T>;
  } catch {
    throw new Error(`CJ API non-JSON response (${res.status}) for ${path}`);
  }

  if (!isSuccess(res.status, body)) {
    const msg = body.message || `CJ API error code=${body.code ?? res.status}`;
    // Never include tokens in thrown messages
    throw new Error(msg);
  }

  return body.data as T;
}

async function fetchNewTokens(): Promise<TokenCache> {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    throw new Error("CJ_API_KEY is not set.");
  }

  const data = await rawFetch<{
    accessToken: string;
    accessTokenExpiryDate: string;
    refreshToken: string;
    refreshTokenExpiryDate: string;
  }>("/authentication/getAccessToken", {
    method: "POST",
    body: { apiKey },
  });

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessExpiry: Date.parse(data.accessTokenExpiryDate) || Date.now() + 14 * 864e5,
    refreshExpiry: Date.parse(data.refreshTokenExpiryDate) || Date.now() + 170 * 864e5,
  };
}

async function refreshTokens(refreshToken: string): Promise<TokenCache> {
  const data = await rawFetch<{
    accessToken: string;
    accessTokenExpiryDate: string;
    refreshToken: string;
    refreshTokenExpiryDate: string;
  }>("/authentication/refreshAccessToken", {
    method: "POST",
    body: { refreshToken },
  });

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessExpiry: Date.parse(data.accessTokenExpiryDate) || Date.now() + 14 * 864e5,
    refreshExpiry: Date.parse(data.refreshTokenExpiryDate) || Date.now() + 170 * 864e5,
  };
}

/**
 * Returns a valid access token, refreshing or re-authing as needed.
 * In-memory cache only (sufficient for single-instance / serverless warm starts).
 * For multi-instance production, persist tokens in a private store (e.g. encrypted env rotation).
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const skew = 60_000; // refresh 1 min early

  if (tokenCache && tokenCache.accessExpiry > now + skew) {
    return tokenCache.accessToken;
  }

  if (tokenCache && tokenCache.refreshExpiry > now + skew) {
    try {
      tokenCache = await refreshTokens(tokenCache.refreshToken);
      return tokenCache.accessToken;
    } catch {
      // fall through to full reauth
    }
  }

  // Prefer env-stored refresh token if present (optional ops convenience)
  const envRefresh = process.env.CJ_REFRESH_TOKEN;
  if (envRefresh && !tokenCache) {
    try {
      tokenCache = await refreshTokens(envRefresh);
      return tokenCache.accessToken;
    } catch {
      // fall through
    }
  }

  tokenCache = await fetchNewTokens();
  return tokenCache.accessToken;
}

/** Authenticated CJ API request */
export async function cjRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string | number | undefined>;
  } = {}
): Promise<T> {
  if (!isCjConfigured()) {
    throw new Error("CJ is not configured (CJ_API_KEY required).");
  }
  const token = await getAccessToken();
  try {
    return await rawFetch<T>(path, { ...options, token });
  } catch (err) {
    // One retry after forced reauth on auth failure
    const msg = err instanceof Error ? err.message : "";
    if (/auth|token|1600001|1600003/i.test(msg)) {
      tokenCache = null;
      const newToken = await getAccessToken();
      return rawFetch<T>(path, { ...options, token: newToken });
    }
    throw err;
  }
}

/** Lightweight connectivity probe — does not log secrets */
export async function verifyCjConnection(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isCjConfigured()) {
    return { ok: false, message: "CJ_API_KEY not set" };
  }
  try {
    await getAccessToken();
    return { ok: true, message: "Access token obtained" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
