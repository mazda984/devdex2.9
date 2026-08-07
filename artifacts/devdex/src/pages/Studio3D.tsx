import React from "react";
import { useAuth } from "@/lib/auth";

export default function Studio3D() {
  const { user } = useAuth();

  const params = new URLSearchParams();
  if (user?.avatarUrl && user?.avatarItemId) {
    // Only pass the item image if it actually came from an equipped catalog
    // item (avatarItemId set), not just any avatar picture.
    params.set("devdexItemImage", encodeURIComponent(user.avatarUrl));
  }
  if (user?.username) {
    params.set("devdexUsername", encodeURIComponent(user.username));
  }
  const query = params.toString();
  const src = `https://mazda984.github.io/devdexstudio3d/${query ? `?${query}` : ""}`;

  return (
    <div className="flex flex-col flex-1 h-full">
      <iframe
        src={src}
        className="flex-1 w-full border-0"
        style={{ minHeight: "calc(100dvh - 60px)" }}
        allow="fullscreen; gamepad; autoplay"
        title="DevDex Studio 3D"
      />
    </div>
  );
}
