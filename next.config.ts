import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El minisitio (/minisitio) manda por server action el PDF del estado de cuenta en base64
      // para el correo; el límite por defecto de Next es 1 MB. Los archivos no pasan por aquí:
      // el navegador los sube directo a R2 con una URL prefirmada. En Vercel el cuerpo de una
      // función se corta en 4.5 MB de todos modos.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
