import React from "react";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "var(--radius)",
        ...style,
      }}
    />
  );
}

export default Skeleton;
