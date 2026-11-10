import { supabase } from '../lib/supabaseClient';
import { DbPosStaff } from '../types/supabase';

export async function getCurrentStaff(): Promise<DbPosStaff | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as DbPosStaff | null;
}

// Billing logins are usernames (e.g. Studiodeny2025). Supabase signs in by
// email, so a username maps to <username>@pos.studiodeny.com; a full email
// still works as before.
export const POS_LOGIN_DOMAIN = 'pos.studiodeny.com';
export const loginEmail = (identifier: string) => {
  const id = identifier.trim();
  return id.includes('@') ? id : `${id.toLowerCase()}@${POS_LOGIN_DOMAIN}`;
};

export async function signIn(identifier: string, password: string): Promise<{ staff: DbPosStaff }> {
  const { error: authError } = await supabase.auth.signInWithPassword({ email: loginEmail(identifier), password });
  if (authError) throw new Error(authError.message);

  const staff = await getCurrentStaff();
  if (!staff) {
    await supabase.auth.signOut();
    throw new Error('This account is not registered as Studio Deny POS staff.');
  }

  return { staff };
}

// Every terminal shares one login, so the LOG OUT button signs out this device
// only (Supabase's default 'global' scope would kick every terminal).
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}

// The access token stays valid for up to an hour after its session is revoked
// (password change, "log out everywhere"). getUser() asks the auth server; for
// a revoked session supabase-js clears it and fires SIGNED_OUT itself, which
// sends the app back to login. The signOut below is only a fallback for a
// 401/403 it doesn't clear. Network errors (offline) never sign anyone out.
export async function dropSessionIfRevoked(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  const { error } = await supabase.auth.getUser();
  if (error && (error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403)) {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

export function onAuthChange(callback: (signedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
  return () => data.subscription.unsubscribe();
}
