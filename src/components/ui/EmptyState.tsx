type Props = {
  heading: string;
  body?: string;
  action?: React.ReactNode;
};

type SkeletonProps = {
  rows?: number;
  className?: string;
};

/**
 * Honest empty state that matches the final layout skeleton.
 * Never shows a generic spinner with a placeholder title.
 */
export function EmptyState({ heading, body, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-12 h-12 rounded-full border-2 border-surface-border flex items-center justify-center mb-4"
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-text-muted"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{heading}</h3>
      {body && <p className="text-sm text-text-secondary max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Loading skeleton tiles that match the StatGrid/card layout.
 * Prevents a flash of empty layout before data arrives.
 */
export function LoadingSkeleton({ rows = 3, className = "" }: SkeletonProps) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-surface-card border border-surface-border rounded-lg"
        />
      ))}
    </div>
  );
}

export function LoadingBar({ className = "" }: { className?: string }) {
  return (
    <div className={`h-4 bg-surface-card rounded animate-pulse ${className}`} aria-busy="true" />
  );
}
