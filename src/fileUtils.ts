import * as vscode from 'vscode';
import * as path from 'path';
import minimatch from 'minimatch';
import { ExtensionConfig } from './configUtils';
import ignore from 'ignore';

interface GitignoreCache {
    [dir: string]: ReturnType<typeof ignore>;
}

let gitignoreCache: GitignoreCache = {};

export async function initializeGitignore(config: ExtensionConfig): Promise<void> {
    if (config.respectGitignore) {
        gitignoreCache = {};
    }
}

function isSourceFile(filePath: string, config: ExtensionConfig): boolean {
    const result = config.includes.some(pattern => {
        if (!pattern.includes('/')) {
            return minimatch(path.basename(filePath), pattern);
        }
        return minimatch(filePath, pattern, { matchBase: true });
    });
    return result;
}

async function shouldExcludeFile(filePath: string, uri: vscode.Uri, config: ExtensionConfig): Promise<boolean> {
    if (config.excludes.some(pattern => minimatch(filePath, pattern, { matchBase: true }))) {
        console.log(`Excluded by user pattern: ${filePath}`);
        return true;
    }

    if (config.respectGitignore) {
        const ig = await getGitignoreForDir(path.dirname(uri.fsPath));
        if (ig && ig.ignores(filePath)) {
            console.log(`Excluded by .gitignore: ${filePath}`);
            return true;
        }
    }

    console.log(`Not excluded: ${filePath}`);
    return false;
}

async function getGitignoreForDir(dir: string): Promise<ReturnType<typeof ignore> | null> {
    if (gitignoreCache[dir]) {
        return gitignoreCache[dir];
    }

    const gitignorePath = path.join(dir, '.gitignore');
    try {
        const gitignoreContent = await vscode.workspace.fs.readFile(vscode.Uri.file(gitignorePath));
        const patterns = gitignoreContent.toString().split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
        const ig = ignore().add(patterns);
        gitignoreCache[dir] = ig;
        console.log(`Loaded .gitignore for: ${dir}`);
        return ig;
    } catch (error) {
        const parentDir = path.dirname(dir);
        if (parentDir !== dir) {
            return getGitignoreForDir(parentDir);
        }
        return null;
    }
}

export async function processFiles(uris: vscode.Uri[], config: ExtensionConfig): Promise<{ [key: string]: string }> {
    await initializeGitignore(config);
    const fileContents: { [key: string]: string } = {};

    for (const uri of uris) {
        await processFileOrFolder(uri, fileContents, config);
    }

    return fileContents;
}

async function processFileOrFolder(uri: vscode.Uri, fileContents: { [key: string]: string }, config: ExtensionConfig): Promise<void> {
    const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath);
    console.log(`Processing: ${relativePath}`);

    if (await shouldExcludeFile(relativePath, uri, config)) {
        return;
    }

    const stat = await vscode.workspace.fs.stat(uri);

    if (stat.type === vscode.FileType.Directory) {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        for (const [name, type] of entries) {
            await processFileOrFolder(vscode.Uri.joinPath(uri, name), fileContents, config);
        }
    } else if (stat.type === vscode.FileType.File) {
        if (!isSourceFile(relativePath, config)) {
            return;
        }

        const content = await vscode.workspace.fs.readFile(uri);
        fileContents[relativePath] = content.toString();
        console.log(`Added file: ${relativePath}`);
    }
}