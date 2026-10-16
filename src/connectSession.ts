// Session web « Connect » — SOURCE D'AUTH INDÉPENDANTE DE L'INJECTION OS.
//
// Le login web (email + mot de passe Jema) crée une session dans
// `jema.user_sessions` côté connect-api (voir createPortalSession), donc
// EXACTEMENT le token attendu par le SubscriptionGuard pour /os/subscription et
// /os/entitlement. Même si le cookie/token de l'OS n'est jamais posé (profil
// sans jeton, refresh révoqué…), l'utilisateur peut se connecter ici et le
// guard fonctionne — sans dépendre de JemaOS.
//
// Le mot de passe part en HTTPS vers connect-api (comme n'importe quel login) ;
// il n'est ni stocké ni loggé côté client.

const API_BASE = 'https://connect-api.jematech.fr';
const CONNECT_LOGIN_URL = `${API_BASE}/v1/connect/login`;

export interface ConnectLoginResult {
  accessToken?: string;
  refreshToken?: string | null;
  captchaRequired?: boolean;
  error?: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

export async function connectWebLogin(
  email: string,
  password: string
): Promise<ConnectLoginResult> {
  const trimmed = email.trim();
  if (trimmed.length === 0 || password.length === 0) {
    return { error: 'missing-credentials' };
  }
  try {
    const res = await fetch(CONNECT_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, password }),
    });
    let parsed: unknown = null;
    try {
      parsed = await res.json();
    } catch {
      /* corps non JSON */
    }
    const data = asRecord(parsed);
    if (!res.ok) {
      const code = typeof data.code === 'string' ? data.code : '';
      if (res.status === 429 || code === 'CAPTCHA_REQUIRED' || code === 'CAPTCHA_INVALID') {
        return { captchaRequired: true, error: code.length > 0 ? code : 'captcha' };
      }
      const message =
        typeof data.message === 'string' ? data.message : `HTTP ${String(res.status)}`;
      return { error: message };
    }
    const accessToken = data.access_token ?? data.accessToken;
    const refreshToken = data.refresh_token ?? data.refreshToken;
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      return { error: 'no-token' };
    }
    return {
      accessToken,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : null,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'network' };
  }
}

// Persiste la session dans les MÊMES stores que ceux lus par le guard
// (sessionStorage/localStorage `jemaos_access_token` + cookie partagé
// `.jemaos.com`), pour que getAccessToken()/getRefreshTokenFromStores() la
// retrouvent immédiatement au prochain check.
export function persistConnectSession(accessToken: string, refreshToken: string | null): void {
  try {
    sessionStorage.setItem('jemaos_access_token', accessToken);
  } catch {
    /* storage indisponible */
  }
  document.cookie = `jemaos_access_token=${accessToken}; Domain=.jemaos.com; Path=/; Secure; SameSite=Lax; Max-Age=86400`;
  if (refreshToken !== null && refreshToken.length > 0) {
    try {
      sessionStorage.setItem('jemaos_refresh_token', refreshToken);
      localStorage.setItem('jemaos_refresh_token', refreshToken);
    } catch {
      /* storage indisponible */
    }
    document.cookie = `jemaos_refresh_token=${refreshToken}; Domain=.jemaos.com; Path=/; Secure; SameSite=Lax; Max-Age=604800`;
  }
}
