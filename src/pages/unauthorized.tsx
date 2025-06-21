export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso denegado</h1>
      <p>No tienes permisos para ver esta página.</p>
    </div>
  )
}