import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:justify-between">
        <div>
          <div className="text-lg font-bold tracking-tight">Car Bids</div>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Bid on enthusiast cars in live online auctions.
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold">Explore</div>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Auctions
              </Link>
            </li>
            <li>
              <Link href="/sell" className="hover:text-foreground">
                Sell a Car
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {year} Car Bids</span>
          <div className="flex gap-4">
            <span className="cursor-default">Terms of Use</span>
            <span className="cursor-default">Privacy Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
