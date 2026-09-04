/** @type {import('next').NextConfig} */
const nextConfig = {
  // MapLibre owns and physically detaches its container's DOM children on
  // `.remove()`. React 18 Strict Mode's dev-only double-invoke of effects
  // (mount -> cleanup -> mount) runs that removal against a container React
  // still considers live, orphaning it from the document even though no
  // real unmount happened — the map "works" internally but nothing it
  // renders (including markers) is visible. Disabling Strict Mode avoids
  // this dev-only false unmount; RestaurantMap's cleanup is still written
  // defensively in case of a genuine remount (e.g. Fast Refresh).
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
