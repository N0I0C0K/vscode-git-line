// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as gitExtension from './types/git'
import { isDescendant } from './utils'
import { getRemoteUrlPointLine, getTemplateFromRemote } from './link'
import { relative } from 'path'

const SETTING_NAME = 'gitline'

async function setDefaultRemote(
  repository: gitExtension.Repository,
  skipForOnlyOneRemote: boolean = false
): Promise<string> {
  if (repository.state.remotes.length === 1 && skipForOnlyOneRemote) {
    return repository.state.remotes[0].name
  }
  const remote = await vscode.window.showQuickPick(
    repository.state.remotes.map((r) => r.name),
    {
      placeHolder: 'Select remote',
    }
  )
  if (!remote) {
    throw new Error('remote is empty')
  }
  await vscode.workspace
    .getConfiguration(SETTING_NAME)
    .update('defaultRemote', remote, false)
  return remote
}

async function defaultRemoteSelector(repository: gitExtension.Repository) {
  let defaultRemote = vscode.workspace.getConfiguration(SETTING_NAME)
    .defaultRemote as string
  if (defaultRemote === '') {
    defaultRemote = await setDefaultRemote(repository, true)
  }
  const selectedRemote =
    repository.state.remotes.find((r) => r.name === defaultRemote) ??
    repository.state.remotes[0]
  return selectedRemote
}

function currentRemoteSelector(repository: gitExtension.Repository) {
  const currentBranch = repository.state.HEAD!
  return (
    repository.state.remotes.find(
      (r) => r.name === currentBranch.upstream?.remote
    ) ?? repository.state.remotes[0]
  )
}

async function getSpecParentCommit(
  commit: gitExtension.Commit,
  repository: gitExtension.Repository,
  n: number
): Promise<string> {
  if (n === 0) {
    return commit.hash
  }
  if (commit.parents.length === 0) {
    return commit.hash
  }
  return getSpecParentCommit(
    await repository.getCommit(commit.parents[0]),
    repository,
    n - 1
  )
}

function currentBranchHeadSelector(
  repository: gitExtension.Repository
): () => Promise<string> {
  return async () => {
    const head = repository.state.HEAD!
    if (head.ahead === 0) {
      return head.commit!
    }

    return await getSpecParentCommit(
      await repository.getCommit(head.commit!),
      repository,
      head.ahead!
    )
  }
}

function copyLineLinkCommand(
  repository: gitExtension.Repository,
  remoteSelector: (
    repository: gitExtension.Repository
  ) => Promise<gitExtension.Remote> | gitExtension.Remote,
  branchOrCommitSelector: () => Promise<string> | string
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
      const lineLink = template({
        relativePath: relative(repository.rootUri.fsPath, currentPath.fsPath),
        branchOrCommit: await branchOrCommitSelector(),
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
        currentBranchHeadSelector(repository)
      )
    ),
    vscode.commands.registerCommand(
      'git-line.copy-line-link-current-remote',
      copyLineLinkCommand(
        repository,
        currentRemoteSelector,
        currentBranchHeadSelector(repository)
      )
    ),
    vscode.commands.registerCommand('git-line.set-default-remote', async () => {
      await setDefaultRemote(repository)
    })
  )
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
export function deactivate() {}
