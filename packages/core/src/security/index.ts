export function assertWithinByteLimit(bytes: number, maxBytes: number): void {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error("Invalid payload size");
  }
  if (bytes > maxBytes) {
    throw new Error(`Payload exceeds ${maxBytes} byte limit`);
  }
}

/** Reject absolute paths, NUL, and `..` segments. Returns a cleaned relative path. */
export function assertSafeRelativePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Path is empty");
  }
  if (trimmed.includes("\0")) {
    throw new Error("Invalid path");
  }

  const normalized = trimmed.replace(/\\/g, "/");
  if (/^[a-zA-Z]:/.test(normalized) || normalized.startsWith("/")) {
    throw new Error("Absolute paths are not allowed");
  }

  const parts = normalized.split("/").filter((p) => p.length > 0 && p !== ".");
  if (parts.some((p) => p === "..")) {
    throw new Error("Path traversal is not allowed");
  }
  return parts.join("/");
}
