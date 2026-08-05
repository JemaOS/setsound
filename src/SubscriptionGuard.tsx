import React, { useState, useEffect } from 'react';

// SubscriptionGuard v2 (2026-08-03)
// ---------------------------------
// Fix "perte de licence après 24 h" : le token JWT (cookie
// jemaos_access_token) expire après 24 h et la version précédente
// affichait le mur "JemaOS Pro" sur simple échec du check, sans jamais
// tenter de rafraîchir le token. Cette version :
//   1. distingue "pas d'abonnement" (mur justifié) de "token expiré"
//      (401/403 -> tentative de refresh) et d'"erreur réseau" (pas de mur) ;
//   2. appelle POST /v1/connect/auth/refresh sur un 401, puis retente ;
//   3. permet l'usage HORS-LIGNE des PWA après une licence vérifiée :
//      grace de OFFLINE_GRACE_DAYS jours sans internet, renouvelée à
//      chaque check en ligne (et révoquée si le serveur confirme "pas
//      d'abonnement"). La grace vit dans le stockage du PWA, donc par
//      compte utilisateur de l'appareil ;
//   4. n'affiche le mur que sur "pas d'abonnement" confirmé ou après
//      refresh impossible, avec un bouton "Se reconnecter" vers le SSO ;
//   5. reconnexion AUTOMATIQUE sur L'URL PROPRE à chaque app : token
//      rejeté + refresh impossible -> redirection vers /auth SUR LE
//      DOMAINE DE L'APP (page rendue par ce guard, au-dessus du routeur),
//      qui retente un refresh silencieux puis ramène vers return_to.
//      Jamais de rebond visible vers Nephtys. Le mur "Se reconnecter"
//      n'apparaît que si l'aller-retour a déjà échoué une fois (cas de
//      bug) — jamais de boucle infinie.
// Fichier partagé : le garder identique dans toutes les apps PWA.

const API_BASE = 'https://test-connect-api.jematech.fr';
const API_KEY = 'e58492a3-b452-4197-9f4a-deb7915b9446';

// Portail SSO central (authentification JemaOS). Sur l'hôte SSO lui-même,
// /auth est la page de connexion du routeur de l'app.
const SSO_URL = 'https://nephtys.jemaos.com/auth';
const IS_SSO_HOST = window.location.hostname === 'nephtys.jemaos.com';

// Page de reconnexion : chaque app utilise SA PROPRE URL (/auth sur son
// domaine) — l'utilisateur ne quitte jamais l'app pour se reconnecter.
const AUTH_URL = IS_SSO_HOST
  ? SSO_URL
  : `${window.location.origin}/auth`;

// Route de refresh du backend connect (404 -> fallback reconnexion).
const REFRESH_URL = `${API_BASE}/v1/connect/auth/refresh`;

const GRACE_KEY = 'jemaos_sub_ok_until';
// Tolérance hors-ligne : après une vérification réussie, l'abonnement est
// considéré valide sans internet pendant cette durée (renouvelée à chaque
// check en ligne, donc "OFFLINE_GRACE_DAYS jours depuis le dernier
// contact"). Stockée par profil utilisateur/appareil : liée au compte Jema
// connecté sur cet appareil uniquement.
const OFFLINE_GRACE_DAYS = 7;
const GRACE_MS = OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    getJemaOSToken?: () => Promise<string | null>;
    jemaosToken?: string;
  }
}

type CheckResult = 'ok' | 'no-subscription' | 'unauthorized' | 'error';
type VerifyOutcome = 'allowed' | 'denied' | 'retry' | 'reauth';

function getTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'jemaos_access_token' && value) {
      return value;
    }
  }
  return null;
}

async function getAccessToken(exclude?: string): Promise<string | null> {
  const cookieToken = getTokenFromCookie();
  if (cookieToken && cookieToken !== exclude) return cookieToken;
  if (window.getJemaOSToken) {
    try {
      const t = await window.getJemaOSToken();
      if (t && t !== exclude) return t;
    } catch {
      // fall through
    }
  }
  if (window.jemaosToken && window.jemaosToken !== exclude) {
    return window.jemaosToken;
  }
  try {
    const sessionToken = sessionStorage.getItem('jemaos_access_token');
    if (sessionToken && sessionToken !== exclude) return sessionToken;
  } catch {}
  return null;
}

// Supprime le cookie rejeté par l'API (best-effort : le domaine exact du
// Set-Cookie initial est inconnu, on essaie les variantes usuelles).
function clearStaleTokenCookie() {
  const domains: (string | undefined)[] = [
    undefined,
    window.location.hostname,
    '.jemaos.com',
    '.jematech.fr',
  ];
  for (const domain of domains) {
    document.cookie =
      'jemaos_access_token=; Max-Age=0; path=/' +
      (domain ? `; domain=${domain}` : '');
  }
}

function markSubscriptionOk() {
  try {
    localStorage.setItem(GRACE_KEY, String(Date.now() + GRACE_MS));
  } catch {}
  // Token frais obtenu : on réarme la reconnexion automatique.
  clearReauthAttempt();
}

