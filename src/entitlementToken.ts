// Jeton d'entitlement SIGNÉ (JWT RS256) — vérification HORS-LIGNE.
//
// Principe (audit 2026-10) : la PWA ne « décide » plus de l'accès. Le serveur
// (connect-api) émet un JWT signé contenant le verdict d'entitlement
// (plan_code, apps_allowed, cloud_backup_allowed, storage, features) ; l'app le
// vérifie localement avec la SEULE clé publique (JWKS) — aucun secret dans le
// client — et le met en cache jusqu'à expiration. Résultat : accès infalsifiable,
// disponible hors-ligne, et indépendant de l'injection du cookie OS (qui peut
// échouer : profil sans jeton, refresh révoqué, etc.).
//
// La clé publique n'est PAS un secret : elle est récupérée dynamiquement sur
// `/v1/connect/os/entitlement-jwks` et mise en cache, ce qui permet de faire
// tourner la clé de signature côté serveur sans redéployer les apps.

const API_BASE = 'https://connect-api.jematech.fr';
const ENTITLEMENT_URL = `${API_BASE}/v1/connect/os/entitlement`;
const JWKS_URL = `${API_BASE}/v1/connect/os/entitlement-jwks`;

const TOKEN_KEY = 'jemaos_entitlement_jwt';
const JWKS_KEY = 'jemaos_entitlement_jwks';
const JWKS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 h

export interface EntitlementClaims {
  sub: string;
  client_id?: string | null;
  plan_code?: string | null;
  user_type?: string | null;
  hardware_type?: string | null;
  apps_allowed: boolean;
  cloud_backup_allowed: boolean;
  storage_limit_gb?: number | null;
  features?: Record<string, unknown>;
  iat: number;
  exp: number;
}

function b64urlToBytes(input: string): ArrayBuffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function decodeSegment(segment: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(segment))) as unknown;
  } catch {
    return undefined;
  }
}

interface CachedJwks {
  keys: JsonWebKey[];
  at: number;
}

function readJwksCache(): CachedJwks | null {
  try {
    const raw = localStorage.getItem(JWKS_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const candidate = parsed as { keys?: unknown; at?: unknown };
    if (!Array.isArray(candidate.keys) || typeof candidate.at !== 'number') {
      return null;
    }
    return { keys: candidate.keys as JsonWebKey[], at: candidate.at };
  } catch {
    return null;
  }
}

async function fetchJwks(): Promise<JsonWebKey[] | null> {
  const cached = readJwksCache();
  const cachedKeys = cached === null ? null : cached.keys;
  if (cached !== null && Date.now() - cached.at < JWKS_CACHE_MS) {
    return cached.keys;
  }
  try {
    const res = await fetch(JWKS_URL, { method: 'GET' });
    if (!res.ok) {
      return cachedKeys;
    }
    const data = (await res.json()) as { keys?: unknown };
    if (!Array.isArray(data.keys) || data.keys.length === 0) {
      return cachedKeys;
    }
    const keys = data.keys as JsonWebKey[];
    try {
      localStorage.setItem(JWKS_KEY, JSON.stringify({ keys, at: Date.now() }));
    } catch {
      /* storage indisponible */
    }
    return keys;
  } catch {
    return cachedKeys;
  }
}

async function importVerifyKey(jwk: JsonWebKey): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
  } catch {
    return null;
  }
}

// Vérifie la signature RS256 + l'expiration ; renvoie les claims ou null.
export async function verifySignedEntitlement(jwt: string): Promise<EntitlementClaims | null> {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const headerSeg = parts[0];
  const payloadSeg = parts[1];
  const signatureSeg = parts[2];

  const header = decodeSegment(headerSeg);
  if (typeof header !== 'object' || header === null) {
    return null;
  }
  const alg = (header as { alg?: unknown }).alg;
  const kid = (header as { kid?: unknown }).kid;
  if (alg !== 'RS256') {
    return null;
  }

  const keys = await fetchJwks();
  if (keys === null || keys.length === 0) {
    return null;
  }
  const first = keys.length > 0 ? keys[0] : undefined;
  const jwk =
    typeof kid === 'string'
      ? (keys.find((k) => (k as { kid?: string }).kid === kid) ?? first)
      : first;
  if (jwk === undefined) {
    return null;
  }

  const key = await importVerifyKey(jwk);
  if (key === null) {
    return null;
  }

  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(signatureSeg),
      new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
    );
  } catch {
    return null;
  }
  if (!valid) {
    return null;
  }

  const payload = decodeSegment(payloadSeg);
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const claims = payload as EntitlementClaims;
  if (typeof claims.exp !== 'number') {
    return null;
  }
  if (claims.exp * 1000 <= Date.now()) {
    return null;
  }
  return claims;
}

// Récupère un NOUVEAU jeton signé auprès du serveur (nécessite un token
// d'auth connect), le vérifie, le met en cache. Renvoie les claims ou null.
export async function storeSignedEntitlementFromServer(
  accessToken: string
): Promise<EntitlementClaims | null> {
  try {
    const res = await fetch(ENTITLEMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { token?: unknown };
    const token = data.token;
    if (typeof token !== 'string' || token.length === 0) {
      return null;
    }
    const claims = await verifySignedEntitlement(token);
    if (claims === null) {
      return null;
    }
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage indisponible */
    }
    return claims;
  } catch {
    return null;
  }
}

// Jeton signé en cache, cryptographiquement vérifié et non expiré.
export async function getVerifiedSignedEntitlement(): Promise<EntitlementClaims | null> {
  let jwt: string | null = null;
  try {
    jwt = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
  if (jwt === null) {
    return null;
  }
  const claims = await verifySignedEntitlement(jwt);
  if (claims === null) {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage indisponible */
    }
    return null;
  }
  return claims;
}

export function clearSignedEntitlement(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage indisponible */
  }
}
