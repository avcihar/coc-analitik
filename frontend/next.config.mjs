import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

export default (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  const config = {
    trailingSlash: false,
    images: {
      unoptimized: true,
    },
  };

  if (isDev) {
    config.rewrites = async () => {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    };
  } else {
    config.output = 'export';
  }

  return config;
};
