import { currentAdmin } from '../../../shared/adminAuth';
import { json, type Ctx } from '../../../shared/server';

export const onRequestGet = async ({ env, request }: Ctx) => {
  const login = await currentAdmin(env, request);
  return login ? json({ login }) : json({ error: 'Please sign in.' }, 401);
};
