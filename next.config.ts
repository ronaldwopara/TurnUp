import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Quiet incorrect workspace-root inference when multiple lockfiles exist on the machine. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  /** Native ONNX bindings must stay external so Next/Turbopack do not bundle them incorrectly. */
  serverExternalPackages: ["onnxruntime-node"],
};

export default nextConfig;
