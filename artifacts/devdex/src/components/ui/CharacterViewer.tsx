import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface CharacterViewerProps {
  equippedImageUrl?: string | null;
  className?: string;
}

// A small, self-contained 3D avatar preview: a simple humanoid figure with
// the user's currently-equipped catalog item shown as a "hat" above its
// head. This is independent of the external 3D Studio tool — it's just a
// lightweight way to visualize what a catalog item looks like on you.
export default function CharacterViewer({ equippedImageUrl, className }: CharacterViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 160;
    const h = container.clientHeight || 160;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 1.1, 4.2);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 3, 3);
    scene.add(key);

    const character = new THREE.Group();

    // Torso
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.6, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6 }),
    );
    torso.position.y = 0.75;
    character.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xf5c396 }),
    );
    head.position.y = 1.45;
    character.add(head);

    // Legs
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.14, 0.55, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937 }),
      );
      leg.position.set(side * 0.16, 0.15, 0);
      character.add(leg);
    }

    // Arms
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.1, 0.5, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6 }),
      );
      arm.position.set(side * 0.48, 0.78, 0);
      arm.rotation.z = side * 0.15;
      character.add(arm);
    }

    scene.add(character);

    // Equipped item shown as a floating "hat" plane above the head.
    let itemMesh: THREE.Mesh | null = null;
    if (equippedImageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(equippedImageUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const geo = new THREE.PlaneGeometry(0.42, 0.42);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        itemMesh = new THREE.Mesh(geo, mat);
        itemMesh.position.set(0, 1.88, 0);
        scene.add(itemMesh);
      });
    }

    let rafId: number;
    let angle = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);
      angle += 0.008;
      character.rotation.y = Math.sin(angle) * 0.35;
      if (itemMesh) {
        itemMesh.rotation.y = character.rotation.y;
        itemMesh.position.y = 1.88 + Math.sin(angle * 2) * 0.02;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [equippedImageUrl]);

  return <div ref={containerRef} className={className} />;
}
