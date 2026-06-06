type PreprocessOptions = {
  enable?: boolean;
};

/**
 * Lightweight placeholder preprocess step.
 * We keep this as an explicit hook for future grayscale/contrast work
 * without forcing heavy image dependencies into the baseline pipeline.
 */
export async function preprocessImageBuffer(input: Buffer, options?: PreprocessOptions): Promise<Buffer> {
  if (!options?.enable) {
    return input;
  }
  return input;
}
