import { createClient } from '@supabase/supabase-js';

// Variables de entorno públicas para frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente único compartido
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // NOTA: no uses "multiTab": no existe en esta versión tipada
  },
});

// ---- helpers opcionales (mantengo tu API) ----
export async function signUp({ email, password }: { email: string, password: string }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, session: data.session, error };
}

export async function signIn({ email, password }: { email: string, password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, session: data.session, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { user: null, error };
  return { user: data?.user || null, error: null };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}
