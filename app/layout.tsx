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
      </body>
    </html>
  );
}
