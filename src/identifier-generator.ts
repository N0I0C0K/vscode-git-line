import * as vscode from 'vscode'
import * as gitExtension from './types/git'

import { SETTING_NAME } from './const'

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

export async function currentBranchHeadSelector(
  repository: gitExtension.Repository
): Promise<string> {
  const head = repository.state.HEAD!
  if (head.ahead === undefined || head.ahead === 0) {
    return head.commit!
  }

  return await getSpecParentCommit(
    await repository.getCommit(head.commit!),
    repository,
    head.ahead
  )
}

export function currentBranchNameSelector(
  repository: gitExtension.Repository
): string {
  const name = repository.state.HEAD?.name
  if (!name) {
    throw new Error('Not on a branch (detached HEAD state)')
  }
  return name
}

export async function getIdentifierGeneratorFromSetting(
  repository: gitExtension.Repository
) {
  const identifierGenerator = vscode.workspace.getConfiguration(SETTING_NAME)
    .identifierGenerator as string
  if (identifierGenerator === 'commit') {
    return await currentBranchHeadSelector(repository)
  } else if (identifierGenerator === 'branch') {
    try {
      return currentBranchNameSelector(repository)
    } catch {
      vscode.window.showWarningMessage(
        'Gitline: "identifierGenerator" is set to "branch", ' +
          'but the repository is in a detached HEAD state. Falling back to using the commit hash.'
      )
      return repository.state.HEAD!.commit!
    }
  } else {
    throw new Error(`Unsupport identifier generator ${identifierGenerator}`)
  }
}
