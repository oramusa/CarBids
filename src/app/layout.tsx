import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Note: this project intentionally uses the system font stack (see
// globals.css) instead of next/font/google, so the build doesn't depend on
// reaching fonts.googleapis.com. Swap in next/font/google (e.g. Geist) if
// you want a custom webfont — it works fine anywhere with normal internet
// access, it just isn't reachable from this sandbox.

export const metadata: Metadata = {
  title: "Car Bids",
  description: "Bid on enthusiast cars in live online auctions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
