import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "vendor/voice");
await mkdir(outputDirectory, { recursive: true });

const copies = [
  ["@ricky0123/vad-web/dist/bundle.min.js", "vad.bundle.min.js"],
  ["@ricky0123/vad-web/dist/silero_vad_legacy.onnx", "silero_vad_legacy.onnx"],
  ["@ricky0123/vad-web/dist/silero_vad_v5.onnx", "silero_vad_v5.onnx"],
  ["@ricky0123/vad-web/dist/vad.worklet.bundle.min.js", "vad.worklet.bundle.min.js"],
  ["onnxruntime-web/dist/ort.min.js", "ort.min.js"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.mjs"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.wasm"],
];

for (const [source, destination] of copies) {
  await cp(resolve(projectRoot, "node_modules", source), resolve(outputDirectory, destination));
}
