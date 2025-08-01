/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Remplacez cette partie par l'identifiant de votre projet Supabase
        // Vous pouvez le trouver dans l'URL de votre projet
        hostname: 'egmlrxouupgxyrbncrlb.supabase.co', 
      },
    ],
  },
};

export default nextConfig;