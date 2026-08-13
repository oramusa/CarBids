import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { PhotoReorderForm } from "@/components/seller/photo-reorder-form";

export default async function ListingPhotosPage(
  props: PageProps<"/sell/[id]/photos">
) {
  const { id } = await props.params;
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, make, model, year, photos, seller_id")
    .eq("id", id)
    .eq("seller_id", session.user.id)
    .single();

  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            Photos — {listing.year} {listing.make} {listing.model}
          </CardTitle>
          <CardDescription>
            Change the cover photo or reorder the gallery any time, even
            after the auction has gone live.{" "}
            <Link
              href={`/listings/${listing.id}`}
              className="underline hover:text-foreground"
            >
              View listing
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoReorderForm
            listingId={listing.id}
            initialPhotos={listing.photos ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
