import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout'; 
import { getCurrentUser, signOut as supabaseSignOut } from '../services/db'; 
import { User } from '@supabase/supabase-js';

const DashboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/auth/login');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabaseSignOut();
    setUser(null);
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <Layout title="Cargando...">
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-xl">Cargando tu panel...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title="Acceso Denegado">
        <div className="flex justify-center items-center min-h-screen">
          <p className="text-xl">Necesitas iniciar sesión para ver esta página.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Panel de ${user.email}`}>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Bienvenido a tu Panel</h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Información del Usuario</h2>
          <p><strong>Correo Electrónico:</strong> {user.email}</p>
          <p><strong>ID de Usuario:</strong> {user.id}</p>
          <p><strong>Último inicio de sesión:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold">Próximos Pasos:</h3>
            <ul className="list-disc list-inside ml-4">
              <li>Mostrar contenido basado en el rol del usuario (Admin, Psicólogo, Paciente).</li>
              <li>Si es Paciente: Formulario para registrar estado de ánimo, ver gráficos.</li>
              <li>Si es Psicólogo: Lista de pacientes asignados, ver sus gráficos.</li>
              <li>Si es Admin: Gestión de psicólogos y pacientes de la organización.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
