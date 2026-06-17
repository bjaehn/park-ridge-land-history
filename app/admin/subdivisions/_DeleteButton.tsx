"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSubdivision } from "../_actions/subdivisions";

export function DeleteSubdivisionButton({ id }: { id: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Permanently delete this subdivision and all its related data?")) return;
    startTransition(() => {
      deleteSubdivision(id).then(() => router.push("/admin/subdivisions"));
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="text-xs text-accent-red border border-accent-red/30 rounded px-3 py-1.5 hover:bg-accent-red/10 transition-colors"
    >
      Delete Subdivision
    </button>
  );
}
