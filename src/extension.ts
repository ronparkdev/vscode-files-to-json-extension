import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig } from './configUtils';
import { isSourceFile, shouldExcludeFile } from './fileUtils';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "files-to-markdown-extractor" is now active!');

    let disposable = vscode.commands.registerCommand('files-to-markdown-extractor.copyFilesAsMarkdown', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('Please select a file or folder in the explorer');
            return;
        }

        const config = getConfig();
        const fileContents: { [key: string]: string } = {};

        await processFileOrFolder(uri, fileContents, config);

        if (Object.keys(fileContents).length === 0) {
            vscode.window.showInformationMessage('No valid files found to copy');
            return;
        }

        const markdownContent = Object.keys(fileContents)
            .map(filePath => 
                [
                    `# ${filePath}`, 
                    "```", 
                    fileContents[filePath], 
                    "```"
                ].join("\n")
            )
            .join("\n");
        await vscode.env.clipboard.writeText(markdownContent);
        vscode.window.showInformationMessage('Files copied as JSON to clipboard');
    });

    context.subscriptions.push(disposable);
}

async function processFileOrFolder(uri: vscode.Uri, fileContents: { [key: string]: string }, config: any) {
    const stat = await vscode.workspace.fs.stat(uri);

    if (stat.type === vscode.FileType.Directory) {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        for (const [name, type] of entries) {
            await processFileOrFolder(vscode.Uri.joinPath(uri, name), fileContents, config);
        }
    } else if (stat.type === vscode.FileType.File) {
        const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);

        if (await shouldExcludeFile(relativePath, config) || !isSourceFile(relativePath, config)) {
            return;
        }

        const content = await vscode.workspace.fs.readFile(uri);
        fileContents[relativePath] = content.toString();
    }
}

export function deactivate() { }