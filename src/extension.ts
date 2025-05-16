// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as gitExtension from './types/git'
import { isDescendant } from './utils';
import { getRemoteUrlPointLine } from './link'
import { relative } from 'path'

function registerCommand(context: vscode.ExtensionContext, repository: gitExtension.Repository) {
	const disposable = vscode.commands.registerCommand('git-line.copy-line-link', () => {
		const activatedEditor = vscode.window.activeTextEditor;
		if (activatedEditor) {
			const selection = activatedEditor.selection;
			const startLine = selection.start.line;
			const rootPath = vscode.workspace.workspaceFolders?.[0].uri;
			const currentPath = activatedEditor.document.uri

			console.log(repository.rootUri)
			console.log(rootPath)
			console.log(currentPath)
			console.log(relative(repository.rootUri.fsPath, currentPath.fsPath))
			
			const lineLink = getRemoteUrlPointLine(relative(repository.rootUri.fsPath, currentPath.fsPath), startLine + 1, repository.state.remotes[0], repository.state.HEAD?.commit!)
			vscode.env.clipboard.writeText(lineLink)
			vscode.window.showInformationMessage('Copy success');
		}
	});

	context.subscriptions.push(disposable);
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "git-line" is now active!');

	const gitService = vscode.extensions.getExtension<gitExtension.GitExtension>('vscode.git')?.exports.getAPI(1);
	gitService?.onDidOpenRepository((r) => {
		console.log(r)
	})
	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	const repository = rootPath ? gitService?.repositories.filter(r => isDescendant(r.rootUri.fsPath, rootPath))[0] : undefined;
	console.log(repository?.state)
	repository?.getConfigs().then(val => {
		console.log(val)
	})
	registerCommand(context, repository!);

}

// This method is called when your extension is deactivated
export function deactivate() { }
