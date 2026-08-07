import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface CharacterViewerProps {
  equippedImageUrl?: string | null;
  className?: string;
}

// A small, self-contained 3D avatar preview styled to match DevDex Studio's
// blocky character (box torso/limbs, simple head) — the user's currently
// equipped catalog item is shown as a floating billboard above the head.
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
    camera.position.set(0, 1.05, 4.4);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2, 3, 3);
    scene.add(key);

    const character = new THREE.Group();

    const torsoColor = 0xa3a3a3;
    const limbColor = 0xa3a3a3;
    const legColor = 0x22c55e;
    const headColor = 0xe4e4e4;

    // Torso — blocky box, like DevDex Studio's character
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.62, 0.3),
      new THREE.MeshStandardMaterial({ color: torsoColor }),
    );
    torso.position.y = 0.68;
    character.add(torso);

    // Head — rounded box
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.4, 0.42),
      new THREE.MeshStandardMaterial({ color: headColor }),
    );
    head.position.y = 1.25;
    character.add(head);

    // Simple face (two dots) drawn via small dark spheres
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937 }),
      );
      eye.position.set(side * 0.09, 1.27, 0.22);
      character.add(eye);
    }

    // Legs — blocky boxes
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.55, 0.28),
        new THREE.MeshStandardMaterial({ color: legColor }),
      );
      leg.position.set(side * 0.14, 0.1, 0);
      character.add(leg);
    }

    // Arms — blocky boxes
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.58, 0.24),
        new THREE.MeshStandardMaterial({ color: limbColor }),
      );
      arm.position.set(side * 0.38, 0.68, 0);
      arm.rotation.z = side * 0.08;
      character.add(arm);
    }

    scene.add(character);

    // Ground disc under the character's feet, echoing DevDex Studio's spawn platform
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a }),
    );
    disc.position.y = -0.18;
    character.add(disc);

    // Equipped item shown as a floating "hat" plane above the head.
    let itemMesh: THREE.Mesh | null = null;
    if (equippedImageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(equippedImageUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const geo = new THREE.PlaneGeometry(0.42, 0.42);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        itemMesh = new THREE.Mesh(geo, mat);
        itemMesh.position.set(0, 1.62, 0);
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
        itemMesh.position.y = 1.62 + Math.sin(angle * 2) * 0.02;
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
