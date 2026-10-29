"use client";

/**
 * Modal del aviso de privacidad que el portal muestra si el condómino no lo ha aceptado.
 * Hoy no existe campo de aceptación en la base y el login lo da por aceptado (igual que el
 * minisitio independiente), así que en la práctica no aparece; se conserva listo para cuando
 * se persista la aceptación. El texto llega del servidor (`notice`).
 */
import { useState } from "react";
import { acceptPrivacyNoticeAction } from "@/app/(minisitio)/minisitio/_actions/auth";

export default function PrivacyNoticeModal({
    notice,
    onAccept,
    onCancel,
}: {
    notice: string;
    onAccept?: () => void;
    onCancel?: () => void;
}) {
    const privacyNotice = notice || "";
    const loading = false;
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState("");

    const handleAccept = async () => {
        setAccepting(true);
        setError("");
        try {
            const data = await acceptPrivacyNoticeAction();
            if (data.success) {
                onAccept?.();
            } else {
                setError(data.message || "Error al aceptar el aviso de privacidad");
                setAccepting(false);
            }
        } catch (error) {
            console.error("Error accepting privacy notice:", error);
            setError("Error de conexión. Intenta nuevamente.");
            setAccepting(false);
        }
    };

    const handleCancel = () => {
        onCancel?.();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 relative overflow-hidden">
                {/* Header con gradiente dorado */}
                <div className="bg-gradient-to-r from-[#cba258] to-[#cba258] p-6 text-white">
                    <div className="flex items-center justify-center mb-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-center mb-2">
                        Aviso de Privacidad
                    </h2>
                    <p className="text-white/90 text-center text-sm">
                        Por favor, lee y acepta nuestro aviso de privacidad para continuar usando el sistema
                    </p>
                </div>

                {/* Contenido del aviso */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#cba258] mb-4"></div>
                            <p className="text-gray-600">Cargando aviso de privacidad...</p>
                        </div>
                    ) : error && !privacyNotice ? (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2">
                            <svg
                                className="h-5 w-5 text-red-400 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>{error}</span>
                        </div>
                    ) : (
                        <div className="prose max-w-none">
                            {privacyNotice ? (
                                <div
                                    className="text-gray-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: privacyNotice }}
                                />
                            ) : (
                                <div className="text-gray-600">
                                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                        Aviso de Privacidad - Insulae
                                    </h3>
                                    <p className="mb-4">
                                        Este aviso de privacidad describe cómo recopilamos, utilizamos y protegemos
                                        su información personal en el sistema Insulae.
                                    </p>
                                    <p className="mb-4">
                                        Al utilizar este sistema, usted acepta el tratamiento de sus datos personales
                                        conforme a las políticas establecidas por el condominio.
                                    </p>
                                    <p>
                                        Para más información, puede contactar al administrador del sistema.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Error message */}
                {error && privacyNotice && (
                    <div className="px-6 pb-4">
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center space-x-2">
                            <svg
                                className="h-5 w-5 text-red-400 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Footer con botones */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={accepting}
                        className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar y cerrar sesión
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={accepting || loading}
                        className="px-8 py-3 bg-gradient-to-r from-[#cba258] to-[#cba258] hover:from-[#bca065] hover:to-[#bca065] text-white rounded-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                    >
                        {accepting ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Procesando...</span>
                            </div>
                        ) : (
                            <span className="flex items-center justify-center space-x-2">
                                <span>Acepto el Aviso de Privacidad</span>
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
