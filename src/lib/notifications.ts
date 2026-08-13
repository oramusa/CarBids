import { formatCurrency } from "@/lib/format";

type NotificationPayload = Record<string, unknown>;

/** Human-readable message for a notification, based on its type + payload. */
export function describeNotification(
  type: string,
  payload: NotificationPayload
): string {
  switch (type) {
    case "outbid":
      return `You've been outbid — new high bid ${formatCurrency(
        typeof payload.amount === "number" ? payload.amount : null
      )}.`;
    case "ending_soon":
      return "An auction you're watching is ending soon.";
    case "auction_won":
      return "You won an auction! The seller will be in touch.";
    case "auction_sold":
      return "Your listing sold.";
    case "comment_reply":
      return "Someone replied to your comment.";
    case "listing_approved":
      return "Your listing was approved and scheduled for auction.";
    case "listing_rejected":
      return "Your listing was rejected.";
    default:
      return "You have a new notification.";
  }
}
