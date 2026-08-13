import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ListingForm } from "@/components/seller/listing-form";

export default function SellPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>List your car</CardTitle>
          <CardDescription>
            Submissions are reviewed before going live. Once approved, an
            auction will be scheduled for your listing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListingForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
