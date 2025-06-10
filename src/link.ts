import type { Remote } from './types/git'
import type { LinkTemplate, LinkTemplateParams } from './types/link'

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

function commonTemplate(
  baseUrl: string,
  blobPath: string,
  params: LinkTemplateParams
): string {
  const { relativePath, branchOrCommit, beginLine, endLine } = params
  const line = beginLine
    ? endLine
      ? `L${beginLine}-L${endLine}`
      : `L${beginLine}`
    : null
  const lineSuffix = line ? `#${line}` : ''
  return `${baseUrl}/${blobPath}/${branchOrCommit}/${relativePath}${lineSuffix}`
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
