// DiceCube itself is deliberately NOT re-exported here. DiceCubeDemo loads it
// with `lazy(() => import('./DiceCube'))` to keep three.js out of the initial
// payload, and a static re-export from this barrel silently defeats that: the
// only consumer (Sandbox.tsx) imports DiceCubeDemo from here, so the barrel is
// on the static path and drags three.js along with it. Import DiceCube from
// './DiceCube' directly if it ever needs a second consumer.
export { default as DiceCubeDemo } from './DiceCubeDemo';
