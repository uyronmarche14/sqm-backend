import type { CookieOptions } from 'express';
import { getRefreshTokenMaxAgeMs } from '../../shared/utils/jwt.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';

function resolveCookieSecure(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE?.trim();
  if (override === 'true') {
    return true;
  }
  if (override === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

function getCookieDomain(): string | undefined {
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return domain ? domain : undefined;
}

function buildBaseRefreshCookieOptions(): CookieOptions {
  const domain = getCookieDomain();

  return {
    httpOnly: true,
    secure: resolveCookieSecure(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    ...(domain ? { domain } : {}),
  };
}

export function getRefreshCookieOptions(): CookieOptions {
  return {
    ...buildBaseRefreshCookieOptions(),
    maxAge: getRefreshTokenMaxAgeMs(),
  };
}

export function getRefreshCookieClearOptions(): CookieOptions {
  return buildBaseRefreshCookieOptions();
}
