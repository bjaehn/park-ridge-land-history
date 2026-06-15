/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "maplibre-gl": "maplibre-gl/dist/maplibre-gl.js",
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
