"use client";

import { useRef, useState } from "react";
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
  const trackRef = useRef<HTMLDivElement>(null);

  function goTo(index: number) {
    setActiveIndex(index);
    const slide = trackRef.current?.children[index];
    slide?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={trackRef}
        className="flex aspect-[4/3] w-full snap-x snap-mandatory overflow-x-auto rounded-lg bg-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.length > 0 ? (
          photos.map((photo, index) => (
            <div
              key={photo}
              className="relative h-full w-full shrink-0 snap-start"
            >
              <Image
                src={photo}
                alt={alt}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </div>
          ))
        ) : (
          <CarIllustration className="h-full w-full shrink-0" />
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              onClick={() => goTo(index)}
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
