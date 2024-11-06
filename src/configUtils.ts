import * as vscode from 'vscode'

export interface ExtensionConfig {
  excludes: string[]
  includes: string[]
  respectGitignore: boolean
}

export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('filesToMarkdownExtractor')
  return {
    excludes: config.get<string[]>('excludes', []),
    includes: config.get<string[]>('includes', []),
    respectGitignore: config.get<boolean>('respectGitignore', true),
  }
}
