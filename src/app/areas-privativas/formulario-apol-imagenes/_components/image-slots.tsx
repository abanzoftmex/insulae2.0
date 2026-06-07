"use client";

import { useState } from "react";
import { Loader2, FileText, Trash2, Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uploadCondominiumAsset, deleteCondominiumAsset } from "@/shared/infrastructure/storage/firebase-client";
import { savePrivateAreaImageAction, deletePrivateAreaImageAction } from "../../actions";
import { cn } from "@/shared/utils/cn";

export interface DBImage {
  id: string;
  url: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  slotIndex: number;
}

interface ImageSlotsProps {
  privateAreaId: string;
  condominiumId: string;
  condominiumSlug: string;
  initialImages: DBImage[];
}

export function ImageSlots({ privateAreaId, condominiumId, condominiumSlug, initialImages }: ImageSlotsProps) {
  const [images, setImages] = useState<Record<number, DBImage>>(() => {
    const map: Record<number, DBImage> = {};
    initialImages.forEach((img) => {
      map[img.slotIndex] = img;
    });
    return map;
  });

  const [uploading, setUploading] = useState<Record<number, boolean>>({});

  const handleFileChange = async (slotIndex: number, file: File | undefined) => {
    if (!file) return;

    setUploading((prev) => ({ ...prev, [slotIndex]: true }));
    try {
      // 1. Upload to Firebase Storage
      const { url } = await uploadCondominiumAsset({
        file,
        condominiumSlug,
        projectId: privateAreaId,
        kind: "private-area-document",
      });

      // 2. Save reference in Postgres database via server action
      await savePrivateAreaImageAction({
        privateAreaId,
        condominiumId,
        url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        slotIndex,
      });

      // 3. Update local state
      const newImage: DBImage = {
        id: "", 
        url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        slotIndex,
      };

      setImages((prev) => ({ ...prev, [slotIndex]: newImage }));
    } catch (error) {
      console.error("Failed to upload file:", error);
      alert("Hubo un error al subir el archivo. Por favor, intenta de nuevo.");
    } finally {
      setUploading((prev) => ({ ...prev, [slotIndex]: false }));
    }
  };

  const handleDelete = async (slotIndex: number) => {
    const target = images[slotIndex];
    if (!target) return;

    if (!confirm("¿Estás seguro de que deseas eliminar este archivo?")) {
      return;
    }

    setUploading((prev) => ({ ...prev, [slotIndex]: true }));
    try {
      // 1. Delete from Firebase Storage
      await deleteCondominiumAsset(target.url);

      // 2. Delete from Postgres database via server action
      await deletePrivateAreaImageAction({
        privateAreaId,
        slotIndex,
      });

      // 3. Update local state
      setImages((prev) => {
        const copy = { ...prev };
        delete copy[slotIndex];
        return copy;
      });
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Hubo un error al eliminar el archivo.");
    } finally {
      setUploading((prev) => ({ ...prev, [slotIndex]: false }));
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => {
        const image = images[index];
        const isUploading = uploading[index];
        const isPDF = image?.mimeType === "application/pdf" || image?.fileName.toLowerCase().endsWith(".pdf");

        return (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-line bg-card shadow-sm flex flex-col justify-between"
          >
            <div className="relative flex h-36 flex-col items-center justify-center bg-canvas/30 group">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-brand">Subiendo...</p>
                </div>
              ) : image ? (
                isPDF ? (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <FileText className="h-10 w-10 text-rose-500" />
                    <p className="text-xs font-bold text-ink truncate max-w-[200px]" title={image.fileName}>
                      {image.fileName}
                    </p>
                    <p className="text-[9px] text-ink-soft/60 uppercase">Documento PDF</p>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.fileName}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-[10px] text-white font-bold uppercase tracking-widest px-2 text-center truncate max-w-[90%]">
                        {image.fileName}
                      </p>
                    </div>
                  </>
                )
              ) : (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 hover:bg-canvas/50 transition-colors">
                  <Upload className="h-6 w-6 text-ink-soft/40" />
                  <p className="text-[9px] font-bold uppercase tracking-widest text-ink-soft/50">
                    Cargar Imagen / PDF
                  </p>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(index, e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 bg-canvas/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-soft/80">
                Slot {index + 1}
              </p>

              {image && !isUploading ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-7 w-7 p-0 rounded-full border border-line hover:bg-brand-mint/20 hover:text-brand"
                  >
                    <a href={image.url} target="_blank" rel="noopener noreferrer" title="Ver / Descargar">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    className="h-7 w-7 p-0 rounded-full border border-line text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest">
                  {isUploading ? "Procesando" : "Pendiente"}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
