"use client";

import Link from "next/link";
import { formatCount } from "@/lib/formatters";

export type TreeSubdivision = {
  id: string;
  name: string;
  recorded_year: number | null;
  parcel_count: number | null;
  confidence_level: string | null;
  parent_subdivision_id: string | null;
};

type TreeNode = TreeSubdivision & { children: TreeNode[] };

// Card dimensions - fixed width so we can calculate connector bar exactly
const NODE_W = 172; // px
const NODE_HALF_W = NODE_W / 2;
const GAP = 20; // px gap between sibling nodes

function NodeCard({ node }: { node: TreeNode }) {
  const isMapped = node.parcel_count != null && node.parcel_count > 0;
  return (
    <Link
      href={`/subdivisions/${encodeURIComponent(node.id)}`}
      className={`group block rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isMapped
          ? "bg-surface-card border-accent-purple/25 hover:border-accent-purple/60"
          : "bg-surface-raised border-surface-border hover:border-surface-border"
      }`}
      style={{ width: NODE_W }}
    >
      <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5 leading-none">
        {node.recorded_year ? `Recorded ${node.recorded_year}` : "Date uncertain"}
      </p>
      <p className="text-sm font-semibold text-text-primary leading-snug mb-2 line-clamp-3">
        {node.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        {node.parcel_count != null ? (
          <span className="text-xs text-text-secondary">
            {formatCount(node.parcel_count, "lot", "lots")}
          </span>
        ) : (
          <span className="text-xs text-text-muted italic">Lots pending</span>
        )}
        {isMapped && (
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple/80 border border-accent-purple/20 leading-none">
            Mapped
          </span>
        )}
      </div>
    </Link>
  );
}

/** Renders one node + its children sub-tree */
function TreeNodeBlock({ node }: { node: TreeNode }) {
  const hasChildren = node.children.length > 0;
  const childrenWidth =
    node.children.length * NODE_W + Math.max(0, node.children.length - 1) * GAP;

  return (
    <div className="flex flex-col items-center" style={{ width: NODE_W }}>
      <NodeCard node={node} />

      {hasChildren && (
        <>
          {/* Vertical line down from this node */}
          <div className="w-px bg-surface-border" style={{ height: 24 }} />

          {/* Horizontal connector bar + children */}
          <div className="relative flex" style={{ gap: GAP, width: childrenWidth }}>
            {/* Horizontal bar spanning from first child center to last child center */}
            {node.children.length > 1 && (
              <div
                className="absolute bg-surface-border"
                style={{ height: 1, top: 0, left: NODE_HALF_W, right: NODE_HALF_W }}
              />
            )}
            {node.children.map((child) => (
              <div
                key={child.id}
                className="flex flex-col items-center"
                style={{ width: NODE_W }}
              >
                {/* Vertical line down from horizontal bar to child card */}
                <div className="w-px bg-surface-border" style={{ height: 24 }} />
                <NodeCard node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SubdivisionTree({ subdivisions }: { subdivisions: TreeSubdivision[] }) {
  // Build parent→children map
  const nodeMap = new Map<string, TreeNode>(
    subdivisions.map((s) => ({ ...s, children: [] })).map((n) => [n.id, n])
  );
  const roots: TreeNode[] = [];

  for (const node of nodeMap.values()) {
    if (node.parent_subdivision_id && nodeMap.has(node.parent_subdivision_id)) {
      nodeMap.get(node.parent_subdivision_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort roots: mapped (has parcel_count) before unmapped, then alphabetically
  roots.sort((a, b) => {
    const aM = a.parcel_count != null ? 0 : 1;
    const bM = b.parcel_count != null ? 0 : 1;
    if (aM !== bM) return aM - bM;
    return a.name.localeCompare(b.name);
  });

  // Sort children within each parent similarly
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  const rootsWidth = roots.length * NODE_W + Math.max(0, roots.length - 1) * GAP;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Virtual root: City of Park Ridge */}
      <div className="rounded-xl border border-accent-purple/30 bg-accent-purple/8 px-5 py-3 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-widest text-accent-purple/50 mb-1 leading-none">
          Incorporated 1873
        </p>
        <p className="text-sm font-bold text-accent-purple">City of Park Ridge</p>
        <p className="text-xs text-accent-purple/60 mt-0.5">Cook County, Illinois</p>
      </div>

      {/* Vertical line from root to horizontal bar */}
      <div className="w-px bg-surface-border" style={{ height: 32 }} />

      {/* Horizontal bar spanning all level-1 nodes */}
      <div className="relative" style={{ width: rootsWidth }}>
        <div
          className="absolute bg-surface-border"
          style={{ height: 1, top: 0, left: NODE_HALF_W, right: NODE_HALF_W }}
        />

        {/* Level-1 nodes */}
        <div className="flex" style={{ gap: GAP }}>
          {roots.map((node) => (
            <div
              key={node.id}
              className="flex flex-col items-center"
              style={{ width: NODE_W }}
            >
              {/* Vertical line from horizontal bar to this node */}
              <div className="w-px bg-surface-border" style={{ height: 32 }} />
              <TreeNodeBlock node={node} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
