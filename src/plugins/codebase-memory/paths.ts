import { win32 } from "node:path"

export function normalizeProjectPath(path: string, platform: string = process.platform): string {
  if (platform === "win32") {
    const normalized = win32.normalize(path)
    const root = win32.parse(normalized).root
    return (normalized.length > root.length ? normalized.replace(/\\+$/, "") : normalized).toLowerCase()
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : path
}
