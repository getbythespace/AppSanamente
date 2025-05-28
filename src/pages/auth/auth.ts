import { supabase } from '@/services/db'; 
import { SignUpWithPasswordCredentials, SignInWithPasswordCredentials } from '@supabase/supabase-js';

export const signUp = async (credentials: SignUpWithPasswordCredentials) => {
  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) {
    console.error('Error signing up:', error.message);
    // MANEJO DE ERRORES
    return { user: null, session: null, error };
  }
  return { user: data.user, session: data.session, error: null };
};

export const signIn = async (credentials: SignInWithPasswordCredentials) => {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    console.error('Error signing in:', error.message);
    // MANEJO DE ERRORES
    return { user: null, session: null, error };
  }
  return { user: data.user, session: data.session, error: null };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    // MANEJO DE ERRORES
  }
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  if (!session) {
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};