"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction } from '../../_actions/auth';
import type { ProjectInfo } from '@/modules/minisitio/infrastructure/queries/project.queries';
import { msPath } from '@/components/minisitio/paths';

/** Logo del proyecto: insulae2.0 guarda la URL completa (Firebase); se conserva la ruta legacy por si llega solo el nombre. */
function projectLogoUrl(proyecto: ProjectInfo | null): string {
  if (!proyecto?.logo) return "https://encuesta.sistemasabanza.com/logo_dark.png";
  return /^https?:\/\//.test(proyecto.logo)
    ? proyecto.logo
    : `https://sistemasabanza.com/insulae/imagenes/proyectos/logo/${proyecto.logo}`;
}

export function ResetPasswordView({
  token,
  proyecto,
  initialTokenValid,
  initialError,
}: {
  token: string | null;
  proyecto: ProjectInfo | null;
  /** Validado en el servidor (page.tsx): null si no llegó token. */
  initialTokenValid: boolean | null;
  initialError: string;
}) {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(initialError);
  const tokenValid = initialTokenValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      const data = await resetPasswordAction({ token: token || '', newPassword: password });

      if (data.success) {
        setMessage('Contraseña actualizada exitosamente. Redirigiendo...');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push(msPath('/login'));
        }, 2000);
      } else {
        setError(data.message || 'Error al actualizar la contraseña');
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while validating token (con validación en servidor solo ocurre si llega sin token)
  if (tokenValid === null && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-canvas via-white to-gold-soft">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-gray-200 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cba258] mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Verificando enlace</h2>
          <p className="text-gray-600">Validando tu solicitud de cambio de contraseña...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-canvas via-white to-gold-soft">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-gray-200 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Enlace inválido</h2>
          <p className="text-gray-600 mb-6">Este enlace no es válido o ha expirado.</p>
          <Link href={msPath("/forgot-password")} className="text-[#cba258] hover:text-[#bca065] font-medium">
            Solicitar nuevo enlace →
          </Link>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-canvas via-white to-gold-soft">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-gray-200 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Token expirado</h2>
          <p className="text-gray-600 mb-6">Este enlace ha expirado por razones de seguridad.</p>
          <Link href={msPath("/forgot-password")} className="text-[#cba258] hover:text-[#bca065] font-medium">
            Solicitar nuevo enlace →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-canvas via-white to-gold-soft px-8 lg:px-16 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        <div className="absolute top-20 left-10 w-32 h-32 bg-brand-mint rounded-full opacity-20 blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gold-soft rounded-full opacity-20 blur-xl"></div>

        <div className="max-w-md w-full z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg border border-white/20 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={projectLogoUrl(proyecto)}
                alt={proyecto?.nombre || "Logo"}
                width={200}
                height={64}
                className="mx-auto"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-3 tracking-wide">
              INSULAE
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[#cba258] to-[#cba258] mx-auto mb-4 rounded-full"></div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-3">
              Nueva Contraseña
            </h1>
            <p className="text-gray-600 text-lg">
              Ingresa tu nueva contraseña
            </p>
          </div>

          {/* Form */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg className="h-5 w-5 text-[#1E3932]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full pl-10 pr-3 py-4 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <svg className="h-5 w-5 text-[#1E3932]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="w-full pl-10 pr-3 py-4 border border-gray-200 rounded-xl placeholder-gray-400 text-gray-900 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#cba258] focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Actualizando...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Actualizar contraseña</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link href={msPath("/login")} className="text-sm text-[#cba258] hover:text-[#bca065] font-medium transition-colors duration-200">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Info */}
      <div className="flex-1 bg-gradient-to-br from-[#122420] via-brand-deep to-[#2d5249] flex flex-col justify-center items-center px-8 lg:px-16 py-12 lg:py-0 text-white relative overflow-hidden min-h-[50vh] lg:min-h-screen">
        <div className="max-w-md w-full text-center z-10">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#cba258] to-[#cba258] rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Nueva Contraseña Segura
            </h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Establece una contraseña fuerte y segura para proteger tu cuenta. Asegúrate de usar al menos 8 caracteres.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-start space-x-3">
                <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] rounded-xl p-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1">Fuerte</h4>
                  <p className="text-xs text-gray-400">Mínimo 8 caracteres</p>
                </div>
              </div>
            </div>

            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-start space-x-3">
                <div className="bg-gradient-to-r from-[#bca065] to-[#cba258] rounded-xl p-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1">Única</h4>
                  <p className="text-xs text-gray-400">Enlace de un solo uso</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-xs text-gray-500">
            © 2025 INSULAE. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}
