import React from "react";

export default function Studio3D() {
  return (
    <div className="flex flex-col flex-1 h-full">
      <iframe
        src="https://mazda984.github.io/devdexstudio3d/"
        className="flex-1 w-full border-0"
        style={{ minHeight: "calc(100dvh - 60px)" }}
        allow="fullscreen; gamepad; autoplay"
        title="DevDex Studio 3D"
      />
    </div>
  );
}
