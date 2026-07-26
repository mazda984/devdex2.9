import React, { useEffect, useRef } from "react";
import { useParams } from "wouter";
import * as THREE from "three";
import { useStudioSceneBySlug } from "@/lib/extra-api";
import { Loader } from "@/components/ui/Loader";
import skyboxUrl from "@/assets/skybox.webp";
import blockTextureUrl from "@/assets/block-texture.png";
import { Move3d } from "lucide-react";

const BASEPLATE_SIZE = 60;
const EYE_HEIGHT = 1.7;
const FLY_SPEED = 12;
const LOOK_SENSITIVITY = 0.0025;

interface SceneObject {
  id: string;
  type: "part" | "spawnpoint";
  position: { x: number; y: number; z: number };
}

export default function Play3D() {
  const { slug } = useParams();
  const { data: scene, isLoading, error } = useStudioSceneBySlug(slug);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !scene) return;

    const objects = (scene.data as SceneObject[]) || [];
    const spawn = objects.find((o) => o.type === "spawnpoint");

    const getSize = () => ({
      w: container.clientWidth || window.innerWidth,
      h: container.clientHeight || Math.max(window.innerHeight - 64, 300),
    });

    const s = { yaw: 0, pitch: 0, keys: new Set<string>(), leftDown: false };

    const three = new THREE.Scene();
    three.fog = new THREE.Fog(0x88aac8, 50, 140);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(skyboxUrl, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      three.background = tex;
    });
    const blockTexture = textureLoader.load(blockTextureUrl);
    blockTexture.colorSpace = THREE.SRGBColorSpace;

    const { w, h } = getSize();
    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
    camera.position.set(spawn ? spawn.position.x : 0, EYE_HEIGHT, spawn ? spawn.position.z : 0);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    three.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 40, 20);
    sun.castShadow = true;
    three.add(sun);

    const baseplate = new THREE.Mesh(
      new THREE.BoxGeometry(BASEPLATE_SIZE, 1, BASEPLATE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x3d8c40 }),
    );
    baseplate.position.y = -0.5;
    baseplate.receiveShadow = true;
    three.add(baseplate);
    three.add(new THREE.GridHelper(BASEPLATE_SIZE, BASEPLATE_SIZE / 2, 0x2a6b2d, 0x2a6b2d));

    for (const obj of objects) {
      if (obj.type === "part") {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(2, 1, 2),
          new THREE.MeshStandardMaterial({ map: blockTexture }),
        );
        m.position.set(obj.position.x, obj.position.y, obj.position.z);
        m.castShadow = true;
        three.add(m);
      } else {
        const group = new THREE.Group();
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8),
          new THREE.MeshStandardMaterial({ color: 0xdddddd }),
        );
        pole.position.y = 0.75;
        const flag = new THREE.Mesh(
          new THREE.ConeGeometry(0.4, 0.6, 4),
          new THREE.MeshStandardMaterial({ map: blockTexture }),
        );
        flag.position.set(0.3, 1.3, 0);
        flag.rotation.z = Math.PI / 2;
        group.add(pole, flag);
        group.position.set(obj.position.x, obj.position.y, obj.position.z);
        three.add(group);
      }
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button === 0) s.leftDown = true;
    }
    function onPointerUp(e: PointerEvent) {
      if (e.button === 0) s.leftDown = false;
    }
    function onPointerMove(e: PointerEvent) {
      if (s.leftDown) {
        s.yaw -= e.movementX * LOOK_SENSITIVITY;
        s.pitch -= e.movementY * LOOK_SENSITIVITY;
        s.pitch = Math.max(-1.5, Math.min(1.5, s.pitch));
      }
    }
    function onKeyDown(e: KeyboardEvent) { s.keys.add(e.code); }
    function onKeyUp(e: KeyboardEvent) { s.keys.delete(e.code); }

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let lastTime = performance.now();
    let rafId: number;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      camera.rotation.y = s.yaw;
      camera.rotation.x = s.pitch;
      camera.rotation.z = 0;

      const forward = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, s.yaw, 0));
      const move = new THREE.Vector3();
      if (s.keys.has("KeyW") || s.keys.has("ArrowUp")) move.add(forward);
      if (s.keys.has("KeyS") || s.keys.has("ArrowDown")) move.sub(forward);
      if (s.keys.has("KeyD") || s.keys.has("ArrowRight")) move.add(right);
      if (s.keys.has("KeyA") || s.keys.has("ArrowLeft")) move.sub(right);
      move.y = 0;
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(FLY_SPEED * 0.6 * dt);
        camera.position.add(move);
      }
      camera.position.y = EYE_HEIGHT;
      const clamp = BASEPLATE_SIZE / 2 - 0.5;
      camera.position.x = Math.max(-clamp, Math.min(clamp, camera.position.x));
      camera.position.z = Math.max(-clamp, Math.min(clamp, camera.position.z));

      renderer.render(three, camera);
    }
    animate();

    function onResize() {
      const { w, h } = getSize();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(dom)) container.removeChild(dom);
    };
  }, [scene]);

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center min-h-[60vh]"><Loader /></div>;
  }

  if (error || !scene) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-2">
        <p className="text-foreground font-semibold">Bu alan bulunamadı.</p>
        <p className="text-muted-foreground text-sm">Link yanlış olabilir ya da silinmiş olabilir.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-[calc(100dvh-64px)] relative bg-black overflow-hidden">
      <div ref={containerRef} className="flex-1 h-full" />
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center gap-2 px-4 bg-black/70 backdrop-blur-sm border-b border-white/10 z-20 text-white text-sm font-semibold">
        <Move3d className="w-4 h-4" />
        {scene.author?.username ? `${scene.author.username}'in alanı` : "3D Alan"}
        <span className="ml-auto text-xs text-white/50 font-normal hidden sm:inline">
          Sürükle: bak · WASD: yürü
        </span>
      </div>
    </div>
  );
}
