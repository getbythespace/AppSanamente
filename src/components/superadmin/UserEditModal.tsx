import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string
  rut?: string
  phone?: string
  licenseNumber?: string
  specialties?: string
  roles: { role: string }[]
}

interface UserEditModalProps {
  open: boolean
  onClose: () => void
  user: User | null
  onSave: (userData: any) => Promise<void>
  loading?: boolean
}

export default function UserEditModal({ 
  open, 
  onClose, 
  user, 
  onSave, 
  loading = false 
}: UserEditModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastNamePaternal: '',
    lastNameMaternal: '',
    rut: '',
    phone: '',
    password: '',
    licenseNumber: '',
    specialties: [] as string[]
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastNamePaternal: user.lastNamePaternal || '',
        lastNameMaternal: user.lastNameMaternal || '',
        rut: user.rut || '',
        phone: user.phone || '',
        password: '',
        licenseNumber: user.licenseNumber || '',
        specialties: user.specialties ? JSON.parse(user.specialties) : []
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validaciones
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) newErrors.email = 'Email es requerido'
    if (!formData.firstName) newErrors.firstName = 'Nombre es requerido'
    if (!formData.lastNamePaternal) newErrors.lastNamePaternal = 'Apellido paterno es requerido'
    
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSave({
        userId: user?.id,
        ...formData,
        specialties: formData.specialties.length > 0 ? formData.specialties : null
      })
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al guardar usuario' })
    }
  }

  const isPsychologist = user?.roles.some(role => role.role === 'PSYCHOLOGIST')

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    Editar Usuario
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm text-red-600">{errors.submit}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          errors.email ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>

                    {/* Nombre */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          errors.firstName ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                    </div>

                    {/* Apellido Paterno */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Apellido Paterno *
                      </label>
                      <input
                        type="text"
                        value={formData.lastNamePaternal}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastNamePaternal: e.target.value }))}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                          errors.lastNamePaternal ? 'border-red-300' : ''
                        }`}
                      />
                      {errors.lastNamePaternal && <p className="mt-1 text-sm text-red-600">{errors.lastNamePaternal}</p>}
                    </div>

                    {/* Apellido Materno */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Apellido Materno
                      </label>
                      <input
                        type="text"
                        value={formData.lastNameMaternal}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastNameMaternal: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* RUT */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        RUT
                      </label>
                      <input
                        type="text"
                        value={formData.rut}
                        onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="12.345.678-9"
                      />
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="+56 9 1234 5678"
                      />
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nueva Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.password ? 'border-red-300' : ''
                      }`}
                      placeholder="Dejar vacío para mantener la actual"
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                  </div>

                  {/* Campos específicos para psicólogos */}
                  {isPsychologist && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Número de Licencia
                        </label>
                        <input
                          type="text"
                          value={formData.licenseNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Especialidades
                        </label>
                        <input
                          type="text"
                          value={formData.specialties.join(', ')}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="Separar con comas: Terapia Cognitiva, Psicología Clínica"
                        />
                      </div>
                    </>
                  )}

                  {/* Botones */}
                  <div className="flex justify-end space-x-3 pt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}