# Gitline

Gitline is a VS Code extension that allows you to quickly copy the remote URL of the current line or selection in your code. It supports both GitHub and GitLab repositories.

## Features

- Copy the remote link of the current line or selection
- Copy the remote link of the current file
- Support for both GitHub and GitLab repositories
- Set a default remote for repositories with multiple remotes
- Quick access through context menu in the editor

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Gitline"
4. Click Install

## Requirements

- VS Code Git extension (vscode.git)

## Usage

### Copy Line Link

1. Right-click on a line in your code
2. Select "Gitline: Copy the remote link of the current line"
3. The link will be copied to your clipboard

### Copy Line Link with Current Remote

1. Right-click on a line in your code
2. Select "Gitline: Copy the remote link of the current line (current remote)"
3. The link will be copied to your clipboard

### Set Default Remote

If your repository has multiple remotes:

1. Open the command palette (Ctrl+Shift+P)
2. Type "Gitline: Set default remote"
3. Select your preferred remote from the list

## Extension Settings

This extension contributes the following settings:

* `gitline.defaultRemote`: The default remote to use when copying the remote link

## Known Issues

None at this time.

## Release Notes

### 0.0.1

- Initial release
- Support for GitHub and GitLab repositories
- Copy line links with default or current remote
- Set default remote for repositories with multiple remotes

