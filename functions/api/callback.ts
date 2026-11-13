import { allowedAdmins, sessionCookie } from '../../shared/adminAuth';
import type { Ctx } from '../../shared/server';

const clearState = 'oauth_state=; Path=/api; Max-Age=0';

const cmsPage = (status: 'success' | 'error', content: unknown) => {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><html><body><script>
(function () {
  var message = ${JSON.stringify(message)};
  function receive(e) {
    window.opener.postMessage(message, e.origin);
    window.removeEventListener('message', receive, false);
    window.close();
  }
  window.addEventListener('message', receive, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script><p>Signing you in…</p></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearState } });
};

const hubError = (msg: string, status = 403) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>Sign-in failed</title><body style="font-family:system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem">
     <h1 style="font-size:1.25rem">Sign-in failed</h1><p>${msg}</p><p><a href="/admin/">Back to the admin sign-in</a></p></body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearState } },
  );

/** Step 2: GitHub returns here. Swaps the code for a token, then serves the CMS or the Admin Hub. */
export const onRequestGet = async ({ env, request }: Ctx) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = /(?:^|;\s*)oauth_state=([^;]+)/.exec(request.headers.get('Cookie') || '')?.[1];
  const hub = !!state?.startsWith('hub-');
  const fail = (m: string) => (hub ? hubError(m, 400) : cmsPage('error', { message: m }));

  if (!code || !state || state !== cookie) return fail('Login expired. Please try again.');
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) return fail('GitHub login is not configured.');

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_OAUTH_CLIENT_ID, client_secret: env.GITHUB_OAUTH_CLIENT_SECRET, code }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!data.access_token) return fail(data.error_description || 'GitHub login failed.');

  if (!hub) return cmsPage('success', { token: data.access_token, provider: 'github' });

  // Admin Hub: identify the person, then check the allowlist. The GitHub token is discarded.
  const me: any = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'letswrassle-admin' },
  })
    .then((r) => r.json())
    .catch(() => ({}));
  const login = String(me.login || '').toLowerCase();
  if (!login) return hubError('Could not read your GitHub account.', 502);
  if (!allowedAdmins(env).includes(login)) return hubError(`The GitHub account "${login}" is not allowed to use this admin.`);
  if (!env.SESSION_SECRET) return hubError('The server is missing SESSION_SECRET.', 503);

  const headers = new Headers({ Location: '/admin/orders' });
  headers.append('Set-Cookie', await sessionCookie(env, login));
  headers.append('Set-Cookie', clearState);
  return new Response(null, { status: 302, headers });
};
