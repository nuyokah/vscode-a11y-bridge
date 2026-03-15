import * as vscode from 'vscode';
import { A11yWebSocketServer } from './websocketServer';
import { ChatBridge } from './chatBridge';
import { WireMessage } from './types';

let server: A11yWebSocketServer | null = null;

export function activate(context: vscode.ExtensionContext) {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'a11yBridge.stopServer';
  statusBar.tooltip = 'A11y Bridge — click to stop WebSocket server';
  context.subscriptions.push(statusBar);

  const chatBridge = new ChatBridge();

  const handleMessage = (msg: WireMessage) => {
    if (msg.type === 'A11Y_COMPONENT' && msg.payload) {
      chatBridge.handlePayload(msg.payload);
    }
  };

  server = new A11yWebSocketServer(handleMessage, statusBar);

  const config = vscode.workspace.getConfiguration('a11yBridge');
  const port: number = config.get('port') ?? 7891;
  const autoStart: boolean = config.get('autoStart') ?? true;

  if (autoStart) {
    server.start(port);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('a11yBridge.startServer', () => {
      const currentPort = vscode.workspace.getConfiguration('a11yBridge').get<number>('port') ?? 7891;
      server?.start(currentPort);
    }),
    vscode.commands.registerCommand('a11yBridge.stopServer', () => {
      server?.stop();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('a11yBridge.port')) {
        server?.stop();
        const newPort = vscode.workspace.getConfiguration('a11yBridge').get<number>('port') ?? 7891;
        server?.start(newPort);
      }
    })
  );
}

export function deactivate() {
  server?.stop();
}
