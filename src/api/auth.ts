import { supabase } from '../lib/supabaseClient';
import { DbPosStaff } from '../types/supabase';
import { AuthLoginResponse, AuthSessionUser } from '../types/api';

export async function getCurrentStaff(): Promise<DbPosStaff | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('pos_staff')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as DbPosStaff | null;
}

export async function signIn(email: string, password: string): Promise<{ staff: DbPosStaff }> {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(authError.message);

  const staff = await getCurrentStaff();
  if (!staff) {
    await supabase.auth.signOut();
    throw new Error('This account is not registered as Studio Deny POS staff.');
  }

  return { staff };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  sessionStorage.removeItem('STUDIO_DENY_USER');
}

export function onAuthChange(callback: (signedIn: boolean) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Universal Auth Adapter supporting both direct Supabase session and custom API consumers
 */
export const authApi = {
  login: async (email: string, pass: string): Promise<AuthLoginResponse> => {
    const { staff } = await signIn(email, pass);
    const sessionUser: AuthSessionUser = {
      id: staff.id,
      name: staff.display_name,
      email: email,
      role: (staff.role || 'BILLING').toUpperCase() as any,
      permissions: Array.isArray(staff.permissions) ? (staff.permissions as string[]) : [],
    };
    sessionStorage.setItem('STUDIO_DENY_USER', JSON.stringify(sessionUser));
    return {
      user: sessionUser,
      accessToken: 'supabase_session_active',
      expiresIn: 3600,
    };
  },

  logout: async (): Promise<void> => {
    await signOut();
  },

  getCurrentUser: async (): Promise<AuthSessionUser | null> => {
    const staff = await getCurrentStaff();
    if (!staff) return null;
    const { data: userData } = await supabase.auth.getUser();
    return {
      id: staff.id,
      name: staff.display_name,
      email: userData.user?.email || '',
      role: (staff.role || 'BILLING').toUpperCase() as any,
      permissions: Array.isArray(staff.permissions) ? (staff.permissions as string[]) : [],
    };
  },

  getStoredUser: (): AuthSessionUser | null => {
    try {
      const stored = sessionStorage.getItem('STUDIO_DENY_USER');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
};
