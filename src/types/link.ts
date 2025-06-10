import * as vscode from 'vscode'

export interface FileLocation {
  path: vscode.Uri
  beginLine?: number
  endLine?: number
}

export interface LinkTemplateParams {
  branchOrCommit: string
  relativePath: string
  beginLine?: number
  endLine?: number
}
export type LinkTemplate = (params: LinkTemplateParams) => string
