import type { LarkAccessToken, LarkConfig } from "./types.js";
import { getTenantAccessToken, isSuccess, getErrorMessage } from "./api.js";

// Token refresh buffer: refresh 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// In-memory token cache per app
const tokenCache = new Map<string, LarkAccessToken>();

/**
 * Get a valid access token for the given config.
 * Automatically refreshes if expired or about to expire.
 */
export async function getAccessToken(config: LarkConfig): Promise<string> {
  const cacheKey = config.appId;
  const cached = tokenCache.get(cacheKey);

  // Check if cached token is still valid (with buffer)
  if (cached && cached.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    return cached.token;
  }

  // Fetch new token
  const response = await getTenantAccessToken(config.appId, config.appSecret);

  if (!isSuccess(response)) {
    throw new Error(`Failed to get access token: ${getErrorMessage(response)}`);
  }

  const newToken: LarkAccessToken = {
    token: response.tenant_access_token,
    expiresAt: Date.now() + response.expire * 1000,
  };

  tokenCache.set(cacheKey, newToken);
  return newToken.token;
}

/**
 * Invalidate cached token for the given config.
 * Call this when receiving a 401 error to force refresh.
 */
export function invalidateToken(config: LarkConfig): void {
  tokenCache.delete(config.appId);
}

/**
 * Check if we have a valid cached token.
 */
export function hasValidToken(config: LarkConfig): boolean {
  const cached = tokenCache.get(config.appId);
  return cached !== undefined && cached.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Get token expiry time (for status display).
 */
export function getTokenExpiresAt(config: LarkConfig): number | null {
  const cached = tokenCache.get(config.appId);
  return cached?.expiresAt ?? null;
}

/**
 * Validate credentials by attempting to get a token.
 * Returns true if credentials are valid.
 */
export async function validateCredentials(config: LarkConfig): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await getTenantAccessToken(config.appId, config.appSecret);

    if (isSuccess(response)) {
      // Cache the token since we got it
      const newToken: LarkAccessToken = {
        token: response.tenant_access_token,
        expiresAt: Date.now() + response.expire * 1000,
      };
      tokenCache.set(config.appId, newToken);
      return { valid: true };
    }

    return { valid: false, error: getErrorMessage(response) };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
