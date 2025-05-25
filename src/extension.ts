// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as gitExtension from './types/git'
import { ensurePosixPath, isDescendant } from './utils'
import { getTemplateFromRemote } from './link'
import { relative } from 'path'

import {
  defaultRemoteSelector,
  currentRemoteSelector,
  setDefaultRemote,
} from './remote-selector'

import { getIdentifierGeneratorFromSetting } from './identifier-generator'

function copyLineLinkCommand(
  repository: gitExtension.Repository,
  remoteSelector: (
    repository: gitExtension.Repository
  ) => Promise<gitExtension.Remote> | gitExtension.Remote,
  branchOrCommitSelector: (
    repository: gitExtension.Repository
  ) => Promise<string> | string
): () => Promise<void> {
  return async () => {
    const activatedEditor = vscode.window.activeTextEditor
    if (activatedEditor) {
      const selection = activatedEditor.selection
      const startLine = selection.start.line
      const endLine = selection.end.line
      const currentPath = activatedEditor.document.uri
      const remote = await remoteSelector(repository)
      const template = getTemplateFromRemote(remote)

      if (!currentPath.fsPath.startsWith(repository.rootUri.fsPath)) {
        throw new Error('File is not in the repository')
      }

      const lineLink = template({
        relativePath: ensurePosixPath(
          relative(repository.rootUri.fsPath, currentPath.fsPath)
        ),
        branchOrCommit: await branchOrCommitSelector(repository),
        beginLine: startLine + 1,
        endLine: endLine === startLine ? undefined : endLine + 1,
      })
      vscode.env.clipboard.writeText(lineLink)
      vscode.window.showInformationMessage('Copy success')
    }
  }
}

function registerCommand(
  context: vscode.ExtensionContext,
  repository: gitExtension.Repository
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'git-line.copy-line-link',
      copyLineLinkCommand(
        repository,
        defaultRemoteSelector,
        getIdentifierGeneratorFromSetting
      )
    ),
    vscode.commands.registerCommand(
      'git-line.copy-line-link-current-remote',
      copyLineLinkCommand(
        repository,
        currentRemoteSelector,
        getIdentifierGeneratorFromSetting
      )
    ),
    vscode.commands.registerCommand('git-line.set-default-remote', async () => {
      await setDefaultRemote(repository)
    })
  )

  vscode.commands.executeCommand('setContext', 'gitline.enabled', true)
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "git-line" is now active!')

  const gitService = vscode.extensions
    .getExtension<gitExtension.GitExtension>('vscode.git')
    ?.exports.getAPI(1)

  const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath
  const repository = rootPath
    ? gitService!.repositories.filter((r) =>
        isDescendant(r.rootUri.fsPath, rootPath)
      )[0]
    : undefined
  if (!repository) {
    gitService!.onDidOpenRepository((r) => {
      if (isDescendant(r.rootUri.fsPath, rootPath!)) {
        registerCommand(context, r)
      }
    })
  } else {
    registerCommand(context, repository)
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand('setContext', 'gitline.enabled', false)
}
