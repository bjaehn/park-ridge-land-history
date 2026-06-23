import type { Metadata } from "next";
import { ConditionalTopNav } from "./_components/ConditionalTopNav";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/content";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  metadataBase: new URL("https://parkridgelandhistory.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/maplibre-gl.css" />
      </head>
      <body>
        <ConditionalTopNav />
        <main>{children}</main>
        <footer className="border-t border-surface-border mt-auto py-8 text-sm text-text-muted">
          <div className="max-w-content mx-auto px-page-x flex flex-wrap gap-x-6 gap-y-2 items-center">
            <span>© {new Date().getFullYear()} Park Ridge Land History</span>
            <a href="/about" className="hover:text-text-secondary transition-colors">About</a>
            <a href="/sources" className="hover:text-text-secondary transition-colors">Data sources</a>
            <a href="mailto:bjaehn@gmail.com" className="hover:text-text-secondary transition-colors">Contact</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
