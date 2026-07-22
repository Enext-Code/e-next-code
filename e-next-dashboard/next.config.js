// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   eslint: {
//     // Warning: This allows production builds to successfully complete even if
//     // your project has ESLint errors.
//     ignoreDuringBuilds: true,
//   },
// };

// export default nextConfig;
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   eslint: {
//     // Allows production builds to complete even with ESLint errors
//     ignoreDuringBuilds: true,
//   },
// };

// module.exports = nextConfig;



/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Keep trailing slashes on /api/.../?query so FastAPI routes like
  // GET /patients/patients/?patient_id= are not redirected to the list route.
  skipTrailingSlashRedirect: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;