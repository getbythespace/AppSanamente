import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'

interface LogEntry {
  id: string
  action: string
  details: string
  createdAt: string
  ipAddress?: string
  type: 'USER_ACTION' | 'ADMIN_ACTION'
  user: {
    firstName: string
    lastNamePaternal: string
    email: string
  }
}

interface UserLogsModalProps {
  open: boolean
  onClose: () => void
  userId: string | null
  userName?: string
}

export default function UserLogsModal({ 
  open, 
  onClose, 
  userId, 
  userName 
}: UserLogsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    action: 'ALL',
    from: '',
    to: '',
    limit: '50'
  })

  useEffect(() => {
    if (open && userId) {
      fetchLogs()
    }
  }, [open, userId, filters])

  const fetchLogs = async () => {
    if (!userId) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.action !== 'ALL') params.append('action', filters.action)
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      params.append('limit', filters.limit)

      const response = await fetch(`/api/superadmin/users/${userId}/logs?${params}`)
      const data = await response.json()

      if (data.ok) {
        setLogs(data.data.logs)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    const colors = {
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-blue-100 text-blue-800',
      'DELETE': 'bg-red-100 text-red-800',
      'LOGIN': 'bg-indigo-100 text-indigo-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      'VIEW': 'bg-yellow-100 text-yellow-800'
    }
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getTypeIcon = (type: string) => {
    return type === 'USER_ACTION' ? '👤' : '👨‍💼'
  }

  return (
    <Transition appear show={open}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                <div className="flex items-center justify-between p-6 border-b">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    Historial de Actividad - {userName}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Filtros */}
                <div className="p-6 bg-gray-50 border-b">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Acción
                      </label>
                      <select
                        value={filters.action}
                        onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="ALL">Todas</option>
                        <option value="CREATE">Crear</option>
                        <option value="UPDATE">Actualizar</option>
                        <option value="DELETE">Eliminar</option>
                        <option value="LOGIN">Iniciar Sesión</option>
                        <option value="VIEW">Visualizar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Desde
                      </label>
                      <input
                        type="date"
                        value={filters.from}
                        onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Hasta
                      </label>
                      <input
                        type="date"
                        value={filters.to}
                        onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Límite
                      </label>
                      <select
                        value={filters.limit}
                        onChange={(e) => setFilters(prev => ({ ...prev, limit: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Lista de logs */}
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Cargando historial...</p>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="p-6 text-center">
                      <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Sin actividad</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        No hay registros de actividad con los filtros aplicados.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {logs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start space-x-3">
                            <div className="text-lg">
                              {getTypeIcon(log.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    getActionColor(log.action)
                                  }`}>
                                    {log.action}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    log.type === 'USER_ACTION' 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {log.type === 'USER_ACTION' ? 'Usuario' : 'Administrador'}
                                  </span>
                                </div>
                                <time className="text-xs text-gray-500">
                                  {new Date(log.createdAt).toLocaleString('es-CL')}
                                </time>
                              </div>
                              <p className="mt-1 text-sm text-gray-900">
                                {log.details}
                              </p>
                              <div className="mt-1 text-xs text-gray-500">
                                Por: {log.user.firstName} {log.user.lastNamePaternal} ({log.user.email})
                                {log.ipAddress && ` • IP: ${log.ipAddress}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      {logs.length} registros mostrados
                    </p>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}