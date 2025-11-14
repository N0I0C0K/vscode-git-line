import * as vscode from 'vscode'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
  try {
    // Use echo with pipe to avoid temporary files
    // Convert HTML to RTF using textutil and copy to clipboard
    const escapedHtml = htmlText.replace(/'/g, "'\\''")
    await execAsync(`echo '${escapedHtml}' | textutil -stdin -stdout -format html -convert rtf | pbcopy -Prefer rtf`)
  } catch (error) {
    // Fallback: just copy as HTML using osascript
    const appleScript = `osascript -e 'set the clipboard to "${escapeForAppleScript(htmlText)}"'`
    try {
      await execAsync(appleScript)
    } catch (e) {
      // Final fallback - do nothing, plain text is already copied
    }
  }
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
  
  // Execute PowerShell inline without creating a temporary script file
  const escapedHtml = htmlClipboardFormat.replace(/\$/g, '`$').replace(/"/g, '`"')
  const escapedText = fallbackText.replace(/\\/g, '\\\\').replace(/"/g, '`"')
  
  const powershellCommand = `Add-Type -AssemblyName System.Windows.Forms; $html = "${escapedHtml}"; $dataObject = New-Object System.Windows.Forms.DataObject; $dataObject.SetData([System.Windows.Forms.DataFormats]::Html, $html); $dataObject.SetData([System.Windows.Forms.DataFormats]::Text, "${escapedText}"); [System.Windows.Forms.Clipboard]::SetDataObject($dataObject, $true)`
  
  await execAsync(`powershell -Command "${powershellCommand}"`)
}

/**
 * Write HTML to clipboard on Linux
 */
async function writeLinuxHtmlClipboard(
  htmlText: string,
  fallbackText: string
): Promise<void> {
  try {
    // Use echo with pipe to avoid temporary files
    const escapedHtml = htmlText.replace(/'/g, "'\\''")
    await execAsync(`echo '${escapedHtml}' | xclip -selection clipboard -t text/html`)
  } catch (error) {
    try {
      // Fallback to wl-copy (Wayland) with stdin
      const escapedHtml = htmlText.replace(/'/g, "'\\''")
      await execAsync(`echo '${escapedHtml}' | wl-copy --type text/html`)
    } catch (error2) {
      // Final fallback - do nothing, plain text is already copied
    }
  }
}

/**
 * Generate Windows HTML clipboard format
 * Windows requires a specific header format for HTML clipboard data
 */
function generateWindowsHtmlFormat(html: string): string {
  const htmlWithWrapper = `<!DOCTYPE html><html><body><!--StartFragment-->${html}<!--EndFragment--></body></html>`
  const startFragment = htmlWithWrapper.indexOf('<!--StartFragment-->')
  const endFragment = htmlWithWrapper.indexOf('<!--EndFragment-->')
  
  const header = 
    'Version:0.9\r\n' +
    'StartHTML:0000000000\r\n' +
    'EndHTML:0000000000\r\n' +
    `StartFragment:${String(startFragment).padStart(10, '0')}\r\n` +
    `EndFragment:${String(endFragment).padStart(10, '0')}\r\n`
  
  return header + htmlWithWrapper
}

/**
 * Escape string for AppleScript
 */
function escapeForAppleScript(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
