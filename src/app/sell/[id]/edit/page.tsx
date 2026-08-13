import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingForm } from "@/components/seller/listing-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";

export default async function EditListingPage(
  props: PageProps<"/sell/[id]/edit">
) {
  const { id } = await props.params;
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("seller_id", session.user.id)
    .single();

  if (!listing) notFound();

  const isEditable = listing.status === "draft" || listing.status === "pending_review";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit listing</CardTitle>
          <CardDescription>
            {listing.status === "draft" &&
              "This is a draft — save it as a draft again or submit it for review whenever you're ready."}
            {listing.status === "pending_review" &&
              "You can edit this listing until it's approved and scheduled for auction."}
            {!isEditable &&
              "This listing can no longer be edited — it's past the pending review stage."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditable ? (
            <ListingForm
              mode="edit"
              listingId={listing.id}
              currentStatus={listing.status as "draft" | "pending_review"}
              existingPhotos={listing.photos ?? []}
              defaultValues={{
                make: listing.make,
                model: listing.model,
                year: listing.year,
                mileage: listing.mileage,
                vin: listing.vin ?? "",
                condition: listing.condition ?? "",
                location: listing.location ?? "",
                description: listing.description,
              }}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
