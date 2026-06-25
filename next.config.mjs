/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  // Keep pdfjs-dist out of webpack so its worker file paths stay intact at runtime
  serverExternalPackages: ["pdfjs-dist"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "maplibre-gl": "maplibre-gl/dist/maplibre-gl.js",
      // pdfjs-dist optionally imports canvas for page rendering; stub it out
      // since we only need text extraction (no canvas available server-side)
      canvas: false,
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_PMTILES_URL: process.env.NEXT_PUBLIC_PMTILES_URL ?? "",
  },
};

export default nextConfig;
