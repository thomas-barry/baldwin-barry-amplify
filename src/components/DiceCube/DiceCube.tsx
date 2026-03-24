import { useEffect, useRef } from 'react';
import type React from 'react';
import * as THREE from 'three';
import styles from './DiceCube.module.css';

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0.5,  0.5 ]],
  2: [[0.75, 0.25], [0.25, 0.75]],
  3: [[0.75, 0.25], [0.5,  0.5 ], [0.25, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5,  0.5 ], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5 ], [0.75, 0.5 ], [0.25, 0.75], [0.75, 0.75]],
};

// Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
// Standard die convention: opposite faces sum to 7
const FACE_NORMALS: { normal: THREE.Vector3; value: number }[] = [
  { normal: new THREE.Vector3( 1,  0,  0), value: 1 },
  { normal: new THREE.Vector3(-1,  0,  0), value: 6 },
  { normal: new THREE.Vector3( 0,  1,  0), value: 2 },
  { normal: new THREE.Vector3( 0, -1,  0), value: 5 },
  { normal: new THREE.Vector3( 0,  0,  1), value: 3 },
  { normal: new THREE.Vector3( 0,  0, -1), value: 4 },
];

function makeFaceTexture(value: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  ctx.fillStyle = '#cc0000';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const pipR = size * 0.082;
  ctx.fillStyle = '#ffffff';
  for (const [fx, fy] of PIP_LAYOUTS[value]) {
    ctx.beginPath();
    ctx.arc(fx * size, fy * size, pipR, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

interface DiceCubeProps {
  onFaceChange?: (face: number) => void;
  onRollEnd?: () => void;
  rollRef?: React.MutableRefObject<(() => void) | null>;
}

type DieState = 'idle' | 'spinning' | 'settling';

const DiceCube = ({ onFaceChange, onRollEnd, rollRef }: DiceCubeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onFaceChangeRef = useRef(onFaceChange);
  onFaceChangeRef.current = onFaceChange;
  const onRollEndRef = useRef(onRollEnd);
  onRollEndRef.current = onRollEnd;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera — fixed; we rotate the cube, not the camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(2.2, 1.75, 2.5);
    camera.lookAt(0, 0, 0);

    // Renderer — transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Cube
    const geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const faceMaterials = [1, 6, 2, 5, 3, 4].map(
      v => new THREE.MeshPhongMaterial({ map: makeFaceTexture(v) })
    );
    const cube = new THREE.Mesh(geometry, faceMaterials);
    cube.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    );
    scene.add(cube);

    // Lights — fixed in world space; cube rotates through them
    scene.add(new THREE.AmbientLight(0xffffff, 0.66));
    const key = new THREE.DirectionalLight(0xffffff, 1.56);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.42);
    fill.position.set(-4, -2, -4);
    scene.add(fill);

    // ── Physics state ───────────────────────────────────────────────────────
    let dieState: DieState = 'idle';
    const angularVelocity = new THREE.Vector3();
    const targetQ = new THREE.Quaternion();
    const DAMPING = 0.97;          // per-frame factor at 60 fps; scaled by dt at runtime
    const SETTLE_THRESHOLD = 0.1;  // rad/s
    const SLERP_SPEED = 0.1;       // per-frame factor at 60 fps; scaled by dt at runtime

    let secondImpulseTimeout: ReturnType<typeof setTimeout> | null = null;

    if (rollRef) {
      rollRef.current = () => {
        if (secondImpulseTimeout !== null) clearTimeout(secondImpulseTimeout);

        const speed = 16 + Math.random() * 24;
        angularVelocity
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          .normalize()
          .multiplyScalar(speed);
        dieState = 'spinning';

        secondImpulseTimeout = setTimeout(() => {
          const speed2 = (16 + Math.random() * 24) * 0.5;
          angularVelocity.add(
            new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
              .normalize()
              .multiplyScalar(speed2)
          );
          dieState = 'spinning';
        }, 500);
      };
    }

    // Resize observer
    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    });
    ro.observe(container);

    // Pre-allocated vectors
    const toCamera = new THREE.Vector3();
    const worldNormal = new THREE.Vector3();
    const bestWorldNormal = new THREE.Vector3();
    const rotAxis = new THREE.Vector3();
    const alignQ = new THREE.Quaternion();
    let currentFace = -1;

    // ── Render loop ─────────────────────────────────────────────────────────
    let rafId: number;
    let lastTime: number | null = null;

    const animate = (time: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = lastTime !== null ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = time;

      // Flag set when spinning crosses the settle threshold this frame
      let needsSettleSetup = false;

      if (dieState === 'spinning') {
        const speed = angularVelocity.length();
        rotAxis.copy(angularVelocity).normalize();
        cube.rotateOnWorldAxis(rotAxis, speed * dt);
        angularVelocity.multiplyScalar(Math.pow(DAMPING, dt * 60));

        if (speed < SETTLE_THRESHOLD) {
          needsSettleSetup = true;
          dieState = 'settling';
        }
      } else if (dieState === 'settling') {
        const slerpFactor = 1 - Math.pow(1 - SLERP_SPEED, dt * 60);
        cube.quaternion.slerp(targetQ, slerpFactor);
        if (cube.quaternion.angleTo(targetQ) < 0.001) {
          cube.quaternion.copy(targetQ);
          dieState = 'idle';
          onRollEndRef.current?.();
        }
      }

      renderer.render(scene, camera);

      // ── Single face-detection pass (uses matrixWorld updated by render) ──
      toCamera.copy(camera.position).normalize();
      let maxDot = -Infinity;
      let closestFace = 1;
      for (const { normal, value } of FACE_NORMALS) {
        worldNormal.copy(normal).transformDirection(cube.matrixWorld);
        const dot = worldNormal.dot(toCamera);
        if (dot > maxDot) {
          maxDot = dot;
          closestFace = value;
          bestWorldNormal.copy(worldNormal);
        }
      }

      // Complete settle setup using the face-detection result
      if (needsSettleSetup) {
        alignQ.setFromUnitVectors(bestWorldNormal, toCamera);
        targetQ.multiplyQuaternions(alignQ, cube.quaternion);
      }

      if (closestFace !== currentFace) {
        currentFace = closestFace;
        onFaceChangeRef.current?.(closestFace);
      }
    };

    animate(0);

    return () => {
      cancelAnimationFrame(rafId);
      if (secondImpulseTimeout !== null) clearTimeout(secondImpulseTimeout);
      ro.disconnect();
      faceMaterials.forEach(m => { m.map?.dispose(); m.dispose(); });
      geometry.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      if (rollRef) rollRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className={styles.canvas} />;
};

export default DiceCube;
