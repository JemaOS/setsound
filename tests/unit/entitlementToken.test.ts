import { webcrypto } from 'node:crypto';

import { describe, test, expect, beforeEach, vi } from 'vitest';

import {
  verifySignedEntitlement,
  getVerifiedSignedEntitlement,
  storeSignedEntitlementFromServer,
  clearSignedEntitlement,
} from '../../src/entitlementToken';

// jsdom n'expose pas crypto.subtle : on force le webcrypto de Node globalement
// (le module sous test utilise `crypto.subtle`).
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true,
});
const subtle = webcrypto.subtle;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) {
    s += String.fromCharCode(b);
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlStr(str: string): string {
  return b64url(new TextEncoder().encode(str));
}

async function generateKey(): Promise<CryptoKeyPair> {
  return subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  ) as Promise<CryptoKeyPair>;
}

async function makeJwt(
  key: CryptoKeyPair,
  payload: Record<string, unknown>,
  kid = 'test-kid'
): Promise<string> {
  const header = { alg: 'RS256', kid };
  const h = b64urlStr(JSON.stringify(header));
  const p = b64urlStr(JSON.stringify(payload));
  const sig = new Uint8Array(
    await subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, new TextEncoder().encode(`${h}.${p}`))
  );
  return `${h}.${p}.${b64url(sig)}`;
}

const proClaims = (): Record<string, unknown> => ({
  sub: 'user-1',
  client_id: 'client-1',
  plan_code: 'PRO_PLUS',
  apps_allowed: true,
  cloud_backup_allowed: true,
  storage_limit_gb: 50,
  features: { app_scope: 'all' },
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});

function mockFetch(handlers: { jwks: unknown; entitlement?: unknown }): void {
  globalThis.fetch = vi.fn((url: string) => {
    if (url.includes('entitlement-jwks')) {
      return { ok: true, json: () => handlers.jwks };
    }
    return { ok: true, json: () => handlers.entitlement ?? {} };
  }) as unknown as typeof fetch;
}

describe('entitlementToken (vérification hors-ligne du JWT signé)', () => {
  let key: CryptoKeyPair;
  let jwks: unknown;

  beforeEach(async () => {
    localStorage.clear();
    key = await generateKey();
    const pubJwk = await subtle.exportKey('jwk', key.publicKey);
    jwks = { keys: [{ ...pubJwk, kid: 'test-kid' }] };
    mockFetch({ jwks });
  });

  test('accepte un jeton correctement signé et non expiré', async () => {
    const jwt = await makeJwt(key, proClaims());
    const claims = await verifySignedEntitlement(jwt);
    expect(claims).not.toBeNull();
    expect(claims?.apps_allowed).toBe(true);
    expect(claims?.plan_code).toBe('PRO_PLUS');
  });

  test('rejette une signature falsifiée', async () => {
    const jwt = await makeJwt(key, proClaims());
    const parts = jwt.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}AAAA`;
    expect(await verifySignedEntitlement(tampered)).toBeNull();
  });

  test('rejette un jeton expiré', async () => {
    const jwt = await makeJwt(key, {
      ...proClaims(),
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(await verifySignedEntitlement(jwt)).toBeNull();
  });

  test('getVerifiedSignedEntitlement lit et vérifie le jeton en cache', async () => {
    const jwt = await makeJwt(key, proClaims());
    localStorage.setItem('jemaos_entitlement_jwt', jwt);
    const claims = await getVerifiedSignedEntitlement();
    expect(claims?.apps_allowed).toBe(true);

    clearSignedEntitlement();
    expect(await getVerifiedSignedEntitlement()).toBeNull();
  });

  test('storeSignedEntitlementFromServer mémorise un jeton valide', async () => {
    const jwt = await makeJwt(key, proClaims());
    mockFetch({ jwks, entitlement: { token: jwt } });

    const claims = await storeSignedEntitlementFromServer('access-token');
    expect(claims?.apps_allowed).toBe(true);
    expect(localStorage.getItem('jemaos_entitlement_jwt')).toBe(jwt);
  });
});
