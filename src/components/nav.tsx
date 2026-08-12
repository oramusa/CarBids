import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { AuctionsNavDropdown } from "@/components/auctions-nav-dropdown";

const INERT_LINKS = ["Community", "Events", "About Us", "Leaderboard"];

export async function Nav() {
  const session = await getCurrentUser();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Car Bids
        </Link>

        <nav className="flex items-center gap-4">
          <AuctionsNavDropdown />
          <Link
            href="/sell"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sell your car
          </Link>
          {INERT_LINKS.map((label) => (
            <span key={label} className="cursor-default text-sm text-muted-foreground">
              {label}
            </span>
          ))}
        </nav>

        <form action="/" className="relative ml-auto hidden max-w-xs flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder="Search for cars (ex. BMW, Porsche)"
            className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </form>

        <div className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {session.profile?.username ?? session.user.email}
              </span>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
