const stripMongoMeta = {
  transform: (_doc: unknown, ret: Record<string, any>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

export const CLEAN_SCHEMA_OPTIONS = {
  timestamps: true,
  toObject: stripMongoMeta,
  toJSON: stripMongoMeta,
};

export function sanitizeExerciseOptions(
  options?: unknown,
): string[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const cleaned = options.map((o) => String(o ?? "").trim()).filter(Boolean);
  return cleaned.length >= 2 ? cleaned : undefined;
}
