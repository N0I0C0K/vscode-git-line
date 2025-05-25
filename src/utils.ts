import { sep } from 'path'

function isWindowsPath(path: string): boolean {
  return /^[a-zA-Z]:\\/.test(path)
}

export function ensurePosixPath(path: string): string {
  return path.replace(/\\/g, '/')
}

export function isDescendant(
  parent: string,
  descendant: string,
  separator: string = sep
): boolean {
  if (parent === descendant) {
    return true
  }

  if (parent.charAt(parent.length - 1) !== separator) {
    parent += separator
  }

  // Windows is case insensitive
  if (isWindowsPath(parent)) {
    parent = parent.toLowerCase()
    descendant = descendant.toLowerCase()
  }

  return descendant.startsWith(parent)
}
