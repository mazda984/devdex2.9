import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Plus, Box as BoxIcon, MapPin, Trash2, Play, Square, Move3d } from "lucide-react";
import skyboxUrl from "@/assets/skybox.webp";
import blockTextureUrl from "@/assets/block-texture.png";

type ObjectType = "part" | "spawnpoint";

interface SceneObject {
  id: string;
  type: ObjectType;
  name: string;
  position: { x: number; y: number; z: number };
}

const BASEPLATE_SIZE = 60;
const EYE_HEIGHT = 1.7;
const FLY_SPEED = 12; // units/sec
const LOOK_SENSITIVITY = 0.0025;

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `obj_${Date.now()}_${idCounter}`;
}

export default function Studio3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [objects, setObjects] = useState<SceneObject[]>([
    { id: nextId(), type: "spawnpoint", name: "SpawnPoint", position: { x: 0, y: 0.05, z: 0 } },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    meshes: Map<string, THREE.Object3D>;
    baseplate: THREE.Mesh;
    blockTexture: THREE.Texture | null;
  } | null>(null);

  const editCameraState = useRef({ position: new THREE.Vector3(15, 12, 15), yaw: -2.35, pitch: -0.4 });
  const stateRef = useRef({
    yaw: -2.35,
    pitch: -0.4,
    keys: new Set<string>(),
    rightDown: false,
    leftDown: false,
    dragging: false,
  });

  const addObject = useCallback((type: ObjectType) => {
    const id = nextId();
    const jitter = (Math.random() - 0.5) * 4;
    const obj: SceneObject = {
      id,
      type,
      name: type === "part" ? "Part" : "SpawnPoint",
      position: { x: jitter, y: type === "part" ? 0.5 : 0.05, z: jitter },
    };
    setObjects((prev) => [...prev, obj]);
    setSelectedId(id);
    setShowAddMenu(false);
  }, []);

  const removeObject = useCallback((id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getSize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || Math.max(window.innerHeight - 64, 300);
      return { w, h };
    };

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x88aac8, 50, 140);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(skyboxUrl, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
    });

    const blockTexture = textureLoader.load(blockTextureUrl);
    blockTexture.colorSpace = THREE.SRGBColorSpace;
    blockTexture.wrapS = THREE.RepeatWrapping;
    blockTexture.wrapT = THREE.RepeatWrapping;

    const { w: initW, h: initH } = getSize();
    const camera = new THREE.PerspectiveCamera(70, initW / initH, 0.1, 1000);
    camera.position.copy(editCameraState.current.position);
    camera.lookAt(0, 0, 0);
    stateRef.current.yaw = camera.rotation.y;
    stateRef.current.pitch = camera.rotation.x;
    editCameraState.current.yaw = stateRef.current.yaw;
    editCameraState.current.pitch = stateRef.current.pitch;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    scene.add(sun);

    const baseplate = new THREE.Mesh(
      new THREE.BoxGeometry(BASEPLATE_SIZE, 1, BASEPLATE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x3d8c40 }),
    );
    baseplate.position.y = -0.5;
    baseplate.receiveShadow = true;
    scene.add(baseplate);

    const grid = new THREE.GridHelper(BASEPLATE_SIZE, BASEPLATE_SIZE / 2, 0x2a6b2d, 0x2a6b2d);
    grid.position.y = 0.01;
    scene.add(grid);

    threeRef.current = { scene, camera, renderer, meshes: new Map(), baseplate, blockTexture };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    function updatePointer(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function pickObject(): string | null {
      raycaster.setFromCamera(pointer, camera);
      const meshList = Array.from(threeRef.current!.meshes.entries());
      const intersects = raycaster.intersectObjects(meshList.map(([, m]) => m), true);
      if (intersects.length === 0) return null;
      const hit = intersects[0].object;
      for (const [id, mesh] of meshList) {
        if (mesh === hit || hit.parent === mesh) return id;
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      updatePointer(e);
      if (e.button === 2) {
        stateRef.current.rightDown = true;
        return;
      }
      if (e.button !== 0) return;
      stateRef.current.leftDown = true;

      if (isPlayingRef.current) return;

      const hitId = pickObject();
      if (hitId) {
        setSelectedId(hitId);
        stateRef.current.dragging = true;
      } else if (selectedIdRef.current) {
        setSelectedId(null);
      }
    }

    function onPointerMove(e: PointerEvent) {
      updatePointer(e);

      if (stateRef.current.rightDown) {
        stateRef.current.yaw -= e.movementX * LOOK_SENSITIVITY;
        stateRef.current.pitch -= e.movementY * LOOK_SENSITIVITY;
        stateRef.current.pitch = Math.max(-1.5, Math.min(1.5, stateRef.current.pitch));
      }

      if (stateRef.current.dragging && selectedIdRef.current && !isPlayingRef.current) {
        raycaster.setFromCamera(pointer, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, hit)) {
          const clamp = BASEPLATE_SIZE / 2 - 0.5;
          const x = Math.max(-clamp, Math.min(clamp, hit.x));
          const z = Math.max(-clamp, Math.min(clamp, hit.z));
          setObjects((prev) =>
            prev.map((o) => (o.id === selectedIdRef.current ? { ...o, position: { ...o.position, x, z } } : o)),
          );
        }
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (e.button === 2) stateRef.current.rightDown = false;
      if (e.button === 0) {
        stateRef.current.leftDown = false;
        stateRef.current.dragging = false;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      stateRef.current.keys.add(e.code);
    }
    function onKeyUp(e: KeyboardEvent) {
      stateRef.current.keys.delete(e.code);
    }
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dom.addEventListener("contextmenu", onContextMenu);

    let lastTime = performance.now();
    let rafId: number;

    function animate() {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const s = stateRef.current;
      camera.rotation.order = "YXZ";
      camera.rotation.y = s.yaw;
      camera.rotation.x = s.pitch;

      const forward = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, s.yaw, 0));
      let move = new THREE.Vector3();
      if (s.keys.has("KeyW") || s.keys.has("ArrowUp")) move.add(forward);
      if (s.keys.has("KeyS") || s.keys.has("ArrowDown")) move.sub(forward);
      if (s.keys.has("KeyD") || s.keys.has("ArrowRight")) move.add(right);
      if (s.keys.has("KeyA") || s.keys.has("ArrowLeft")) move.sub(right);

      if (!isPlayingRef.current) {
        if (s.keys.has("Space")) move.y += 1;
        if (s.keys.has("ShiftLeft") || s.keys.has("ShiftRight")) move.y -= 1;
        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(FLY_SPEED * dt);
          camera.position.add(move);
        }
      } else {
        move.y = 0;
        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(FLY_SPEED * 0.6 * dt);
          camera.position.add(move);
        }
        camera.position.y = EYE_HEIGHT;
        const clamp = BASEPLATE_SIZE / 2 - 0.5;
        camera.position.x = Math.max(-clamp, Math.min(clamp, camera.position.x));
        camera.position.z = Math.max(-clamp, Math.min(clamp, camera.position.z));
      }

      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!container) return;
      const { w, h } = getSize();
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);
    // Container size can be 0 on first paint in some layouts; re-check a
    // couple of times shortly after mount and whenever it changes.
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    const t1 = setTimeout(onResize, 50);
    const t2 = setTimeout(onResize, 300);

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      renderer.dispose();
      if (container.contains(dom)) container.removeChild(dom);
    };
  }, []);

  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;

    const currentIds = new Set(objects.map((o) => o.id));
    for (const [id, mesh] of Array.from(t.meshes.entries())) {
      if (!currentIds.has(id)) {
        t.scene.remove(mesh);
        t.meshes.delete(id);
      }
    }

    for (const obj of objects) {
      let mesh = t.meshes.get(obj.id);
      if (!mesh) {
        if (obj.type === "part") {
          const m = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 2),
            new THREE.MeshStandardMaterial({
              map: t.blockTexture ?? undefined,
              color: t.blockTexture ? 0xffffff : 0x6b8cff,
            }),
          );
          m.castShadow = true;
          mesh = m;
        } else {
          const group = new THREE.Group();
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8),
            new THREE.MeshStandardMaterial({ color: 0xdddddd }),
          );
          pole.position.y = 0.75;
          const flag = new THREE.Mesh(
            new THREE.ConeGeometry(0.4, 0.6, 4),
            new THREE.MeshStandardMaterial({
              map: t.blockTexture ?? undefined,
              color: t.blockTexture ? 0xffffff : 0x22c55e,
            }),
          );
          flag.position.set(0.3, 1.3, 0);
          flag.rotation.z = Math.PI / 2;
          group.add(pole, flag);
          mesh = group;
        }
        t.scene.add(mesh);
        t.meshes.set(obj.id, mesh);
      }
      mesh.position.set(obj.position.x, obj.position.y, obj.position.z);

      const isSelected = obj.id === selectedId;
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat && "emissive" in mat) {
            mat.emissive = new THREE.Color(isSelected ? 0xffaa00 : 0x000000);
            mat.emissiveIntensity = isSelected ? 0.6 : 0;
          }
        }
      });
    }
  }, [objects, selectedId]);

  const handlePlay = () => {
    const t = threeRef.current;
    if (!t) return;
    editCameraState.current.position.copy(t.camera.position);
    editCameraState.current.yaw = stateRef.current.yaw;
    editCameraState.current.pitch = stateRef.current.pitch;

    const spawn = objects.find((o) => o.type === "spawnpoint");
    t.camera.position.set(spawn ? spawn.position.x : 0, EYE_HEIGHT, spawn ? spawn.position.z : 0);
    stateRef.current.yaw = 0;
    stateRef.current.pitch = 0;
    setSelectedId(null);
    setIsPlaying(true);
  };

  const handleStop = () => {
    const t = threeRef.current;
    if (!t) return;
    t.camera.position.copy(editCameraState.current.position);
    stateRef.current.yaw = editCameraState.current.yaw;
    stateRef.current.pitch = editCameraState.current.pitch;
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-1 h-[calc(100dvh-64px)] relative bg-black overflow-hidden">
      <div ref={containerRef} className="flex-1 h-full" />

      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4 bg-black/70 backdrop-blur-sm border-b border-white/10 z-20">
        <div className="flex items-center gap-2 text-white text-sm font-semibold">
          <Move3d className="w-4 h-4" />
          3D Studio {isPlaying && <span className="text-emerald-400">— Play Mode</span>}
        </div>
        {isPlaying ? (
          <Button size="sm" variant="destructive" onClick={handleStop} className="font-semibold">
            <Square className="w-4 h-4 mr-2" /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={handlePlay} className="font-semibold bg-emerald-600 hover:bg-emerald-500">
            <Play className="w-4 h-4 mr-2" /> Play
          </Button>
        )}
      </div>

      {!isPlaying && (
        <div className="absolute top-12 right-0 bottom-0 w-64 bg-black/70 backdrop-blur-sm border-l border-white/10 z-20 flex flex-col">
          <div className="flex items-center justify-between px-3 h-10 border-b border-white/10 relative">
            <span className="text-white text-xs font-bold uppercase tracking-wide">Explorer</span>
            <button
              onClick={() => setShowAddMenu((v) => !v)}
              className="w-6 h-6 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10"
              aria-label="Add object"
            >
              <Plus className="w-4 h-4" />
            </button>
            {showAddMenu && (
              <div className="absolute top-10 right-2 bg-neutral-900 border border-white/10 rounded-lg shadow-lg overflow-hidden w-40">
                <button
                  onClick={() => addObject("spawnpoint")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" /> Spawn Point
                </button>
                <button
                  onClick={() => addObject("part")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  <BoxIcon className="w-4 h-4 text-blue-400" /> Part
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {objects.length === 0 && (
              <p className="text-white/40 text-xs text-center py-6 px-3">
                Nesne yok. + ile Part veya Spawn Point ekle.
              </p>
            )}
            {objects.map((obj) => (
              <div
                key={obj.id}
                onClick={() => setSelectedId(obj.id)}
                className={`group flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer ${
                  selectedId === obj.id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {obj.type === "part" ? (
                    <BoxIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {obj.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObject(obj.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 shrink-0"
                  aria-label="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
            Sağ tık + sürükle: kamerayı döndür (noclip)<br />
            WASD / Space / Shift: uç<br />
            Nesneye tıkla, sonra sürükle: taşı
          </div>
        </div>
      )}
    </div>
  );
}
