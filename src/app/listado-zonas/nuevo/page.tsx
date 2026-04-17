import type { Metadata } from "next";
import { Lora, Nunito_Sans } from "next/font/google";

import { ZonaFormShell } from "../zona-form-shell";

const lora = Lora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-zones-display",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-zones-body",
});

export const metadata: Metadata = {
  title: "Nuevo Barrio | Insulae 2.0",
  description: "Formulario de alta de barrios para Insulae 2.0.",
};

export const dynamic = "force-dynamic";

export default function NuevoBarrioPage() {
  return (
    <div className={`${lora.variable} ${nunito.variable}`}>
      <ZonaFormShell mode="create" />
    </div>
  );
}
