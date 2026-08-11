import Image from "next/image";
import { CarIllustration } from "@/components/car-illustration";

export function ListingGallery({
  photos,
  alt,
}: {
  photos: string[];
  alt: string;
}) {
  const photo = photos[0];

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
      {photo ? (
        <Image src={photo} alt={alt} fill className="object-cover" />
      ) : (
        <CarIllustration className="h-full w-full" />
      )}
    </div>
  );
}
