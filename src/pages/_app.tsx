import { AppProps } from 'next/app'
import { SWRConfig } from 'swr'
import fetcher from '@/services/fetcher'
import '@/styles/global.css'
import 'react-day-picker/dist/style.css'

import ThemeProvider from '@/components/ui/ThemeProvider'
import ThemeToggle from '@/components/ui/ThemeToggle'
import RoleClassEffect from '@/components/ui/RoleClassEffect'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      {/* Aplica clase role-XYZ en <html> */}
      <RoleClassEffect />
      <SWRConfig
        value={{
          fetcher,
          shouldRetryOnError: false,
          revalidateOnFocus: false,
          dedupingInterval: 5000,
          provider: () => new Map(),
          onError: (err) => {
            console.error('Error global SWR:', err)
          },
        }}
      >
        <Component {...pageProps} />
        {/* Interruptor flotante global */}
        <ThemeToggle />
      </SWRConfig>
    </ThemeProvider>
  )
}

export default MyApp
