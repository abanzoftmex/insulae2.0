"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X, ZoomIn } from "lucide-react";
import type { PropertyDetail } from "@/modules/minisitio/infrastructure/queries/properties.queries";

type GalleryImage = PropertyDetail["images"][number];

const PLACEHOLDER_IMAGE = "/placeholder-image.svg";

/** Si la imagen falla, muestra el placeholder (una sola vez: evita un bucle si también falla). */
function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.endsWith(PLACEHOLDER_IMAGE)) return;
  img.src = PLACEHOLDER_IMAGE;
  img.alt = "Imagen no disponible";
}

/** Galería de imágenes del área privativa (antes `components/ImageGallery.js`). El visor se
 *  maneja con el teclado (← → para cambiar, Esc para cerrar) y bloquea el scroll de atrás. */
export function ImageGallery({
  images = [],
  title = "Imágenes del Área Privativa",
}: {
  images?: GalleryImage[];
  title?: string;
}) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = selectedImage !== null;
  const closeRef = useRef<HTMLButtonElement>(null);

  // Mientras el visor está abierto: teclas globales (antes dependían de que el velo tuviera el
  // foco, cosa que nunca pasaba), foco en "Cerrar" y la página de atrás quieta.
  useEffect(() => {
    if (!open) return;
    const previo = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
      else if (e.key === "ArrowRight") setCurrentIndex((i) => (i + 1) % images.length);
      else if (e.key === "ArrowLeft") setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previo?.focus?.({ preventScroll: true });
    };
  }, [open, images.length]);

  if (!images || images.length === 0) {
    return (
      <section className="rounded-2xl border border-stroke-2 bg-card p-5 sm:p-6">
        <h3 className="text-[16px] font-semibold text-fg">{title}</h3>
        <div className="py-10 text-center">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3 text-fg-4">
            <ImageIcon aria-hidden className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <p className="text-[13.5px] text-fg-3">No hay imágenes disponibles para esta propiedad</p>
        </div>
      </section>
    );
  }

  const openModal = (image: GalleryImage, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setCurrentIndex(0);
  };

  const nextImage = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prevImage = () => setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const actual = open ? images[currentIndex] ?? selectedImage : null;

  const navButton =
    "absolute z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white outline-none backdrop-blur-sm transition-colors duration-150 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/80";

  return (
    <section className="overflow-hidden rounded-2xl border border-stroke-2 bg-card">
      <div className="border-b border-stroke-3 px-5 py-4 sm:px-6">
        <h3 className="text-[16px] font-semibold text-fg">{title}</h3>
        <p className="mt-0.5 text-[13px] text-fg-3">
          {images.length} imagen{images.length !== 1 ? "es" : ""} disponible{images.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => openModal(image, index)}
                aria-label={`Ampliar ${image.descripcion || `imagen ${index + 1}`}`}
                className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-surface-3 outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- archivos de /api/archivos (redirigen a R2) sin optimizar, como el legacy */}
                <img
                  src={image.thumbnail_url || image.full_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                  onError={handleImageError}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                  <ZoomIn aria-hidden className="h-6 w-6 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </span>
                {image.descripcion && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 text-left text-[12px] text-white">
                    <span className="block truncate">{image.descripcion}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Visor de imagen ampliada */}
      {actual && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={actual.descripcion || "Imagen ampliada"}
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeModal}
        >
          <button ref={closeRef} type="button" onClick={closeModal} aria-label="Cerrar" className={`${navButton} right-4 top-4`}>
            <X className="h-5 w-5" strokeWidth={2} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className={`${navButton} left-4`}
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={2} />
            </button>
          )}

          <figure className="relative max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- archivos de /api/archivos (redirigen a R2) sin optimizar, como el legacy */}
            <img
              key={currentIndex}
              src={actual.full_url}
              alt={actual.descripcion || "Imagen ampliada"}
              className="animate-rise-in max-h-[85vh] max-w-full rounded-xl object-contain"
              onError={handleImageError}
            />
            {actual.descripcion && (
              <figcaption className="absolute inset-x-0 bottom-0 rounded-b-xl bg-black/65 p-4 text-center text-[14px] text-white">
                {actual.descripcion}
              </figcaption>
            )}
          </figure>

          {images.length > 1 && (
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className={`${navButton} right-4`}
            >
              <ChevronRight className="h-6 w-6" strokeWidth={2} />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[13px] text-white tabular-nums" aria-live="polite">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ImageGallery;
