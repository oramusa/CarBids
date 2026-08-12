"use client";

import { useState } from "react";
import Image from "next/image";
import { CarIllustration } from "@/components/car-illustration";
import { cn } from "@/lib/utils";

export function ListingGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
        {activePhoto ? (
          <Image
            key={activePhoto}
            src={activePhoto}
            alt={alt}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <CarIllustration className="h-full w-full" />
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View photo ${index + 1} of ${photos.length}`}
              aria-current={index === activeIndex}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                index === activeIndex
                  ? "border-primary"
                  : "border-transparent hover:border-border"
              )}
            >
              <Image src={photo} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
