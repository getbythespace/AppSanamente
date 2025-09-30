import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function SuperAdminLayout({ children }: Props) {
  const router = useRouter()

  const navigation = [
    { name: 'Dashboard', href: '/app/superadmin/dashboard', icon: '📊' },
    { name: 'Usuarios', href: '/app/superadmin/users', icon: '👥' },
    { name: 'Organizaciones', href: '/app/superadmin/organizations', icon: '🏢' },
    { name: 'Logs', href: '/app/superadmin/logs', icon: '📋' },
    { name: 'Solicitudes', href: '/app/superadmin/requests', icon: '📄' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">SuperAdmin</h1>
        </div>
        
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = router.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}