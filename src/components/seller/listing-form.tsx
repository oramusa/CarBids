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
import { decodeVin } from "@/app/sell/vin-actions";

const schema = z.object({
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().min(0),
  vin: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().max(80).optional(),
  description: z.string().min(20, "Tell buyers a bit more (20+ characters)"),
  dealerOnly: z.boolean().optional(),
  accidentSeverity: z.enum(["none", "minor", "major"]).optional(),
  accidentDetails: z.string().optional(),
  titleStatus: z.enum(["clean", "salvage", "rebuilt", "lemon", "other"]).optional(),
  numberOfOwners: z.string().optional(),
  serviceHistory: z.string().optional(),
  transmission: z.enum(["automatic", "manual", "cvt", "other"]).optional(),
  bodyStyle: z
    .enum([
      "coupe",
      "sedan",
      "suv",
      "truck",
      "convertible",
      "wagon",
      "hatchback",
      "van",
      "other",
    ])
    .optional(),
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
      currentStatus: "draft" | "pending_review";
    };

/** Both create and edit-while-draft offer these two save targets. */
const canChooseDraft = (props: ListingFormProps) =>
  props.mode === "create" || props.currentStatus === "draft";

export function ListingForm(props: ListingFormProps) {
  const router = useRouter();
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [targetStatus, setTargetStatus] = useState<
    "draft" | "pending_review"
  >("pending_review");
  const [vinStatus, setVinStatus] = useState<
    "idle" | "decoding" | "error"
  >("idle");
  const [vinError, setVinError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: props.mode === "edit" ? props.defaultValues : undefined,
  });

  async function handleDecodeVin() {
    const vin = getValues("vin");
    if (!vin) {
      setVinError("Enter a VIN first");
      setVinStatus("error");
      return;
    }

    setVinStatus("decoding");
    setVinError(null);
    const result = await decodeVin(vin);

    if ("error" in result) {
      setVinError(result.error);
      setVinStatus("error");
      return;
    }

    setValue("make", result.make, { shouldValidate: true });
    setValue(
      "model",
      result.trim ? `${result.model} ${result.trim}` : result.model,
      { shouldValidate: true }
    );
    if (result.year) setValue("year", result.year, { shouldValidate: true });
    setVinStatus("idle");
  }

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

    const status = canChooseDraft(props) ? targetStatus : "pending_review";
    const {
      dealerOnly,
      accidentSeverity,
      accidentDetails,
      titleStatus,
      numberOfOwners,
      serviceHistory,
      transmission,
      bodyStyle,
      ...rest
    } = values;
    const parsedOwners = numberOfOwners ? Number(numberOfOwners) : null;

    if (props.mode === "create") {
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          ...rest,
          dealer_only: dealerOnly ?? false,
          accident_severity: accidentSeverity ?? "none",
          accident_details: accidentDetails || null,
          title_status: titleStatus ?? "clean",
          number_of_owners: parsedOwners,
          service_history: serviceHistory || null,
          transmission: transmission || null,
          body_style: bodyStyle || null,
          seller_id: user.id,
          photos: newPhotoUrls,
          status,
        })
        .select()
        .single();

      if (error) {
        setSubmitError(error.message);
        setSubmitting(false);
        return;
      }

      router.push(
        status === "draft"
          ? "/sell/dashboard?tab=drafts"
          : `/sell/submitted?listing=${listing.id}`
      );
      return;
    }

    // Edit mode — RLS only allows this while the listing is still draft or
    // pending_review (see the "sellers can update their own draft or
    // pending listings" policy).
    const { error } = await supabase
      .from("listings")
      .update({
        ...rest,
        dealer_only: dealerOnly ?? false,
        accident_severity: accidentSeverity ?? "none",
        accident_details: accidentDetails || null,
        title_status: titleStatus ?? "clean",
        number_of_owners: parsedOwners,
        service_history: serviceHistory || null,
        transmission: transmission || null,
        body_style: bodyStyle || null,
        photos: [...props.existingPhotos, ...newPhotoUrls],
        status,
      })
      .eq("id", props.listingId);

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    router.push(
      status === "draft" ? "/sell/dashboard?tab=drafts" : "/sell/dashboard"
    );
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
          <div className="flex gap-2">
            <Input id="vin" {...register("vin")} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDecodeVin}
              disabled={vinStatus === "decoding"}
            >
              {vinStatus === "decoding" ? "Decoding…" : "Decode"}
            </Button>
          </div>
          {vinStatus === "error" && vinError && (
            <p className="text-xs text-destructive">{vinError}</p>
          )}
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
        <Label htmlFor="accidentSeverity">Accident history</Label>
        <select
          id="accidentSeverity"
          {...register("accidentSeverity")}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="none">None</option>
          <option value="minor">Minor accident(s)</option>
          <option value="major">Major accident / frame damage</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Self-reported by you — not independently verified.
        </p>
        <textarea
          {...register("accidentDetails")}
          rows={2}
          placeholder="Optional details (what happened, when, repairs made)"
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="transmission">Transmission (optional)</Label>
          <select
            id="transmission"
            {...register("transmission")}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">Unspecified</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
            <option value="cvt">CVT</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bodyStyle">Body style (optional)</Label>
          <select
            id="bodyStyle"
            {...register("bodyStyle")}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">Unspecified</option>
            <option value="coupe">Coupe</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="truck">Truck</option>
            <option value="convertible">Convertible</option>
            <option value="wagon">Wagon</option>
            <option value="hatchback">Hatchback</option>
            <option value="van">Van</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="titleStatus">Title status</Label>
          <select
            id="titleStatus"
            {...register("titleStatus")}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="clean">Clean</option>
            <option value="salvage">Salvage</option>
            <option value="rebuilt">Rebuilt</option>
            <option value="lemon">Lemon</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="numberOfOwners">Number of owners (optional)</Label>
          <Input
            id="numberOfOwners"
            type="number"
            min="1"
            {...register("numberOfOwners")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="serviceHistory">Service history (optional)</Label>
        <textarea
          id="serviceHistory"
          {...register("serviceHistory")}
          rows={3}
          placeholder="Maintenance performed, when, by whom (self-reported)"
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("dealerOnly")} className="size-4" />
        Dealer-only auction (only visible to verified buyers)
      </label>

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

      <div className="flex gap-2">
        {canChooseDraft(props) && (
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            onClick={() => setTargetStatus("draft")}
          >
            {submitting && targetStatus === "draft"
              ? "Saving…"
              : "Save as draft"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          onClick={() => setTargetStatus("pending_review")}
        >
          {submitting && targetStatus === "pending_review"
            ? "Saving…"
            : props.mode === "edit" && !canChooseDraft(props)
              ? "Save changes"
              : "Submit for review"}
        </Button>
      </div>
    </form>
  );
}
