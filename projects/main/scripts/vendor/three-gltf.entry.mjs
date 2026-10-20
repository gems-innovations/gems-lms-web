// Entrada del bundle de three.js que usa el tema «aventura» (public/taps-engine/themes/aventura/vendor/three-gltf.js).
// Solo lo que pide renderer-gltf.js. Sin MeshoptDecoder ni Draco: usan WebAssembly y la CSP (script-src sin
// 'wasm-unsafe-eval') no lo permite; los .glb van solo cuantizados (KHR_mesh_quantization, nativo de GLTFLoader).
// Se regenera con:  node projects/main/scripts/vendor/construir-three.mjs
export {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Box3, Vector3, Fog, HemisphereLight, DirectionalLight,
  PlaneGeometry, CircleGeometry, MeshBasicMaterial, MeshLambertMaterial, CanvasTexture, TextureLoader, AnimationMixer,
  LoopRepeat, SRGBColorSpace, REVISION,
} from 'three';
export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
