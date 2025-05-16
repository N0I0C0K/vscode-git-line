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
        throw new Error("remote url is empty")
    }
    if (remoteUrl.startsWith("git@")) {
        const httpUrl = remoteUrl.replace(":", "/").replace("git@", "https://")
        return httpUrl.substring(0, httpUrl.length - 4)
    } else if (remoteUrl.startsWith("http")) {
        return remoteUrl.substring(0, remoteUrl.length - 4)
    } else {
        throw new Error(`${remoteUrl} parse base url failed`)
    }
}

function getTemplateFromBaseUrl(baseUrl: string): (relativePath: string, line: number, branchOrCommit: string) => string {
    const platform = /:\/\/(?<platform>\w+)\./gm.exec(baseUrl)!.groups!.platform
    if (platform === "github") {
        return (rp, line, bc) => {
            return `${baseUrl}/blob/${bc}/${rp}#L${line}`
        }
    } else if (platform === "gitlab") {
        return (rp, line, bc) => {
            return `${baseUrl}/-/blob/${bc}/${rp}#L${line}`
        }
    } else {
        throw new Error(`Unsupport platform ${platform}`)
    }
}

export function getRemoteUrlPointLine(relativePath: string, line: number, remote: Remote, branchOrCommit: string): string {
    const baseUrl = getBaseUrlFromRemote(remote)
    const template = getTemplateFromBaseUrl(baseUrl)
    return template(relativePath, line, branchOrCommit)
}