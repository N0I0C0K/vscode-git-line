import * as vscode from 'vscode'
import * as gitExtension from './types/git'

import { SETTING_NAME } from './const'

export async function setDefaultRemote(
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

export async function defaultRemoteSelector(
  repository: gitExtension.Repository
) {
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

export function currentRemoteSelector(repository: gitExtension.Repository) {
  const currentBranch = repository.state.HEAD!
  return (
    repository.state.remotes.find(
      (r) => r.name === currentBranch.upstream?.remote
    ) ?? repository.state.remotes[0]
  )
}
