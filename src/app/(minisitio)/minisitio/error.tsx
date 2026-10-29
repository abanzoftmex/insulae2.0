"use client";

import { useEffect } from "react";
import { MinisitioErrorScreen } from "./error-screen";

export default function MinisitioError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[minisitio] Error de pantalla:", error);
  }, [error]);

  return <MinisitioErrorScreen statusCode={500} />;
}
