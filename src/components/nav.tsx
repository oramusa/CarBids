import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export async function Nav() {
  const session = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Car Bids
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Browse
          </Link>
          <Link
            href="/sell"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sell your car
          </Link>
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
        </nav>
      </div>
    </header>
  );
}
