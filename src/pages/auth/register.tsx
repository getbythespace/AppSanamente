// src/pages/auth/register.tsx
import React, { useState, FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import DatePicker from '@/components/DatePicker'
import { isValidRut, formatRut } from '@/utils/validateRut'

const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/
const passwordRe = /^(?=.*[A-Z])(?=.*[\d\W]).{8,}$/ // Mínimo 8, una mayúscula, un número o símbolo

export default function RegisterPage() {
  const router = useRouter()

  const [registerType, setRegisterType] = useState<'psychologist' | 'organization'>('psychologist')
  const [firstName, setFirstName] = useState('')
  const [lastNameP, setLastNameP] = useState('')
  const [lastNameM, setLastNameM] = useState('')
  const [rut, setRut] = useState('')
  const [dob, setDob] = useState('') // yyyy-MM-dd
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgRut, setOrgRut] = useState('')
  const [isPsychologist, setIsPsychologist] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ——— Formateos ———
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => setRut(formatRut(e.target.value))
  const handleOrgRutChange = (e: React.ChangeEvent<HTMLInputElement>) => setOrgRut(formatRut(e.target.value))

  // ——— Envío (lógica validada + endpoints) ———
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const f = firstName.trim()
    const lp = lastNameP.trim()
    const lm = lastNameM.trim()

    if (![f, lp, lm].every(n => nameRe.test(n))) {
      setError('Los nombres sólo pueden tener letras y espacios.')
      return
    }
    if (!isValidRut(rut)) {
      setError('RUT inválido. Debe tener formato 12.345.678-5')
      return
    }
    if (registerType === 'psychologist') {
      if (!dob) {
        setError('Debes ingresar fecha de nacimiento.')
        return
      }
      const edad = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (edad < 18) {
        setError('Debes ser mayor de edad para registrarte como psicólogo.')
        return
      }
    }
    if (registerType === 'organization') {
      if (!orgName || !orgRut) {
        setError('Debes ingresar nombre y RUT de la organización.')
        return
      }
      if (!isValidRut(orgRut)) {
        setError('RUT de organización inválido. Debe tener formato 12.345.678-5')
        return
      }
    }
    if (dob && new Date(dob) >= new Date()) {
      setError('Fecha de nacimiento inválida.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Correo electrónico inválido.')
      return
    }
    if (!passwordRe.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número o símbolo.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones para continuar.')
      return
    }

setLoading(true)
try {
  const url =
    registerType === 'psychologist'
      ? '/api/registration/registerPsychologist'
      : '/api/registration/registerOrganization'

  const payload =
    registerType === 'psychologist'
      ? {
          firstName: firstName.trim(),
          lastNameP: lastNameP.trim(),
          lastNameM: lastNameM.trim(),
          rut,
          dob,           // yyyy-MM-dd que ya produces con DatePicker
          email: email.trim(),
          password
        }
      : {
          name: orgName.trim(),
          orgRut,
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastNameP: lastNameP.trim(),
          lastNameM: lastNameM.trim(),
          rut,
          dob,           // idem
          isPsychologist // checkbox opcional en “Organización”
        }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json.error || 'Error en el registro')

  // éxito: mostramos pantalla de login con aviso de “revisa tu correo”
  router.push('/auth/login?checkEmail=1')
} catch (err: any) {
  setError(err.message || 'Error en el registro')
} finally {
  setLoading(false)
}
  }

  // UI helpers
  const pwdOk = passwordRe.test(password)
  const pwdLen = Math.min(password.length, 12)
  const pwdPct = Math.round((pwdLen / 12) * 100)

  return (
    <Layout title="Crear cuenta – Sanamente" bare>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950">
        {/* halos brand */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
          {/* Panel marca */}
          <div className="hidden lg:flex flex-col items-center justify-center p-12">
            <div className="relative">
              <div className="absolute -inset-8 rounded-3xl bg-emerald-400/20 blur-2xl" />
              <div className="relative rounded-3xl bg-slate-900/40 p-10 ring-1 ring-white/10 backdrop-blur">
                <Image
                  src="/logo-sana.png"
                  alt="Sanamente"
                  width={140}
                  height={140}
                  priority
                  className="mx-auto drop-shadow-[0_0_30px_rgba(20,184,166,0.45)]"
                />
                <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
                  Únete a Sanamente
                </h1>
                <p className="mt-2 text-center text-emerald-200/80">
                  Crea tu cuenta de forma segura
                </p>
              </div>
            </div>
          </div>

          {/* Card registro */}
          <div className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
              {/* Logo en mobile */}
              <div className="mb-5 flex items-center justify-center lg:hidden">
                <Image
                  src="/logo-sana.png"
                  alt="Sanamente"
                  width={60}
                  height={60}
                  className="drop-shadow-[0_0_18px_rgba(16,185,129,0.5)]"
                />
              </div>

              <h2 className="text-center text-2xl font-semibold tracking-tight text-white">
                Crear Cuenta
              </h2>

              {/* selector tipo (segmented) */}
              <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1 text-sm text-emerald-100/90">
                <button
                  type="button"
                  onClick={() => setRegisterType('psychologist')}
                  className={`rounded-lg px-3 py-2 transition ${
                    registerType === 'psychologist'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'hover:bg-white/5'
                  }`}
                >
                  Psicólogo Independiente
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterType('organization')}
                  className={`rounded-lg px-3 py-2 transition ${
                    registerType === 'organization'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'hover:bg-white/5'
                  }`}
                >
                  Organización
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {/* Datos personales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">Nombre</label>
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">Apellido Paterno</label>
                    <input
                      value={lastNameP}
                      onChange={e => setLastNameP(e.target.value)}
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                      placeholder="Apellido paterno"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">Apellido Materno</label>
                    <input
                      value={lastNameM}
                      onChange={e => setLastNameM(e.target.value)}
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                      placeholder="Apellido materno"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">RUT</label>
                    <input
                      value={rut}
                      onChange={handleRutChange}
                      required
                      placeholder="12.345.678-5"
                      maxLength={12}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                    />
                  </div>
                </div>

                {/* Fecha + email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    label="Fecha de Nacimiento"
                    value={dob || undefined}
                    onChange={(iso) => setDob(iso)}
                    fromYear={1930}
                    toYear={new Date().getFullYear()}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="tu@correo.com"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                    />
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Mínimo 8, mayúscula y número/símbolo"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                    />
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${pwdOk ? 'bg-emerald-400' : 'bg-yellow-400'}`}
                        style={{ width: `${pwdPct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-200/80">
                      Debe incluir al menos <b>8 caracteres</b>, una <b>mayúscula</b> y un <b>número o símbolo</b>.
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-emerald-100/90">Confirmar Contraseña</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                    />
                  </div>
                </div>

                {/* Campos organización */}
                {registerType === 'organization' && (
                  <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-emerald-100/90">
                          Nombre Organización
                        </label>
                        <input
                          value={orgName}
                          onChange={e => setOrgName(e.target.value)}
                          required
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-emerald-100/90">
                          RUT Organización
                        </label>
                        <input
                          value={orgRut}
                          onChange={handleOrgRutChange}
                          required
                          placeholder="12.345.678-5"
                          maxLength={12}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                        />
                      </div>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-emerald-100/90">
                      <input
                        type="checkbox"
                        checked={isPsychologist}
                        onChange={e => setIsPsychologist(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/40"
                      />
                      Además ejerceré como psicólogo
                    </label>
                  </div>
                )}

                {/* ✅ Condiciones de uso */}
                <label className="mt-1 flex items-start gap-3 text-sm text-emerald-100/90">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e)=>setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-emerald-400 focus:ring-emerald-400/40"
                  />
                  <span>
                    Declaro usar esta aplicación con responsabilidad y respeto, entendiendo que su
                    propósito es apoyar el bienestar emocional y <b>no reemplaza</b> atención de urgencia ni
                    diagnósticos médicos. Acepto los{' '}
                    <Link href="/terminos" className="underline text-emerald-300 hover:text-emerald-200">
                      términos y condiciones
                    </Link>.
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !acceptTerms}
                  className="relative inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registrando…
                    </span>
                  ) : (
                    'Registrarse'
                  )}
                </button>

                <div className="text-center text-xs text-emerald-200/70">
                  ¿Ya tienes cuenta?{' '}
                  <a href="/auth/login" className="font-semibold text-emerald-300 hover:text-emerald-200">
                    Inicia sesión
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
