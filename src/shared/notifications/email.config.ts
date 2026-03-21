import path from 'path';

export type EmailTransportKind = 'file' | 'console' | 'smtp';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function resolveTransport(value: string | undefined): EmailTransportKind {
  const normalized = String(value || 'file').trim().toLowerCase();

  if (normalized === 'file' || normalized === 'console' || normalized === 'smtp') {
    return normalized;
  }

  throw new Error(
    `Invalid EMAIL_TRANSPORT "${value}". Supported values are "file", "console", and "smtp".`,
  );
}

function resolveOutputDir(value: string | undefined): string {
  const configured = value?.trim();
  if (!configured) {
    return path.resolve(process.cwd(), 'tmp', 'emails');
  }

  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function buildUrl(baseUrl: string, loginPath: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = loginPath.startsWith('/') ? loginPath.slice(1) : loginPath;
  return new URL(normalizedPath, normalizedBaseUrl).toString();
}

function requireConfig(value: string | undefined, name: string): string {
  const resolved = value?.trim();

  if (!resolved) {
    throw new Error(`Missing required email configuration: ${name}`);
  }

  return resolved;
}

function resolvePort(value: string | undefined, name: string): number {
  const resolved = requireConfig(value, name);
  const port = Number(resolved);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid ${name} "${value}". It must be a positive integer.`);
  }

  return port;
}

export interface EmailConfig {
  enabled: boolean;
  transport: EmailTransportKind;
  fromEmail: string;
  fromName: string;
  outputDir: string;
  frontendBaseUrl: string;
  loginPath: string;
  localBaseUrl: string;
  internetBaseUrl: string;
  localUrl: string;
  internetUrl: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
}

export function getEmailConfig(): EmailConfig {
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  const loginPath = process.env.EMAIL_LOGIN_PATH || '/auth/login';
  const enabled = parseBoolean(process.env.EMAIL_ENABLED, true);
  const transport = resolveTransport(process.env.EMAIL_TRANSPORT);
  const localBaseUrl = process.env.EMAIL_LOCAL_BASE_URL || frontendBaseUrl;
  const internetBaseUrl = process.env.EMAIL_INTERNET_BASE_URL || frontendBaseUrl;

  const config: EmailConfig = {
    enabled,
    transport,
    fromEmail: process.env.EMAIL_FROM || 'noreply@sqm.local',
    fromName: process.env.EMAIL_FROM_NAME || 'SQM Notifications',
    outputDir: resolveOutputDir(process.env.EMAIL_OUTPUT_DIR),
    frontendBaseUrl,
    loginPath,
    localBaseUrl,
    internetBaseUrl,
    localUrl: buildUrl(localBaseUrl, loginPath),
    internetUrl: buildUrl(internetBaseUrl, loginPath),
  };

  if (enabled && transport === 'smtp') {
    config.smtpHost = requireConfig(process.env.SMTP_HOST, 'SMTP_HOST');
    config.smtpPort = resolvePort(process.env.SMTP_PORT, 'SMTP_PORT');
    config.smtpSecure = parseBoolean(process.env.SMTP_SECURE, false);
    config.smtpUser = requireConfig(process.env.SMTP_USER, 'SMTP_USER');
    config.smtpPass = requireConfig(process.env.SMTP_PASS, 'SMTP_PASS');
    config.fromEmail = requireConfig(process.env.EMAIL_FROM, 'EMAIL_FROM');
  }

  return config;
}
