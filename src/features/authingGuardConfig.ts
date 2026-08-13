export interface AuthingGuardConfig {
  appId: string;
  host?: string;
}

export function buildAuthingGuardConfig(appId: string, host: string): AuthingGuardConfig {
  return host ? { appId, host } : { appId };
}
