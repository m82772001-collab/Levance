/**
 * Fail-fast helper for required server-side environment variables.
 * Prefer this over accessing process.env directly in integration code
 * so misconfiguration surfaces immediately with a clear error rather
 * than as a confusing downstream failure.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
