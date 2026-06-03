import React from "react";

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Avatar({ name, src, size = 32, onClick, className = "", style }: AvatarProps) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "var(--muted-foreground)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        flexShrink: 0,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
