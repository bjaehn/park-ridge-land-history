import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NotFound() {
  return (
    <div className="page-shell max-w-prose">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        subtitle="This page does not exist or may have moved."
      />
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-accent-purple hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
