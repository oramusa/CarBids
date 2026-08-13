import { notFound, redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { approveListing } from "@/app/admin/actions";

export default async function ApproveListingPage(
  props: PageProps<"/admin/[id]/approve">
) {
  const { id } = await props.params;
  const { error } = await props.searchParams;
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, make, model, year, status")
    .eq("id", id)
    .single();

  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            Approve {listing.year} {listing.make} {listing.model}
          </CardTitle>
          <CardDescription>
            {listing.status === "pending_review"
              ? "This schedules a live auction starting now."
              : `This listing is no longer pending review (status: ${listing.status}).`}
          </CardDescription>
        </CardHeader>
        {typeof error === "string" && error && (
          <CardContent className="pt-0">
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Approval failed: {error}
            </p>
          </CardContent>
        )}
        {listing.status === "pending_review" && (
          <CardContent>
            <form action={approveListing.bind(null, listing.id)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="durationDays">Auction length</Label>
                <select
                  id="durationDays"
                  name="durationDays"
                  defaultValue="7"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="3">3 days</option>
                  <option value="5">5 days</option>
                  <option value="7">7 days</option>
                  <option value="10">10 days</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reservePrice">Reserve price (optional)</Label>
                <Input
                  id="reservePrice"
                  name="reservePrice"
                  type="number"
                  min="0"
                  placeholder="No reserve"
                />
              </div>

              <Button type="submit">Approve & go live</Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
