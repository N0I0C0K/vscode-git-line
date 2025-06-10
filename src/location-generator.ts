import * as vscode from 'vscode'

import type { FileLocation } from './types/link'

export async function getCurrentLineLocation(): Promise<
  FileLocation | undefined
> {
  const activatedEditor = vscode.window.activeTextEditor
  if (!activatedEditor) {
    return
  }
  const selection = activatedEditor.selection
  const startLine = selection.start.line
  const endLine = selection.end.line
  const currentPath = activatedEditor.document.uri
  return {
    path: currentPath,
    beginLine: startLine + 1,
    endLine: endLine === startLine ? undefined : endLine + 1,
  }
}

export async function getCurrentFileLocation(): Promise<
  FileLocation | undefined
> {
  const activatedEditor = vscode.window.activeTextEditor
  if (!activatedEditor) {
    return
  }
  const currentPath = activatedEditor.document.uri
  return {
    path: currentPath,
  }
}
