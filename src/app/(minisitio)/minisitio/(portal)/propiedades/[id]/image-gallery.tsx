"use client";

import { useState } from "react";
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

/** Galería de imágenes del área privativa (antes `components/ImageGallery.js`). */
export function ImageGallery({
  images = [],
  title = "Imágenes del Área Privativa",
}: {
  images?: GalleryImage[];
  title?: string;
}) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">No hay imágenes disponibles para esta propiedad</p>
        </div>
      </div>
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

  const nextImage = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(images[nextIndex]);
  };

  const prevImage = () => {
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    setSelectedImage(images[prevIndex]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "ArrowRight") {
      nextImage();
    } else if (e.key === "ArrowLeft") {
      prevImage();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {images.length} imagen{images.length !== 1 ? "es" : ""} disponible{images.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className="relative group cursor-pointer aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
              onClick={() => openModal(image, index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- URLs remotas (Firebase) sin optimizar, como el legacy */}
              <img
                src={image.full_url}
                alt={image.descripcion || `Imagen ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={handleImageError}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              {image.descripcion && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-white text-xs truncate">{image.descripcion}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal para imagen ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={closeModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
            {/* Botón cerrar */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navegación anterior */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Imagen principal */}
            <div className="relative max-w-full max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- URLs remotas (Firebase) sin optimizar, como el legacy */}
              <img
                src={selectedImage.full_url}
                alt={selectedImage.descripcion || "Imagen ampliada"}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
                onError={handleImageError}
              />
              {selectedImage.descripcion && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-4 rounded-b-lg">
                  <p className="text-center">{selectedImage.descripcion}</p>
                </div>
              )}
            </div>

            {/* Navegación siguiente */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Contador de imágenes */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
