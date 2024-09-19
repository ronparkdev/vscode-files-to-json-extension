import * as vscode from 'vscode';
import { getConfig } from './configUtils';
import { processFiles } from './fileUtils';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "files-to-markdown-extractor" is now active!');

    let disposable = vscode.commands.registerCommand('files-to-markdown-extractor.copyFilesAsMarkdown', async (uri: vscode.Uri, selectedFiles: vscode.Uri[]) => {
        let filesToProcess: vscode.Uri[] = [];

        if (selectedFiles && selectedFiles.length > 0) {
            filesToProcess = selectedFiles;
        } else if (uri) {
            filesToProcess = [uri];
        } else {
            vscode.window.showErrorMessage('Please select file(s) or folder(s) in the explorer');
            return;
        }

        const config = getConfig();
        console.log('Configuration:', JSON.stringify(config, null, 2));

        const fileContents = await processFiles(filesToProcess, config);

        if (Object.keys(fileContents).length === 0) {
            vscode.window.showInformationMessage('No valid files found to copy.');
            return;
        }

        const markdownContent = Object.entries(fileContents)
            .map(([filePath, content]) => 
                `# \`${filePath}\`\n\`\`\`\n${content}\n\`\`\``
            )
            .join("\n\n");

        await vscode.env.clipboard.writeText(markdownContent);
        vscode.window.showInformationMessage(`Files copied as Markdown to clipboard. Total files: ${Object.keys(fileContents).length}`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}