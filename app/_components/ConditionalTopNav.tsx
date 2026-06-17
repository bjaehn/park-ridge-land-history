"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/TopNav";

export function ConditionalTopNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <TopNav />;
}
