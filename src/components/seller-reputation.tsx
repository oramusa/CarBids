import { Star } from "lucide-react";

export function SellerReputation({
  averageRating,
  reviewCount,
}: {
  averageRating: number | null;
  reviewCount: number;
}) {
  if (reviewCount === 0) {
    return (
      <span className="text-xs text-muted-foreground">No reviews yet</span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="size-3.5 fill-primary text-primary" />
      <span className="font-medium text-foreground">
        {averageRating?.toFixed(1)}
      </span>
      ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
    </span>
  );
}
