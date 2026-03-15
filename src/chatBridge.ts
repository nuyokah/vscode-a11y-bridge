import * as vscode from 'vscode';
import * as path from 'path';
import { A11yComponentPayload } from './types';

export class ChatBridge {
  async handlePayload(payload: A11yComponentPayload) {
    const localPath = this.resolveSourceUrl(payload.component.source);

    if (!localPath) {
      vscode.window.showWarningMessage(
        `A11y Bridge: Could not resolve source path for "${payload.component.source}". ` +
          `Set a11yBridge.sourceRoot in VS Code settings to your project root.`
      );
      await this.openCopilotChat(payload, null, null, null);
      return;
    }

    const lineNumber = (payload.component.lineNumber ?? 1) - 1; // VS Code uses 0-indexed lines
    const uri = vscode.Uri.file(localPath);

    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, {
        selection: new vscode.Range(lineNumber, 0, lineNumber, 0),
        preview: false,
      });

      // Read a context window around the component definition
      const startLine = Math.max(0, lineNumber - 5);
      const endLine = Math.min(doc.lineCount - 1, lineNumber + 40);
      const codeSnippet = doc.getText(new vscode.Range(startLine, 0, endLine, 0));

      await this.openCopilotChat(payload, codeSnippet, localPath, payload.component.lineNumber);
    } catch {
      vscode.window.showErrorMessage(`A11y Bridge: Could not open file: ${localPath}`);
      await this.openCopilotChat(payload, null, localPath, payload.component.lineNumber);
    }
  }

  private async openCopilotChat(
    payload: A11yComponentPayload,
    codeSnippet: string | null,
    filePath: string | null,
    lineNumber: number | null
  ) {
    const { violation, component } = payload;

    const lines: string[] = [
      `I have an accessibility violation in the React component \`${component.name}\`.`,
      ``,
      `**Violation**: ${violation.violationDescription || '(no description provided)'}`,
    ];

    if (violation.wcagCriterion) {
      lines.push(`**WCAG Criterion**: ${violation.wcagCriterion}`);
    }

    lines.push(`**DOM Selector**: \`${violation.selector}\``);

    if (filePath) {
      lines.push(`**Source File**: \`${filePath}\`${lineNumber ? ` (line ${lineNumber})` : ''}`);
    }

    if (codeSnippet) {
      lines.push(``, `Here is the relevant component code:`, `\`\`\`tsx`, codeSnippet, `\`\`\``);
    }

    lines.push(``, `Please suggest the minimal change needed to fix this accessibility issue.`);

    const query = lines.filter((l) => l !== undefined).join('\n');

    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', { query });
    } catch {
      // Fallback: copy to clipboard if command is not available
      await vscode.env.clipboard.writeText(query);
      vscode.window.showInformationMessage(
        `A11y Bridge: Copilot Chat prompt copied to clipboard (workbench.action.chat.open not available).`
      );
    }
  }

  private resolveSourceUrl(source: string | null): string | null {
    if (!source) return null;

    const config = vscode.workspace.getConfiguration('a11yBridge');
    const sourceRoot: string = config.get('sourceRoot') ?? '';

    try {
      const url = new URL(source);
      const urlPath = url.pathname; // e.g. "/src/components/Button.tsx"

      // Strategy 1: use configured sourceRoot
      if (sourceRoot) {
        return path.join(sourceRoot, urlPath);
      }

      // Strategy 2: auto-detect from workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders?.length) {
        return path.join(workspaceFolders[0].uri.fsPath, urlPath);
      }
    } catch {
      return null;
    }

    return null;
  }
}
