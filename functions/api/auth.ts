import type { Ctx } from '../../shared/server';

/**
 * Step 1 of GitHub sign-in.
 *   /api/auth            -> editor login for the CMS at /cms (scope: repo)
 *   /api/auth?mode=hub   -> sign-in for the Admin Hub at /admin (scope: read:user only)
 * Hub access is limited to the GitHub usernames in ADMIN_GITHUB_USERS.
 */
export const onRequestGet = async ({ env, request }: Ctx) => {
  if (!env.GITHUB_OAUTH_CLIENT_ID) return new Response('GITHUB_OAUTH_CLIENT_ID is not set.', { status: 503 });
  const url = new URL(request.url);
  const hub = url.searchParams.get('mode') === 'hub';
  const state = `${hub ? 'hub-' : ''}${crypto.randomUUID()}`;
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', hub ? 'read:user' : 'repo,user');
  authorize.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`,
    },
  });
};
