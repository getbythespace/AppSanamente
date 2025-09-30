/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/admin/userInvitations/:path*',
        destination: '/api/admin/invitations/:path*',
      },
    ]
  },
}
