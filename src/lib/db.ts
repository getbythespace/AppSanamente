import { createClient } from '@supabase/supabase-js';

// Variables de entorno SÓLO las públicas para frontend.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Registrar usuario 
export async function signUp({ email, password }: { email: string, password: string }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error };
}

// Iniciar sesión 
export async function signIn({ email, password }: { email: string, password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data.user, error };
}

// Cerrar sesión 
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Obtener usuario actual
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data?.user || null;
}
