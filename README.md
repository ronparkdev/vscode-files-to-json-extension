# Files to Markdown Extractor

This VS Code extension allows you to easily extract the contents of selected files or folders and copy them as Markdown-formatted text to your clipboard.

## Features

- Extract content from selected files or folders in the VS Code Explorer
- Copy extracted content as Markdown-formatted text to the clipboard
- Configurable file inclusion and exclusion patterns
- Option to respect .gitignore rules

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Files to Markdown Extractor"
4. Click Install

## Usage

1. Right-click on a file or folder in the VS Code Explorer
2. Select "Copy as Markdown" from the context menu
3. The contents of the selected file(s) or folder(s) will be copied to your clipboard in Markdown format

## Configuration

You can customize the extension's behavior through VS Code settings:

- `filesToMarkdownExtractor.excludes`: An array of glob patterns for files to exclude
- `filesToMarkdownExtractor.includes`: An array of glob patterns for files to include
- `filesToMarkdownExtractor.respectGitignore`: Whether to respect .gitignore rules (default: true)

Example configuration:

```json
{
  "filesToMarkdownExtractor.excludes": [
    "**/*.min.js",
    "**/*.map"
  ],
  "filesToMarkdownExtractor.includes": [
    "**/*.js",
    "**/*.ts",
    "**/*.json"
  ],
  "filesToMarkdownExtractor.respectGitignore": true
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any suggestions, please [open an issue](https://github.com/ronparkdev/vscode-files-to-makrdown-extension/issues) on GitHub.