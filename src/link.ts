import { Remote } from './types/git'

/**
 * parse git remote url into raw http url
 * eg:
 *  git@gitlab.xxx.net:xxx/xxx.git or https://gitlab.xxx.net/xxx/xxx.git
 * ->
 *  https://gitlab.xxx.net/xxx/xxx
 */
function getBaseUrlFromRemote(remote: Remote): string {
  const remoteUrl = remote.fetchUrl ?? remote.pushUrl
  if (!remoteUrl) {
    throw new Error('remote url is empty')
  }
  if (remoteUrl.startsWith('git@')) {
    const httpUrl = remoteUrl.replace(':', '/').replace('git@', 'https://')
    return httpUrl.substring(0, httpUrl.length - 4)
  } else if (remoteUrl.startsWith('http')) {
    return remoteUrl.substring(0, remoteUrl.length - 4)
  } else {
    throw new Error(`${remoteUrl} parse base url failed`)
  }
}

export interface LinkTemplateParams {
  relativePath: string
  branchOrCommit: string
  beginLine: number
  endLine?: number
}
export type LinkTemplate = (params: LinkTemplateParams) => string

function commonTemplate(
  baseUrl: string,
  blobPath: string,
  params: LinkTemplateParams
): string {
  const { relativePath, branchOrCommit, beginLine, endLine } = params
  const line = endLine ? `L${beginLine}-L${endLine}` : `L${beginLine}`
  return `${baseUrl}/${blobPath}/${branchOrCommit}/${relativePath}#${line}`
}

function getTemplateFromBaseUrl(baseUrl: string): LinkTemplate {
  const platform = /:\/\/(?<platform>\w+)\./gm.exec(baseUrl)!.groups!.platform
  if (platform === 'github') {
    return (params) => commonTemplate(baseUrl, 'blob', params)
  } else if (platform === 'gitlab') {
    return (params) => commonTemplate(baseUrl, '-/blob', params)
  } else {
    throw new Error(`Unsupport platform ${platform}`)
  }
}

export function getTemplateFromRemote(remote: Remote): LinkTemplate {
  const baseUrl = getBaseUrlFromRemote(remote)
  return getTemplateFromBaseUrl(baseUrl)
}

export function getRemoteUrlPointLine(
  relativePath: string,
  line: number,
  remote: Remote,
  branchOrCommit: string
): string {
  const template = getTemplateFromRemote(remote)
  return template({ relativePath, branchOrCommit, beginLine: line })
}
