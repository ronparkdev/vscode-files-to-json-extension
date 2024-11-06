import * as vscode from 'vscode'
import * as path from 'path'
import minimatch from 'minimatch'
import { ExtensionConfig } from './configUtils'
import ignore from 'ignore'

interface GitignoreCache {
  [dir: string]: ReturnType<typeof ignore>
}

let gitignoreCache: GitignoreCache = {}

export async function initializeGitignore(config: ExtensionConfig): Promise<void> {
  if (config.respectGitignore) {
    gitignoreCache = {}
  }
}

function isSourceFile(filePath: string, config: ExtensionConfig): boolean {
  const result = config.includes.some(pattern => {
    if (!pattern.includes('/')) {
      return minimatch(path.basename(filePath), pattern)
    }
    return minimatch(filePath, pattern, { matchBase: true })
  })
  return result
}

async function shouldExcludeFile(filePath: string, uri: vscode.Uri, config: ExtensionConfig): Promise<boolean> {
  if (config.excludes.some(pattern => minimatch(filePath, pattern, { matchBase: true }))) {
    console.log(`Excluded by user pattern: ${filePath}`)
    return true
  }

  if (config.respectGitignore) {
    const ig = await getGitignoreForDir(path.dirname(uri.fsPath))
    if (ig && ig.ignores(filePath)) {
      console.log(`Excluded by .gitignore: ${filePath}`)
      return true
    }
  }

  return false
}

async function getGitignoreForDir(dir: string): Promise<ReturnType<typeof ignore> | null> {
  if (gitignoreCache[dir]) {
    return gitignoreCache[dir]
  }

  const gitignorePath = path.join(dir, '.gitignore')
  try {
    const gitignoreContent = await vscode.workspace.fs.readFile(vscode.Uri.file(gitignorePath))
    const patterns = gitignoreContent
      .toString()
      .split('\n')
      .filter(line => line.trim() !== '' && !line.startsWith('#'))
    const ig = ignore().add(patterns)
    gitignoreCache[dir] = ig
    console.log(`Loaded .gitignore for: ${dir}`)
    return ig
  } catch (error) {
    const parentDir = path.dirname(dir)
    if (parentDir !== dir) {
      return getGitignoreForDir(parentDir)
    }
    return null
  }
}

export async function processFiles(
  uris: vscode.Uri[],
  config: ExtensionConfig,
  progressCallback: (current: number, total: number) => boolean,
): Promise<{ [key: string]: string }> {
  await initializeGitignore(config)

  const allFiles = await getAllFiles(uris, config, total => progressCallback(0, total))
  const totalFiles = allFiles.length

  const fileContents: { [key: string]: string } = {}

  for (let i = 0; i < allFiles.length; i++) {
    const uri = allFiles[i]
    if (progressCallback(i + 1, totalFiles)) {
      throw 'cancelled'
    }
    await processFileOrFolder(uri, fileContents)
  }

  return fileContents
}

function getRelativePath(uri: vscode.Uri): string {
  return path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath)
}

async function getAllFiles(
  uris: vscode.Uri[],
  config: ExtensionConfig,
  progressCallback: (total: number) => void,
): Promise<vscode.Uri[]> {
  const allFiles: vscode.Uri[] = []
  for (const uri of uris) {
    await collectFiles(uri, allFiles, config, progressCallback)
  }
  return allFiles
}

async function collectFiles(
  uri: vscode.Uri,
  allFiles: vscode.Uri[],
  config: ExtensionConfig,
  progressCallback: (total: number) => void,
): Promise<void> {
  const relativePath = getRelativePath(uri)
  const stat = await vscode.workspace.fs.stat(uri)

  if (await shouldExcludeFile(relativePath, uri, config)) {
    return
  }

  if (stat.type === vscode.FileType.Directory) {
    const entries = await vscode.workspace.fs.readDirectory(uri)
    for (const [name, type] of entries) {
      await collectFiles(vscode.Uri.joinPath(uri, name), allFiles, config, progressCallback)
    }
  } else if (stat.type === vscode.FileType.File) {
    if (!isSourceFile(relativePath, config)) {
      return
    }
    if (!allFiles.some(uri => getRelativePath(uri) === relativePath)) {
      console.log(`Added ${relativePath}`)
      allFiles.push(uri)
      progressCallback(allFiles.length)
    }
  }
}

async function processFileOrFolder(uri: vscode.Uri, fileContents: { [key: string]: string }): Promise<void> {
  const relativePath = path.relative(vscode.workspace.workspaceFolders![0].uri.fsPath, uri.fsPath)
  console.log(`Processing: ${relativePath}`)

  const content = await vscode.workspace.fs.readFile(uri)
  fileContents[relativePath] = content.toString()
  console.log(`Added file: ${relativePath}`)
}
