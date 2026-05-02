import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Quiet incorrect workspace-root inference when multiple lockfiles exist on the machine. */
const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
};

export default nextConfig;
