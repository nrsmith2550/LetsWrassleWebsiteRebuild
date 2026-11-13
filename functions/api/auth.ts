import type { Ctx } from '../../shared/server';

/**
 * Step 1 of the admin login: sends the editor to GitHub to sign in.
 * Only GitHub users with write access to the repo can actually save changes,
 * because the CMS commits to the repo using that person's own GitHub token.
 */
export const onRequestGet = async ({ env, request }: Ctx) => {
  if (!env.GITHUB_OAUTH_CLIENT_ID) return new Response('GITHUB_OAUTH_CLIENT_ID is not set.', { status: 503 });
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', 'repo,user');
  authorize.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600`,
    },
  });
};
