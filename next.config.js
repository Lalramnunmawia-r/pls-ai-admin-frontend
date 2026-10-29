/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // These screens were merged into the Content workspace.
    return ["/library", "/resources", "/questions", "/reports"].map((source) => ({
      source,
      destination: "/content",
      permanent: false
    }));
  }
};

module.exports = nextConfig;
