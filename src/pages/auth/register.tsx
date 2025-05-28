import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout'; // RUTA LAYOUT
import { signUp } from './auth'; // RUTA MODULO AUTH
// IMPORTAR USE AUTH

const RegisterPage = () => {
  const router = useRouter();
  // IMPLEMENTAR AUTHCONTEXT PARA LOGIN
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // AGREGAR CAMPOS, EDAD, RUT, NOMBRE, ETC. 
  // AGREGAR ESTADO PARA USUARIO, ROL, ETC.
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    // IMPLEMENTAR FORMULARIO DE DATOS
    // DEFINIR ROL INICIAL SEGUN FLUJO
    // PARA REGISTRO DE ORGANIZACIONES (MAS COMPLEJO) USAR BACKEND PURO
    const { user, session, error: signUpError } = await signUp({
      email,
      password,
 //PEDIR FULL NAME Y ROL DEFAULT
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Error al registrar la cuenta. Inténtalo de nuevo.');
      return;
    }

    if (user && session) {
      console.log('Registration successful:', user);
      // Aquí podrías usar un AuthContext para guardar el estado del usuario globalmente
      // await login(user, session); // Ejemplo con AuthContext
      // Idealmente, después del registro, el usuario también inicia sesión.
      // Supabase maneja esto automáticamente con signUp si la confirmación de email no está habilitada o ya fue hecha.
      alert('¡Registro exitoso! Serás redirigido al panel.'); // O un mensaje más elegante
      router.push('/dashboard'); // Redirige a un dashboard genérico por ahora
    }
  };

  return (
    <Layout title="Registrarse - App Sanamente">
      <div className="flex justify-center items-center py-10">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-center text-gray-900">Crear Cuenta</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Aquí podrías añadir campos como Nombre, RUT, etc. */}
            {/* Ejemplo:
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
              <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            */}
            <div>
              <label htmlFor="email-register" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <input
                id="email-register"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="password-register" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password-register"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>
            </div>
          </form>
          <p className="text-sm text-center text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <a href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Inicia Sesión
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;