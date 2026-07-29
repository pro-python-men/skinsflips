"use client";

import { Boxes } from "lucide-react";
import { useLocalSkinImage } from "@/lib/skin-images";

type LocalSkinImageProps = {
  name: string;
  alt?: string;
  containerClassName?: string;
  imageClassName?: string;
  placeholderLabel?: string;
};

export function LocalSkinImage({
  name,
  alt,
  containerClassName = "",
  imageClassName = "",
  placeholderLabel = "Skin",
}: LocalSkinImageProps) {
  const src = useLocalSkinImage(name);

  return (
    <div className={containerClassName}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={imageClassName}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/34">
          <Boxes className="h-5 w-5" />
          <span className="text-[9px] uppercase tracking-[0.18em]">{placeholderLabel}</span>
        </div>
      )}
    </div>
  );
}
