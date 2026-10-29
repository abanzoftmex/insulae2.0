"use client";

import { useRouter } from "next/navigation";
import { msPath } from "@/components/minisitio/paths";

/** Pantalla de error del portal (antes `pages/_error.js` del minisitio). */
export function MinisitioErrorScreen({ statusCode }: { statusCode?: number }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-white to-gold-soft flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">{statusCode ? `Error ${statusCode}` : "Error"}</h1>

        <p className="text-gray-600 mb-6">
          {statusCode === 404
            ? "La página que buscas no existe."
            : "Ha ocurrido un error inesperado. Por favor, intenta de nuevo."}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full bg-gradient-to-r from-[#cba258] to-[#cba258] text-white py-3 px-6 rounded-xl font-medium hover:from-[#bca065] hover:to-[#bca065] transition-all duration-200 shadow-lg"
          >
            Volver atrás
          </button>

          <button
            onClick={() => router.push(msPath("/"))}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
