import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El minisitio (/minisitio) manda por server action la constancia fiscal (hasta 10 MB,
      // validado en el cliente) y el PDF del estado de cuenta en base64 para el correo.
      // El límite por defecto de Next es 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
