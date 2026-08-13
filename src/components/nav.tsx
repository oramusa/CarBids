import Link from "next/link";
import { Search, Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { AuctionsNavDropdown } from "@/components/auctions-nav-dropdown";
import { createClient } from "@/lib/supabase/server";

const INERT_LINKS = ["Leaderboard"];

export async function Nav() {
  const session = await getCurrentUser();

  let unreadCount = 0;
  if (session) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .is("read_at", null);
    unreadCount = count ?? 0;
  }

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
          <Link
            href="/community"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Community
          </Link>
          <Link
            href="/events"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Events
          </Link>
          <Link
            href="/about"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            About Us
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
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                My Bids
              </Link>
              {session.profile?.is_admin && (
                <Link
                  href="/admin"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/notifications"
                className="relative text-muted-foreground hover:text-foreground"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/sell/dashboard"
                className="text-sm font-medium hover:underline"
              >
                {session.profile?.username ?? session.user.email}
              </Link>
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
