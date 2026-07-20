import React from "react";

export default function Studio() {
  return (
    <div className="flex flex-col flex-1 h-full">
      <iframe
        src="https://mazda984.github.io/studio/"
        className="flex-1 w-full border-0"
        style={{ minHeight: "calc(100dvh - 60px)" }}
        allow="fullscreen"
        title="DevDex Studio"
      />
    </div>
  );
}
