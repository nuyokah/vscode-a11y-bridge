import * as vscode from 'vscode';
import { WebSocketServer, WebSocket } from 'ws';
import { WireMessage } from './types';

export class A11yWebSocketServer {
  private wss: WebSocketServer | null = null;
  private statusBar: vscode.StatusBarItem;
  private onMessage: (msg: WireMessage) => void;

  constructor(onMessage: (msg: WireMessage) => void, statusBar: vscode.StatusBarItem) {
    this.onMessage = onMessage;
    this.statusBar = statusBar;
  }

  start(port: number) {
    if (this.wss) return;

    try {
      this.wss = new WebSocketServer({ port });
    } catch (err: any) {
      vscode.window.showErrorMessage(`A11y Bridge: Failed to start server on port ${port}: ${err.message}`);
      this.updateStatus('error');
      return;
    }

    this.updateStatus('listening', port);

    this.wss.on('connection', (socket: WebSocket) => {
      this.updateStatus('connected', port);

      socket.on('message', (raw) => {
        try {
          const msg: WireMessage = JSON.parse(raw.toString());
          this.onMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      });

      socket.on('close', () => {
        this.updateStatus('listening', port);
      });
    });

    this.wss.on('error', (err) => {
      vscode.window.showErrorMessage(`A11y Bridge: Server error on port ${port}: ${err.message}`);
      this.updateStatus('error');
    });
  }

  stop() {
    this.wss?.close();
    this.wss = null;
    this.updateStatus('stopped');
  }

  private updateStatus(state: 'listening' | 'connected' | 'error' | 'stopped', port?: number) {
    const icons: Record<string, string> = {
      listening: '$(radio-tower)',
      connected: '$(plug)',
      error: '$(warning)',
      stopped: '$(circle-slash)',
    };
    const labels: Record<string, string> = {
      listening: `A11y Bridge :${port}`,
      connected: `A11y Bridge connected`,
      error: `A11y Bridge error`,
      stopped: `A11y Bridge off`,
    };
    this.statusBar.text = `${icons[state]} ${labels[state]}`;
    this.statusBar.show();
  }
}
