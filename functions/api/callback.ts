import type { Ctx } from '../../shared/server';

const page = (status: 'success' | 'error', content: unknown) => {
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
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'oauth_state=; Path=/api; Max-Age=0' },
  });
};

/** Step 2: GitHub sends the editor back here; swap the code for a token and hand it to the CMS window. */
export const onRequestGet = async ({ env, request }: Ctx) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = /(?:^|;\s*)oauth_state=([^;]+)/.exec(request.headers.get('Cookie') || '')?.[1];
  if (!code || !state || state !== cookie) return page('error', { message: 'Login expired. Close this window and try again.' });
  if (!env.GITHUB_OAUTH_CLIENT_ID || !env.GITHUB_OAUTH_CLIENT_SECRET) return page('error', { message: 'GitHub OAuth is not configured.' });

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_OAUTH_CLIENT_ID, client_secret: env.GITHUB_OAUTH_CLIENT_SECRET, code }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!data.access_token) return page('error', { message: data.error_description || 'GitHub login failed.' });
  return page('success', { token: data.access_token, provider: 'github' });
};