// Révocation immédiate : quand le serveur confirme "pas d'abonnement",
// la grace hors-ligne ne doit pas prolonger l'accès.
function clearSubscriptionGrace() {
  try {
    localStorage.removeItem(GRACE_KEY);
  } catch {}
}

function inGracePeriod(): boolean {
  try {
    const until = Number(localStorage.getItem(GRACE_KEY) || 0);
    return Date.now() < until;
  } catch {
    return false;
  }
}

// Un seul aller-retour SSO automatique par session onglet : si on revient
// du SSO sans token valide, on affiche le mur au lieu de boucler.
const REAUTH_FLAG = 'jemaos_reauth_attempted';

function markReauthAttempted() {
  try { sessionStorage.setItem(REAUTH_FLAG, '1'); } catch {}
}

function reauthAlreadyAttempted(): boolean {
  try { return sessionStorage.getItem(REAUTH_FLAG) === '1'; } catch { return false; }
}

function clearReauthAttempt() {
  try { sessionStorage.removeItem(REAUTH_FLAG); } catch {}
}

// return_to de la page /auth interne : même origine uniquement
// (protection open-redirect). Par défaut : racine de l'app.
function getSafeReturnTo(): string {
  const fallback = `${window.location.origin}/`;
  try {
    const raw = new URLSearchParams(window.location.search).get('return_to');
    if (!raw) return fallback;
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin ? url.href : fallback;
  } catch {
    return fallback;
  }
}

async function checkSubscription(token: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${API_BASE}/v1/connect/os/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    if (res.status === 401 || res.status === 403) return 'unauthorized';
    if (!res.ok) return 'error'; // 5xx : ne jamais murer sur une panne API
    const data = await res.json();
    return data.hasSubscription === true ? 'ok' : 'no-subscription';
  } catch {
    return 'error'; // offline/DNS/CORS : conserver l'état courant
  }
}

// Tente d'obtenir un token frais auprès du backend. Le serveur peut soit
// poser un nouveau cookie (credentials: 'include'), soit renvoyer le token
// en JSON (alors stocké en sessionStorage).
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({}),
    });
    if (!res.ok) return false;
    try {
      const data = await res.json();
      const t = data?.access_token || data?.accessToken || data?.token;
      if (typeof t === 'string' && t) {
        sessionStorage.setItem('jemaos_access_token', t);
      }
    } catch {
      // Pas de corps JSON : le nouveau cookie suffit.
    }
    return true;
  } catch {
    return false;
  }
}

async function verifySubscription(): Promise<VerifyOutcome> {
  let token = await getAccessToken();

  if (token) {
    const r = await checkSubscription(token);
    if (r === 'ok') {
      markSubscriptionOk();
      return 'allowed';
    }
    if (r === 'no-subscription') {
      clearSubscriptionGrace();
      return 'denied';
    }
    if (r === 'error') return inGracePeriod() ? 'allowed' : 'retry';

    // r === 'unauthorized' : token rejeté (expiré ~24 h). On le met de
    // côté, on tente un refresh, puis on revérifie une fois.
    clearStaleTokenCookie();
    const stale = token;
    if (await tryRefreshToken()) {
      token = await getAccessToken(stale);
      if (token) {
        const r2 = await checkSubscription(token);
        if (r2 === 'ok') {
          markSubscriptionOk();
          return 'allowed';
        }
        if (r2 === 'error') return inGracePeriod() ? 'allowed' : 'retry';
        if (r2 === 'no-subscription') {
          clearSubscriptionGrace();
          return 'denied';
        }
      }
    }
    return inGracePeriod() ? 'allowed' : 'reauth';
  }

  // Aucun token : la session SSO peut encore être vivante, on tente un
  // refresh avant de conclure.
  if (await tryRefreshToken()) {
    token = await getAccessToken();
    if (token) {
      const r = await checkSubscription(token);
      if (r === 'ok') {
        markSubscriptionOk();
        return 'allowed';
      }
      if (r === 'error') return inGracePeriod() ? 'allowed' : 'retry';
      if (r === 'no-subscription') {
        clearSubscriptionGrace();
        return 'denied';
      }
    }
  }
  return inGracePeriod() ? 'allowed' : 'reauth';
}

function JemaOSLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
      <img
        src="/logo-jema-black.png"
        alt="JEMA"
        style={{ height: '38px', width: 'auto', display: 'block' }}
      />
      <img
        src="/logo-jema-os-hero.png"
        alt="OS"
        style={{ height: '38px', width: 'auto', display: 'block' }}
      />
    </div>
  );
}

