import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const pipR = size * 0.082;
  ctx.fillStyle = '#111111';
  for (const [fx, fy] of PIP_LAYOUTS[value]) {
    ctx.beginPath();
    ctx.arc(fx * size, fy * size, pipR, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

interface DiceCubeProps {
  onFaceChange?: (face: number) => void;
}

const DiceCube = ({ onFaceChange }: DiceCubeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  // Keep callback in a ref so the animation loop always calls the latest version
  // without needing to be re-created when the prop changes
  const onFaceChangeRef = useRef(onFaceChange);
  onFaceChangeRef.current = onFaceChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(2.8, 2.2, 3.2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x0f0f1a);
    container.appendChild(renderer.domElement);

    // Cube
    const faceMaterials = [1, 6, 2, 5, 3, 4].map(
      v => new THREE.MeshPhongMaterial({ map: makeFaceTexture(v) })
    );
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), faceMaterials);
    scene.add(cube);
    cubeRef.current = cube;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-4, -2, -4);
    scene.add(fill);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 12;

    // Resize observer
    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    });
    ro.observe(container);

    // Pre-allocated vectors to avoid per-frame allocations
    const toCamera = new THREE.Vector3();
    const worldNormal = new THREE.Vector3();
    let currentFace = -1;

    // Render loop
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // Determine which face most directly faces the camera
      toCamera.copy(camera.position).normalize();

      let maxDot = -Infinity;
      let closestFace = 1;
      for (const { normal, value } of FACE_NORMALS) {
        worldNormal.copy(normal).transformDirection(cube.matrixWorld);
        const dot = worldNormal.dot(toCamera);
        if (dot > maxDot) {
          maxDot = dot;
          closestFace = value;
        }
      }

      if (closestFace !== currentFace) {
        currentFace = closestFace;
        onFaceChangeRef.current?.(closestFace);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      cubeRef.current = null;
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.canvas}
      />
      <p className={styles.hint}>Drag to rotate · Scroll to zoom</p>
    </div>
  );
};

export default DiceCube;
