import { describe, test, expect, beforeEach, vi } from 'vitest';

import { connectWebLogin, persistConnectSession } from '../../src/connectSession';

function mockFetchResponse(status: number, body: unknown): void {
  globalThis.fetch = vi.fn(() => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => body,
  })) as unknown as typeof fetch;
}

describe('connectSession (login web Connect)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  test('renvoie les tokens en cas de succès', async () => {
    mockFetchResponse(200, { access_token: 'AT', refresh_token: 'RT' });
    const res = await connectWebLogin('a@b.com', 'pw');
    expect(res.accessToken).toBe('AT');
    expect(res.refreshToken).toBe('RT');
  });

  test('remonte le message d’erreur du serveur (401)', async () => {
    mockFetchResponse(401, { message: 'Bad credentials' });
    const res = await connectWebLogin('a@b.com', 'pw');
    expect(res.accessToken).toBeUndefined();
    expect(res.error).toBe('Bad credentials');
  });

  test('signale le captcha (429)', async () => {
    mockFetchResponse(429, { code: 'CAPTCHA_REQUIRED' });
    const res = await connectWebLogin('a@b.com', 'pw');
    expect(res.captchaRequired).toBe(true);
  });

  test('refuse des identifiants vides', async () => {
    const res = await connectWebLogin('', '');
    expect(res.error).toBe('missing-credentials');
  });

  test('persistConnectSession écrit sessionStorage (+ localStorage refresh)', () => {
    persistConnectSession('AT', 'RT');
    expect(sessionStorage.getItem('jemaos_access_token')).toBe('AT');
    expect(sessionStorage.getItem('jemaos_refresh_token')).toBe('RT');
    expect(localStorage.getItem('jemaos_refresh_token')).toBe('RT');
  });
});
