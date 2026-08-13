"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { reorderListingPhotos } from "@/app/sell/[id]/photos/actions";

export function PhotoReorderForm({
  listingId,
  initialPhotos,
}: {
  listingId: string;
  initialPhotos: string[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(next: string[]) {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      const result = await reorderListingPhotos(listingId, next);
      if (result.error) {
        setError(result.error);
      } else {
        setSavedAt(Date.now());
      }
    });
  }

  function swapToCover(index: number) {
    const next = [...photos];
    [next[0], next[index]] = [next[index], next[0]];
    setPhotos(next);
    save(next);
  }

  function commitDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...photos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setPhotos(next);
    setDragIndex(null);
    save(next);
  }

  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This listing has no photos to reorder.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Drag to reorder, or hover a photo and click the star to swap it into
        the cover position. Changes save automatically.
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <div
            key={photo}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => commitDrop(index)}
            onDragEnd={() => setDragIndex(null)}
            className={`group relative aspect-square cursor-grab overflow-hidden rounded-md border border-border bg-muted active:cursor-grabbing ${
              dragIndex === index ? "opacity-40" : ""
            }`}
          >
            <Image
              src={photo}
              alt={`Photo ${index + 1}`}
              fill
              className="pointer-events-none object-cover"
              sizes="120px"
            />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => swapToCover(index)}
                aria-label="Set as cover photo"
                title="Set as cover photo"
                className="absolute left-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
              >
                <Star className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs">
        {isPending && <span className="text-muted-foreground">Saving…</span>}
        {!isPending && savedAt && (
          <span className="text-muted-foreground">Saved</span>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>
    </div>
  );
}
