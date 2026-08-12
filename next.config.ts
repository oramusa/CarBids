import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    // Allows next/image to optimize photos uploaded to Supabase Storage.
    // Replace with your project's actual storage hostname, or narrow the
    // pathname pattern further once you know your bucket name.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
