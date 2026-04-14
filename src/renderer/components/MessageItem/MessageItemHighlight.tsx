import React from "react";

type MessageItemHighlightProps = {
  searchQuery?: string;
  value: string;
};

export default function MessageItemHighlight({ searchQuery, value }: MessageItemHighlightProps) {
  const query = searchQuery?.trim();
  if (!query) return <>{value}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${escaped})`, "gi");
  const segments = value.split(pattern);

  return (
    <>
      {segments.map((segment, index) => (
        segment.toLowerCase() === query.toLowerCase() ? (
          <mark className="message-item__highlight" key={`${segment}-${index}`}>{segment}</mark>
        ) : (
          <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
        )
      ))}
    </>
  );
}
