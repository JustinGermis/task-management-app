import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Disable static generation for auth pages that use searchParams
    skipTrailingSlashRedirect: true,
  },
  // Disable static page generation for auth routes
  async headers() {
    return [
      {
        source: '/auth/:path*',
        headers: [
          {
            key: 'x-middleware-cache',
            value: 'no-cache',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
