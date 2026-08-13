"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().min(0),
  vin: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().max(80).optional(),
  description: z.string().min(20, "Tell buyers a bit more (20+ characters)"),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

// Kept outside the component so the lint rule that flags impure calls
// (Date.now, used here only to make the storage path unique) during render
// doesn't apply — this only ever runs from the submit handler.
function buildPhotoPath(userId: string, fileName: string) {
  return `${userId}/${Date.now()}-${fileName}`;
}

type ListingFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      listingId: string;
      defaultValues: FormInput;
      existingPhotos: string[];
    };

export function ListingForm(props: ListingFormProps) {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: props.mode === "edit" ? props.defaultValues : undefined,
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setSubmitError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitError("You need to sign in before listing a car.");
      setSubmitting(false);
      return;
    }

    // Upload any newly-selected photos; on edit these are appended to the
    // listing's existing photos rather than replacing them.
    const newPhotoUrls: string[] = [];
    if (photoFiles) {
      for (const file of Array.from(photoFiles)) {
        const path = buildPhotoPath(user.id, file.name);
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, file);
        if (uploadError) {
          setSubmitError(`Photo upload failed: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-photos").getPublicUrl(path);
        newPhotoUrls.push(publicUrl);
      }
    }

    if (props.mode === "create") {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({ ...values, seller_id: user.id, photos: newPhotoUrls })
        .select()
        .single();

      if (error) {
        setSubmitError(error.message);
        setSubmitting(false);
        return;
      }

      router.push(`/sell/submitted?listing=${listing.id}`);
      return;
    }

    // Edit mode — RLS only allows this while the listing is still
    // pending_review (see "sellers can update their own pending listings").
    const { error } = await supabase
      .from("listings")
      .update({
        ...values,
        photos: [...props.existingPhotos, ...newPhotoUrls],
      })
      .eq("id", props.listingId);

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    router.push("/sell/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="make">Make</Label>
          <Input id="make" {...register("make")} />
          {errors.make && (
            <p className="text-xs text-destructive">{errors.make.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" {...register("model")} />
          {errors.model && (
            <p className="text-xs text-destructive">{errors.model.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="year">Year</Label>
          <Input id="year" type="number" {...register("year")} />
          {errors.year && (
            <p className="text-xs text-destructive">{errors.year.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mileage">Mileage</Label>
          <Input id="mileage" type="number" {...register("mileage")} />
          {errors.mileage && (
            <p className="text-xs text-destructive">
              {errors.mileage.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vin">VIN (optional)</Label>
          <Input id="vin" {...register("vin")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="condition">Condition (optional)</Label>
          <Input id="condition" {...register("condition")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            placeholder="City, State"
            {...register("location")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={6}
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="photos">
          {props.mode === "edit" ? "Add more photos (optional)" : "Photos"}
        </Label>
        <Input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotoFiles(e.target.files)}
        />
      </div>

      {submitError && (
        <p className="text-sm text-destructive">{submitError}</p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting
          ? "Saving…"
          : props.mode === "edit"
            ? "Save changes"
            : "Submit for review"}
      </Button>
    </form>
  );
}
