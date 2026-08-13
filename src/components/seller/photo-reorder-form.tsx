"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Star, X } from "lucide-react";
import { reorderListingPhotos } from "@/app/sell/[id]/photos/actions";
import { createClient } from "@/lib/supabase/client";
import { buildPhotoPath } from "@/lib/photo-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [uploading, setUploading] = useState(false);
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

  function removePhoto(index: number) {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    save(next);
  }

  async function addPhotos(files: FileList) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to sign in to upload photos.");
        return;
      }

      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const path = buildPhotoPath(user.id, file.name);
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, file);
        if (uploadError) {
          setError(`Photo upload failed: ${uploadError.message}`);
          return;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-photos").getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }

      const next = [...photos, ...uploadedUrls];
      setPhotos(next);
      save(next);
    } catch (err) {
      setError(
        `Photo upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Drag to reorder, hover a photo and click the star to swap it into
        the cover position, or click the × to remove it. Changes save
        automatically.
      </p>

      {photos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This listing has no photos yet.
        </p>
      )}

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
            <button
              type="button"
              onClick={() => removePhoto(index)}
              aria-label="Remove photo"
              title="Remove photo"
              className="absolute bottom-1 right-1 rounded-full bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="addPhotos">Add photos</Label>
        <Input
          id="addPhotos"
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) addPhotos(files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex items-center gap-3 text-xs">
        {uploading && <span className="text-muted-foreground">Uploading…</span>}
        {!uploading && isPending && (
          <span className="text-muted-foreground">Saving…</span>
        )}
        {!uploading && !isPending && savedAt && (
          <span className="text-muted-foreground">Saved</span>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>
    </div>
  );
}
