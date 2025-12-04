import * as vscode from 'vscode'
import { spawn } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(require('child_process').exec)

/**
 * Write both plain text and HTML to clipboard
 * @param plainText - The plain text to write to clipboard
 * @param htmlText - The HTML text to write to clipboard (optional)
 */
export async function writeToClipboard(
  plainText: string,
  htmlText?: string
): Promise<void> {
  // Always write plain text using VS Code API
  await vscode.env.clipboard.writeText(plainText)

  // If HTML text is provided, try to write it to clipboard using platform-specific methods
  if (htmlText) {
    try {
      await writeHtmlToClipboard(htmlText, plainText)
    } catch (error) {
      // If HTML writing fails, we still have plain text copied
      console.error('Failed to write HTML to clipboard:', error)
    }
  }
}

/**
 * Write HTML to clipboard using platform-specific methods
 */
async function writeHtmlToClipboard(
  htmlText: string,
  fallbackText: string
): Promise<void> {
  const platform = process.platform

  try {
    if (platform === 'darwin') {
      // macOS
      await writeMacOSHtmlClipboard(htmlText, fallbackText)
    } else if (platform === 'win32') {
      // Windows
      await writeWindowsHtmlClipboard(htmlText, fallbackText)
    } else if (platform === 'linux') {
      // Linux
      await writeLinuxHtmlClipboard(htmlText, fallbackText)
    }
  } catch (error) {
    // Silently fail - plain text is already copied
    console.error('Platform-specific HTML clipboard write failed:', error)
  }
}

/**
 * Write HTML to clipboard on macOS
 */
async function writeMacOSHtmlClipboard(
  htmlText: string,
  fallbackText: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Use textutil with stdin to avoid command injection
      const textutil = spawn('textutil', ['-stdin', '-stdout', '-format', 'html', '-convert', 'rtf'])
      const pbcopy = spawn('pbcopy', ['-Prefer', 'rtf'])
      
      // Pipe textutil output to pbcopy
      textutil.stdout.pipe(pbcopy.stdin)
      
      // Write HTML to textutil stdin
      textutil.stdin.write(htmlText)
      textutil.stdin.end()
      
      pbcopy.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`pbcopy exited with code ${code}`))
        }
      })
      
      textutil.on('error', reject)
      pbcopy.on('error', reject)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Write HTML to clipboard on Windows
 */
async function writeWindowsHtmlClipboard(
  htmlText: string,
  fallbackText: string
): Promise<void> {
  // Windows Clipboard format requires specific HTML header
  const htmlClipboardFormat = generateWindowsHtmlFormat(htmlText)
  
  // Use Base64 encoding to avoid command injection vulnerabilities
  const scriptContent = `
Add-Type -AssemblyName System.Windows.Forms
$html = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${Buffer.from(htmlClipboardFormat).toString('base64')}'))
$text = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${Buffer.from(fallbackText).toString('base64')}'))
$dataObject = New-Object System.Windows.Forms.DataObject
$dataObject.SetData([System.Windows.Forms.DataFormats]::Html, $html)
$dataObject.SetData([System.Windows.Forms.DataFormats]::Text, $text)
[System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)
`
  const encodedCommand = Buffer.from(scriptContent, 'utf16le').toString('base64')
  
  await execAsync(`powershell -EncodedCommand ${encodedCommand}`)
}

/**
 * Write HTML to clipboard on Linux
 */
async function writeLinuxHtmlClipboard(
  htmlText: string,
  fallbackText: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Try xclip first (X11)
    const xclip = spawn('xclip', ['-selection', 'clipboard', '-t', 'text/html'])
    
    xclip.stdin.write(htmlText)
    xclip.stdin.end()
    
    xclip.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        // Fallback to wl-copy (Wayland)
        const wlcopy = spawn('wl-copy', ['--type', 'text/html'])
        
        wlcopy.stdin.write(htmlText)
        wlcopy.stdin.end()
        
        wlcopy.on('close', (wlcode) => {
          if (wlcode === 0) {
            resolve()
          } else {
            reject(new Error(`Both xclip and wl-copy failed`))
          }
        })
        
        wlcopy.on('error', reject)
      }
    })
    
    xclip.on('error', (err) => {
      // Try wl-copy as fallback
      const wlcopy = spawn('wl-copy', ['--type', 'text/html'])
      
      wlcopy.stdin.write(htmlText)
      wlcopy.stdin.end()
      
      wlcopy.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(err)
        }
      })
      
      wlcopy.on('error', reject)
    })
  })
}

/**
 * Generate Windows HTML clipboard format
 * Windows requires a specific header format for HTML clipboard data with correct byte offsets
 */
function generateWindowsHtmlFormat(html: string): string {
  const htmlWithWrapper = `<!DOCTYPE html><html><body><!--StartFragment-->${html}<!--EndFragment--></body></html>`
  
  // Prepare header template to calculate its length
  const headerTemplate =
    'Version:0.9\r\n' +
    'StartHTML:0000000000\r\n' +
    'EndHTML:0000000000\r\n' +
    'StartFragment:0000000000\r\n' +
    'EndFragment:0000000000\r\n'
  
  // Calculate byte offsets
  const headerLength = Buffer.byteLength(headerTemplate, 'utf8')
  const htmlLength = Buffer.byteLength(htmlWithWrapper, 'utf8')
  
  // StartHTML is where the HTML starts (after the header)
  const startHTML = headerLength
  const endHTML = headerLength + htmlLength
  
  // Find fragment markers in the HTML
  const startFragmentMarker = htmlWithWrapper.indexOf('<!--StartFragment-->')
  const endFragmentMarker = htmlWithWrapper.indexOf('<!--EndFragment-->')
  
  // Calculate byte offsets for fragments (relative to start of entire string)
  const startFragmentOffset = headerLength + Buffer.byteLength(htmlWithWrapper.slice(0, startFragmentMarker), 'utf8')
  const endFragmentOffset = headerLength + Buffer.byteLength(htmlWithWrapper.slice(0, endFragmentMarker), 'utf8')
  
  // Build header with correct offsets
  const header =
    'Version:0.9\r\n' +
    `StartHTML:${String(startHTML).padStart(10, '0')}\r\n` +
    `EndHTML:${String(endHTML).padStart(10, '0')}\r\n` +
    `StartFragment:${String(startFragmentOffset).padStart(10, '0')}\r\n` +
    `EndFragment:${String(endFragmentOffset).padStart(10, '0')}\r\n`
  
  return header + htmlWithWrapper
}


