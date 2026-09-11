/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Standalone output bundles a minimal server + only the deps each page
    // actually needs, so the Docker image doesn't have to ship the full
    // node_modules tree (see frontend/Dockerfile).
    output: 'standalone'
};

module.exports = nextConfig;
