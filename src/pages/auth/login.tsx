import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/db';
import Layout from '@/components/Layout';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Mensajes por razones (inactivo/pending/suspended) y por flujos (check_email / reset_success)
  useEffect(() => {
    const reason = (router.query.reason as string | undefined)?.toLowerCase();
    if (reason) {
      const messages: Record<string, string> = {
        inactive:
          'Tu cuenta está inactiva. Comunícate con el administrador de tu organización para reactivarla.',
        pending:
          'Tu cuenta aún no ha sido activada por un administrador.',
        suspended:
          'Tu cuenta está suspendida. Si crees que es un error, por favor contacta a soporte.',
      };
      setError(messages[reason] || 'No puedes iniciar sesión en este momento.');
    }

    const msg = (router.query.msg as string | undefined)?.toLowerCase();
    if (msg === 'check_email') {
      setInfo('Te enviamos un correo con el enlace para restablecer tu contraseña.');
    } else if (msg === 'reset_success') {
      setInfo('Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.');
    }
  }, [router.query.reason, router.query.msg]);

  // Limpia todo al entrar al login
  useEffect(() => {
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('lastActiveRole');

    const checkAndClearSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        await supabase.auth.signOut();
        document.cookie = 'sb-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'active-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    };
    checkAndClearSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      // 1) login supabase
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw new Error(loginError.message);
      if (!data?.session) throw new Error('No se pudo obtener la sesión');

      // 2) sincroniza cookies httpOnly
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
      });

      // 3) obtiene user con status
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo obtener información del usuario');
      }
      const payload = await res.json();
      if (!payload.ok || !payload.data) {
        throw new Error(payload.error || 'Error en la respuesta del usuario');
      }
      const userData = payload.data as { status?: UserStatus; roles?: any[] };

      // 4) Gate por estado
      const status = (userData.status || 'ACTIVE') as UserStatus;
      if (status !== 'ACTIVE') {
        await supabase.auth.signOut();
        await fetch('/api/auth/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ event: 'SIGNED_OUT' }),
        }).catch(() => {});
        const reason = status.toLowerCase();
        const messages: Record<string, string> = {
          inactive:
            'Tu cuenta está inactiva. Comunícate con el administrador de tu organización para reactivarla.',
          pending:
            'Tu cuenta aún no ha sido activada por un administrador.',
          suspended:
            'Tu cuenta está suspendida. Si crees que es un error, por favor contacta a soporte.',
        };
        setError(messages[reason] || 'No puedes iniciar sesión en este momento.');
        return; // no continuamos
      }

      // 5) roles y redirección
      const roles: string[] = Array.isArray(userData.roles)
        ? userData.roles.map((r: any) => (typeof r === 'string' ? r : r.role))
        : [];
      if (roles.length === 0) throw new Error('Usuario sin roles asignados');

      const activeRole = roles.find((r) => r !== 'PATIENT') || roles[0] || 'PATIENT';

      await fetch('/api/session/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: activeRole }),
      }).catch(() => {});

      if (rememberMe) {
        document.cookie = `remember-session=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax;`;
      }

      const TARGET_BY_ROLE: Record<string, string> = {
        SUPERADMIN: '/app/superadmin',
        OWNER: '/app/owner',
        ADMIN: '/app/admin',
        ASSISTANT: '/app/assistant',
        PSYCHOLOGIST: '/app/psychologist',
        PATIENT: '/app/patient',
      };
      const redirectPath = TARGET_BY_ROLE[activeRole] || '/app/patient';
      setTimeout(() => {
        window.location.href = redirectPath;
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Iniciar sesión" bare>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
          <div className="hidden lg:flex flex-col items-center justify-center p-12">
            <div className="relative">
              <div className="absolute -inset-8 rounded-3xl bg-emerald-400/20 blur-2xl" />
              <div className="relative rounded-3xl bg-slate-900/40 p-10 ring-1 ring-white/10 backdrop-blur">
                <Image
                  src="/logo-sana.png"
                  width={140}
                  height={140}
                  alt="Sanamente"
                  priority
                  className="mx-auto drop-shadow-[0_0_30px_rgba(20,184,166,0.45)]"
                />
                <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                  Bienvenido a Sanamente
                </h1>
                <p className="mt-2 text-center text-emerald-200/80">
                  Un registro para tu presente, una guía para tu futuro.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out hover:-translate-y-0.5">
              <div className="mb-5 flex items-center justify-center lg:hidden">
                <Image
                  src="/logo-sana.png"
                  width={64}
                  height={64}
                  alt="Sanamente"
                  className="drop-shadow-[0_0_18px_rgba(16,185,129,0.5)]"
                />
              </div>

              <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
                Iniciar sesión
              </h2>

              <p className="mt-2 text-center text-sm text-emerald-200/80">
                ¿Nuevo aquí?{' '}
                <Link
                  href="/auth/register"
                  className="font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
                >
                  Regístrate
                </Link>
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {info && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {info}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="group">
                    <label className="mb-1 block text-sm text-emerald-100/90">
                      Correo electrónico
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none ring-emerald-400/0 transition-all focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                      placeholder="tu@correo.com"
                    />
                  </div>

                  <div className="group">
                    <label className="mb-1 block text-sm text-emerald-100/90">Contraseña</label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none ring-emerald-400/0 transition-all focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-emerald-100/90">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/40"
                    />
                    Mantener sesión iniciada
                  </label>

                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-emerald-300 transition-colors hover:text-emerald-200"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="relative inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Iniciando sesión…
                    </span>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
