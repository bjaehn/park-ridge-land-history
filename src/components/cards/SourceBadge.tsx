type SourceBadgeProps = {
  source: string;
  url?: string;
};

export function SourceBadge({ source, url }: SourceBadgeProps) {
  const inner = (
    <>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
      {source}
    </>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="source-badge source-badge-link" aria-label={`Source: ${source}`}>
        {inner}
      </a>
    );
  }
  return (
    <span className="source-badge" aria-label={`Source: ${source}`}>
      {inner}
    </span>
  );
}
