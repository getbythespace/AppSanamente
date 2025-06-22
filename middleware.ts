import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Paneles y rutas privadas
    "/dashboard",
    "/dashboard/(.*)",
    "/admin",
    "/admin/(.*)",
    "/psychologist",
    "/psychologist/(.*)",
    "/patient",
    "/patient/(.*)",
    "/organization",
    "/organization/(.*)",
    // Todas las rutas de API (excepto auth públicas si tienes)
    "/api/(.*)",
  ],
}