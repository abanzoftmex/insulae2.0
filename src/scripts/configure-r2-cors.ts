/**
 * Configura CORS del bucket de R2 para que el navegador pueda subir archivos (PUT con URL
 * prefirmada) y leerlos con fetch (GET/HEAD tras la redirección de /api/archivos).
 *
 *   npm run storage:configure-r2-cors              muestra la configuración actual
 *   npm run storage:configure-r2-cors -- --apply   aplica las reglas
 *
 * Lectura: cualquier origen. Una petición que la app redirige a R2 llega con `Origin: null`,
 * que solo admite el comodín; cada URL va firmada de todos modos.
 * Subida: los orígenes de `R2_UPLOAD_ORIGINS` (separados por coma) o, si no se define,
 * cualquiera (la URL prefirmada fija clave, tipo y tamaño y caduca a los 10 minutos).
 */
import { config } from "dotenv";
import { getBucketCorsXml, putBucketCors } from "@/shared/infrastructure/storage/r2";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  console.log("Configuración actual:", (await getBucketCorsXml()) ?? "(ninguna)");
  if (!process.argv.includes("--apply")) return;

  const uploadOrigins = (process.env.R2_UPLOAD_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await putBucketCors([
    {
      allowedOrigins: ["*"],
      allowedMethods: ["GET", "HEAD"],
      allowedHeaders: ["*"],
      exposeHeaders: ["Content-Length", "Content-Type", "Content-Disposition", "ETag"],
      maxAgeSeconds: 86400,
    },
    {
      allowedOrigins: uploadOrigins.length > 0 ? uploadOrigins : ["*"],
      allowedMethods: ["PUT"],
      allowedHeaders: ["content-type", "content-disposition", "cache-control"],
      exposeHeaders: ["ETag"],
      maxAgeSeconds: 3600,
    },
  ]);
  console.log("Aplicada. Nueva configuración:", await getBucketCorsXml());
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
