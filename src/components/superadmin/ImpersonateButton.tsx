import React, { useState } from 'react'
import { EyeIcon } from '@heroicons/react/24/outline'

interface ImpersonateButtonProps {
  userId: string
  userName: string
  disabled?: boolean
}

export default function ImpersonateButton({ 
  userId, 
  userName, 
  disabled = false 
}: ImpersonateButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleImpersonate = async () => {
    if (disabled || loading) return

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres impersonar a ${userName}?\n\nEsto te permitirá ver el sistema desde su perspectiva.`
    )

    if (!confirmed) return

    setLoading(true)
    try {
      const response = await fetch('/api/superadmin/impersonateUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.ok) {
        // Aquí implementarías la lógica de impersonación
        // Por ejemplo, redirigir a la vista del usuario impersonado
        alert('Funcionalidad de impersonación pendiente de implementar')
      } else {
        alert('Error al impersonar usuario: ' + data.error)
      }
    } catch (error) {
      console.error('Error impersonating user:', error)
      alert('Error al impersonar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleImpersonate}
      disabled={disabled || loading}
      className={`
        inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
        ${disabled || loading
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        }
      `}
      title={`Impersonar a ${userName}`}
    >
      <EyeIcon className="h-4 w-4 mr-1" />
      {loading ? 'Cargando...' : 'Impersonar'}
    </button>
  )
}