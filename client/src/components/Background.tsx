import React from "react";

export default function Background() {
  return (
    <iframe
      src="/background.html"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        zIndex: -1,
        pointerEvents: "none",
        opacity: 0.6,
      }}
      title="background"
    />
  );
}
