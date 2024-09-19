import * as vscode from 'vscode';
import * as path from 'path';
import minimatch from 'minimatch';
import { ExtensionConfig } from './configUtils';
import ignore from 'ignore';

let gitignorePatterns: string[] | null = null;

export async function isSourceFile(filePath: string, config: ExtensionConfig): Promise<boolean> {
    for (const pattern of config.includes) {
        if (minimatch(filePath, pattern)) {
            return true;
        }
    }
    return false;
}

export async function shouldExcludeFile(filePath: string, config: ExtensionConfig): Promise<boolean> {
    // Check user-defined excludes
    for (const pattern of config.excludes) {
        if (minimatch(filePath, pattern)) {
            return true;
        }
    }

    // Check .gitignore if enabled
    if (config.respectGitignore) {
        if (gitignorePatterns === null) {
            gitignorePatterns = await loadGitignorePatterns();
        }
        const ig = ignore().add(gitignorePatterns);
        if (ig.ignores(filePath)) {
            return true;
        }
    }

    return false;
}

async function loadGitignorePatterns(): Promise<string[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return [];
    }

    const gitignorePath = path.join(workspaceFolder.uri.fsPath, '.gitignore');
    try {
        const gitignoreContent = await vscode.workspace.fs.readFile(vscode.Uri.file(gitignorePath));
        return gitignoreContent.toString().split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
    } catch (error) {
        console.error('Error reading .gitignore file:', error);
        return [];
    }
}