function LockIcon() {
  return (
    <div style={{
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      background: 'rgba(79, 70, 229, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.5rem',
    }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}

function UpgradeScreen({ appName }: { appName: string }) {
  const reconnectUrl = `${AUTH_URL}?return_to=${encodeURIComponent(window.location.href)}`;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0b0f1a 0%, #151b2b 50%, #1a1f35 100%)',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      padding: '1rem',
      boxSizing: 'border-box',
      overflow: 'auto',
    }}>
      <div style={{
        flex: '1 0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '1rem 0',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.96)',
          borderRadius: '28px',
          padding: '2rem 2rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <JemaOSLogo />
          </div>
          <LockIcon />
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '0 0 0.75rem',
            letterSpacing: '-0.02em',
            color: '#0f172a',
          }}>
            {appName}
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#475569',
            margin: '0 0 2rem',
            lineHeight: 1.6,
          }}>
            Cette application nécessite un abonnement JemaOS Pro.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
            <a
              href="https://www.jemaos.com/tarifs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                padding: '0.875rem 2.5rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.45)',
              }}
            >
              Passer à Pro
            </a>
            <a
              href={reconnectUrl}
              style={{
                display: 'inline-block',
                background: 'transparent',
                color: '#4f46e5',
                padding: '0.6rem 1.5rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
                border: '1px solid rgba(79, 70, 229, 0.4)',
              }}
            >
              Se reconnecter
            </a>
          </div>
        </div>
      </div>
      <div style={{
        flexShrink: 0,
        textAlign: 'center',
        padding: '0.75rem 0',
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.45)',
      }}>
        © Jema Technology 2026
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0b0f1a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ fontSize: '1.2rem' }}>Chargement…</div>
    </div>
  );
}

// Page /auth INTERNE à l'app : tente une reconnexion silencieuse (refresh
// du token) puis ramène vers return_to — l'utilisateur ne quitte jamais le
// domaine de l'app. Un écran d'erreur n'apparaît qu'en cas d'échec, avec
// un lien MANUEL vers le SSO (seul cas de sortie de l'app, à la demande
// explicite de l'utilisateur).
function ReconnectScreen() {
  const [failed, setFailed] = useState(false);
  const returnTo = getSafeReturnTo();
  const ssoUrl = `${SSO_URL}?return_to=${encodeURIComponent(window.location.href)}`;

  useEffect(() => {
    let cancelled = false;
    const attempt = async () => {
      const outcome = await verifySubscription();
      if (cancelled) return;
      if (outcome === 'allowed') {
        clearReauthAttempt();
        window.location.replace(returnTo);
      } else {
        setFailed(true);
      }
    };
    attempt();
    return () => { cancelled = true; };
  }, [returnTo]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0b0f1a 0%, #151b2b 50%, #1a1f35 100%)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      padding: '1rem',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.96)',
        borderRadius: '28px',
        padding: '2rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <JemaOSLogo />
        </div>
        {failed ? (
          <>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.75rem',
              color: '#0f172a',
            }}>
              Session expirée
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#475569',
              margin: '0 0 2rem',
              lineHeight: 1.6,
            }}>
              La reconnexion automatique a échoué. Connectez-vous à votre compte JemaOS pour continuer.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <a
                href={ssoUrl}
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#fff',
                  padding: '0.875rem 2.5rem',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.45)',
                }}
              >
                Se connecter avec JemaOS
              </a>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: 'transparent',
                  color: '#4f46e5',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  border: '1px solid rgba(79, 70, 229, 0.4)',
                  cursor: 'pointer',
                }}
              >
                Réessayer
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: '0 0 0.75rem',
              color: '#0f172a',
            }}>
              Reconnexion en cours…
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#475569',
              margin: 0,
              lineHeight: 1.6,
            }}>
              Vérification de votre session JemaOS. Vous allez être redirigé automatiquement.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

interface SubscriptionGuardProps {
  appName: string;
  children: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ appName, children }) => {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
  // Page /auth propre à l'app, rendue par ce guard AU-DESSUS du routeur :
  // la reconnexion se fait sans jamais quitter le domaine de l'app.
  // L'hôte SSO (Nephtys) a sa propre page /auth via son routeur.
  const onAuthPath =
    !IS_SSO_HOST && window.location.pathname.replace(/\/+$/, '') === '/auth';

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      const outcome = await verifySubscription();
      if (cancelled) return;
      if (outcome === 'allowed') {
        setStatus('allowed');
      } else if (outcome === 'reauth') {
        // Reconnexion automatique : rebond vers la page /auth DE L'APP
        // (jamais vers Nephtys). Le mur "Se reconnecter" n'apparaît que si
        // l'aller-retour a déjà échoué une fois (cas de bug) — protection
        // anti-boucle via REAUTH_FLAG.
        if (onAuthPath) return; // la page /auth gère elle-même la suite
        if (reauthAlreadyAttempted()) {
          setStatus('denied');
        } else {
          markReauthAttempted();
          window.location.assign(
            `${AUTH_URL}?return_to=${encodeURIComponent(window.location.href)}`
          );
        }
      } else if (outcome === 'denied') {
        setStatus('denied');
      }
      // 'retry' : erreur transitoire hors période de grâce — on conserve
      // l'écran courant (chargement au démarrage, app si déjà admis) et
      // on retentera au prochain tick, jamais de mur sur une panne réseau.
    };
    verify();
    const interval = setInterval(verify, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [onAuthPath]);

  if (onAuthPath) return <ReconnectScreen />;
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'denied') return <UpgradeScreen appName={appName} />;
  return <>{children}</>;
};

export default SubscriptionGuard;
