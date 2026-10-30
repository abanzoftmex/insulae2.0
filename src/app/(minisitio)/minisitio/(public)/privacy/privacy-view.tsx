"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptPrivacyNoticeAction } from '../../_actions/auth';
import { msPath } from '@/components/minisitio/paths';
import { AvisoPrivacidadTexto } from "@/components/minisitio/aviso-privacidad-texto";

/**
 * Aceptación del aviso de privacidad. Solo se muestra a un condómino con sesión que aún no lo
 * aceptó; como la base todavía no guarda la aceptación (el login lo da por aceptado), hoy
 * page.tsx siempre redirige igual que el minisitio independiente.
 */
export function PrivacyView({ notice }: { notice: string }) {
  const router = useRouter();
  const privacyNotice = notice;
  const loading = false;
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);

    try {
      const data = await acceptPrivacyNoticeAction();

      if (data.success) {
        router.push(msPath('/dashboard'));
      }
    } catch (error) {
      console.error('Error accepting privacy notice:', error);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    // Se conserva el estado de carga del original; el aviso ya llega del servidor.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-blue-600">
            <h1 className="text-2xl font-bold text-white">Aviso de Privacidad</h1>
            <p className="text-blue-100 mt-2">
              Por favor, lee y acepta nuestro aviso de privacidad para continuar
            </p>
          </div>

          <div className="px-6 py-8">
            <div className="prose max-w-none">
              {privacyNotice ? (
                <AvisoPrivacidadTexto texto={privacyNotice} nivelSeccion={3} />
              ) : (
                <div className="text-gray-600">
                  <h3 className="text-lg font-semibold mb-4">Aviso de Privacidad</h3>
                  <p className="mb-4">
                    Este aviso de privacidad describe cómo recopilamos, utilizamos y protegemos
                    su información personal en el sistema Insulae.
                  </p>
                  <p className="mb-4">
                    Al utilizar este sistema, usted acepta el tratamiento de sus datos personales
                    conforme a las políticas establecidas.
                  </p>
                  <p>
                    Para más información, puede contactar al administrador del sistema.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-4">
            <button
              onClick={() => router.push(msPath('/login'))}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </div>
              ) : (
                'Acepto'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
