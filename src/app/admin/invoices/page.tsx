import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markInvoicePaid } from "@/app/admin/invoices/actions";

export default async function AdminInvoicesPage() {
  const session = await getCurrentUser();
  if (!session?.profile?.is_admin) redirect("/");

  const supabase = await createClient();
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(
      `id, winning_bid, buyer_premium, total_due, status, created_at,
       buyer:profiles!invoices_buyer_id_fkey (username),
       auction:auctions (listing:listings (id, make, model, year))`
    )
    .order("created_at", { ascending: false });

  const totalOwed = (invoices ?? [])
    .filter((i) => i.status === "unpaid")
    .reduce((sum, i) => sum + i.total_due, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatCurrency(totalOwed)} outstanding across{" "}
        {(invoices ?? []).filter((i) => i.status === "unpaid").length} unpaid
        invoice(s).
      </p>

      {error && (
        <p className="mt-8 text-sm text-destructive">
          Couldn&apos;t load invoices: {error.message}
        </p>
      )}

      {!error && (!invoices || invoices.length === 0) && (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-2">
        {invoices?.map((invoice) => {
          const auction = Array.isArray(invoice.auction)
            ? invoice.auction[0]
            : invoice.auction;
          const listing = auction
            ? Array.isArray(auction.listing)
              ? auction.listing[0]
              : auction.listing
            : null;
          const buyer = Array.isArray(invoice.buyer)
            ? invoice.buyer[0]
            : invoice.buyer;

          return (
            <li
              key={invoice.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {listing
                    ? `${listing.year} ${listing.make} ${listing.model}`
                    : "Listing"}{" "}
                  · {buyer?.username ?? "buyer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(invoice.winning_bid)} winning bid +{" "}
                  {formatCurrency(invoice.buyer_premium)} premium ={" "}
                  {formatCurrency(invoice.total_due)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={invoice.status === "paid" ? "default" : "outline"}>
                  {invoice.status}
                </Badge>
                {invoice.status === "unpaid" && (
                  <form action={markInvoicePaid.bind(null, invoice.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Mark paid
                    </Button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
