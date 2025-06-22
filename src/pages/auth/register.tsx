import React, { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { isValidRut } from '../../utils/validateRut'
import { signUp } from '../auth/auth' 

const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúñÑ\s]+$/

const RegisterPage = () => {
  const router = useRouter()

  const [registerType, setRegisterType] = useState<'psychologist' | 'organization'>('psychologist')
  const [firstName, setFirstName] = useState('')
  const [lastNameP, setLastNameP] = useState('')
  const [lastNameM, setLastNameM] = useState('')
  const [rut, setRut] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgRut, setOrgRut] = useState('')
  const [isPsychologist, setIsPsychologist] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (![firstName, lastNameP, lastNameM].every(n => nameRe.test(n))) {
      setError('Los nombres sólo pueden tener letras y espacios.')
      return
    }
    if (!isValidRut(rut)) {
      setError('RUT inválido.')
      return
    }
    if (dob && new Date(dob) >= new Date()) {
      setError('Fecha de nacimiento inválida.')
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Correo electrónico inválido.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (registerType === 'organization') {
      if (!orgName || !orgRut) {
        setError('Debes ingresar nombre y RUT de la organización.')
        return
      }
    }

    setLoading(true)
    try {
      // correo de confirmación tradicional
      const { user, error: signUpError } = await signUp({
        email,
        password
      })

      setLoading(false)

      if (signUpError) {
        setError(signUpError.message || 'Error en el registro')
        return
      }

      
      router.push('/auth/login')
    } catch (err: any) {
      setLoading(false)
      setError('Error en el registro')
    }
  }

  return (
    <Layout title="Registrarse – App Sanamente">
      <div className="max-w-md mx-auto py-10">
        <h2 className="text-2xl font-bold mb-6">Crear Cuenta</h2>
        {/* Tipo de registro */}
        <div className="mb-4">
          <label className="mr-4">
            <input
              type="radio"
              name="registerType"
              value="psychologist"
              checked={registerType === 'psychologist'}
              onChange={() => setRegisterType('psychologist')}
            /> Psicólogo Independiente
          </label>
          <label>
            <input
              type="radio"
              name="registerType"
              value="organization"
              checked={registerType === 'organization'}
              onChange={() => setRegisterType('organization')}
            /> Organización
          </label>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datos personales */}
          <div>
            <label className="block text-sm">Nombre</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Apellido Paterno</label>
            <input
              type="text"
              value={lastNameP}
              onChange={e => setLastNameP(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Apellido Materno</label>
            <input
              type="text"
              value={lastNameM}
              onChange={e => setLastNameM(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">RUT</label>
            <input
              type="text"
              value={rut}
              onChange={e => setRut(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Fecha de Nacimiento</label>
            <input
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </div>
          {/* Solo para registro de organización */}
          {registerType === 'organization' && (
            <>
              <div>
                <label className="block text-sm">Nombre Organización</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm">RUT Organización</label>
                <input
                  type="text"
                  value={orgRut}
                  onChange={e => setOrgRut(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="isPsych"
                  type="checkbox"
                  checked={isPsychologist}
                  onChange={e => setIsPsychologist(e.target.checked)}
                />
                <label htmlFor="isPsych" className="text-sm">
                  Además ejerceré como psicólogo
                </label>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Registrando…' : 'Registrarse'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

export default RegisterPage