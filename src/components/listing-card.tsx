import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/auction/countdown";
import { formatCurrency, getUrgencyLevel } from "@/lib/format";
import { CarIllustration } from "@/components/car-illustration";
import { MapPin } from "lucide-react";

export type ListingCardData = {
  id: string;
  make: string;
  model: string;
  year: number;
  photos: string[];
  location: string | null;
  auction: {
    id: string;
    end_time: string;
    current_high_bid: number | null;
    reserve_price: number | null;
    reserve_met: boolean;
  } | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const auction = listing.auction;
  const photo = listing.photos[0];

  const urgencyLevel = auction ? getUrgencyLevel(auction.end_time) : "ended";
  const urgencyBarClass = {
    plenty: "bg-urgency-plenty",
    soon: "bg-primary",
    urgent: "bg-destructive",
    ended: "bg-muted",
  }[urgencyLevel];

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] w-full bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={`${listing.year} ${listing.make} ${listing.model}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <CarIllustration className="h-full w-full" />
          )}
        </div>
        <div className={`h-[3px] w-full ${urgencyBarClass}`} />
        <CardContent className="pt-4">
          <h3 className="font-semibold">
            {listing.year} {listing.make} {listing.model}
          </h3>
          {listing.location && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <MapPin className="size-3" />
              <span className="truncate">{listing.location}</span>
            </div>
          )}
          {auction && (
            <div className="mt-1 flex items-center gap-2">
              {auction.reserve_price != null && (
                <Badge variant={auction.reserve_met ? "default" : "outline"}>
                  {auction.reserve_met ? "Reserve met" : "Reserve not met"}
                </Badge>
              )}
              {auction.reserve_price == null && (
                <Badge variant="secondary">No reserve</Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between pb-4">
          <div>
            <div className="text-xs text-muted-foreground">Current bid</div>
            <div className="font-semibold">
              {formatCurrency(auction?.current_high_bid)}
            </div>
          </div>
          {auction && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Ends in</div>
              <Countdown endTime={auction.end_time} />
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
