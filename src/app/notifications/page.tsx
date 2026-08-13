import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { describeNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";

export default async function NotificationsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, type, payload, read_at, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const hasUnread = notifications?.some((n) => !n.read_at) ?? false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <Button variant="outline" size="sm" type="submit">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load notifications: {error.message}
        </p>
      )}

      {!error && (!notifications || notifications.length === 0) && (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No notifications yet. You&apos;ll see updates here when you&apos;re
            outbid, an auction you&apos;re watching is ending soon, and more.
          </p>
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {notifications?.map((n) => (
          <li
            key={n.id}
            className={
              "flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3 " +
              (n.read_at ? "bg-card" : "bg-accent")
            }
          >
            <div>
              <p className="text-sm">
                {describeNotification(
                  n.type,
                  (n.payload as Record<string, unknown>) ?? {}
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.read_at && (
              <form action={markNotificationRead.bind(null, n.id)}>
                <Button variant="ghost" size="sm" type="submit">
                  Mark read
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
