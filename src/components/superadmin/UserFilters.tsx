interface UserFiltersProps {
  filters: {
    search: string
    role: string
    status: string
    page: number
  }
  onFilterChange: (filters: {
    search: string
    role: string
    status: string
    page: number
  }) => void
}

export default function UserFilters({ filters, onFilterChange }: UserFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
      page: 1 // Reset page when filters change
    })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Buscar
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Email, nombre..."
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Rol
          </label>
          <select
            id="role"
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los roles</option>
            <option value="ADMIN">Admin</option>
            <option value="PSYCHOLOGIST">Psicólogo</option>
            <option value="PATIENT">Paciente</option>
            <option value="OWNER">Owner</option>
            <option value="SUPERADMIN">SuperAdmin</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="PENDING">Pendiente</option>
            <option value="SUSPENDED">Suspendido</option>
            <option value="DELETED">Eliminado</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => onFilterChange({
              search: '',
              role: '',
              status: '',
              page: 1
            })}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}