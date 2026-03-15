# A11y Bridge — VS Code Extension

Companion VS Code extension for the [React Component Source Highlighter](https://github.com/joehuang/chrome-extension-react-component-source-highlighter) Chrome extension. Together they form an accessibility remediation workflow: identify a failing DOM element from an a11y scan report, trace it back to its React source component, and get an AI-assisted fix suggestion in Copilot Chat — all in a few clicks.

---

## How it works

```
axe-core / Lighthouse report
        │  (CSS selector + violation description)
        ▼
Chrome Extension popup  ──WebSocket──►  VS Code Extension (this)
        │                                      │
        │  traces DOM → React fiber            │  opens source file at component line
        │  flashes visual highlight            │  fires Copilot Chat with fix prompt
        ▼                                      ▼
   browser page                         Copilot Chat panel
```

1. The VS Code extension starts a local WebSocket server (default port **7891**) when VS Code launches.
2. You paste a CSS selector from an a11y report (e.g. `#checkout > button`) into the Chrome extension popup, add the violation description, and click **Trace & Send to VS Code**.
3. The Chrome extension locates the DOM element, walks React's fiber tree to find the owning component, and sends the component name + source file URL + line number over the WebSocket.
4. This extension receives the data, opens the source file at the correct line, and pre-fills Copilot Chat with a prompt containing the component code, violation details, and a request for a minimal fix.

---

## Requirements

- VS Code **1.85** or later
- GitHub Copilot extension installed and signed in
- The [React Component Source Highlighter](https://github.com/joehuang/chrome-extension-react-component-source-highlighter) Chrome extension (built and loaded)
- Your React app running in dev mode (source maps / `_debugSource` required for file tracing)

---

## Installation

### Option A — Extension Development Host (for development/testing)

```bash
cd vscode-a11y-bridge
npm install
npm run compile
```

Then open the `vscode-a11y-bridge/` folder in VS Code and press **F5**. A new Extension Development Host window opens with the extension active.

### Option B — Install from VSIX

```bash
npm install
npm run compile
npx vsce package        # produces vscode-a11y-bridge-0.1.0.vsix
code --install-extension vscode-a11y-bridge-0.1.0.vsix
```

---

## Configuration

Open **Settings** (`⌘,`) and search for `a11y bridge`.

| Setting | Default | Description |
|---|---|---|
| `a11yBridge.port` | `7891` | WebSocket port the server listens on |
| `a11yBridge.autoStart` | `true` | Start server automatically when VS Code launches |
| `a11yBridge.sourceRoot` | `""` | Absolute path to your project root (see below) |

### Setting `sourceRoot`

The Chrome extension sends source URLs in dev-server form, e.g.:

```
http://localhost:3000/src/components/Button.tsx
```

This extension needs to map that URL path (`/src/components/Button.tsx`) to a file on disk. Two strategies are tried in order:

1. **`a11yBridge.sourceRoot`** (explicit) — if set, the URL path is joined onto this root:
   ```
   /Users/you/my-app  +  /src/components/Button.tsx
   → /Users/you/my-app/src/components/Button.tsx
   ```
2. **Auto-detect** — if `sourceRoot` is empty, the first open workspace folder is used as the root. Works for single-repo projects where you open the project root in VS Code.

For **monorepos** or projects where the workspace root doesn't match the dev-server root, set `sourceRoot` explicitly.

---

## Commands

| Command | Description |
|---|---|
| `A11y Bridge: Start WebSocket Server` | Start the server (if stopped) |
| `A11y Bridge: Stop WebSocket Server` | Stop the server |

The status bar item (bottom-right) also reflects connection state and can be clicked to stop the server.

---

## Status bar

| State | Display |
|---|---|
| Server listening, no client | `$(radio-tower) A11y Bridge :7891` |
| Chrome extension connected | `$(plug) A11y Bridge connected` |
| Server stopped | `$(circle-slash) A11y Bridge off` |
| Error | `$(warning) A11y Bridge error` |

---

## End-to-end workflow example

1. Run your app at `localhost:3000` and open it in Chrome.
2. Run an axe-core scan in the browser console:
   ```js
   axe.run().then(r => console.log(r.violations))
   ```
3. Copy a failing selector, e.g. `#main > nav > a.skip-link`.
4. Open the React Component Highlighter popup — the badge shows **VS Code: Connected**.
5. Paste the selector and the violation description (`"Link has no accessible name — WCAG 2.4.4"`).
6. Click **Trace & Send to VS Code**.
7. VS Code opens `SkipLink.tsx` at the component definition and Copilot Chat opens with a pre-filled prompt asking for the minimal fix.

---

## Troubleshooting

**"VS Code: Not connected" in the Chrome popup**
- Make sure VS Code is open with this extension active.
- Check that nothing else is using port 7891 (`lsof -i :7891`).
- Try `A11y Bridge: Start WebSocket Server` from the Command Palette.

**"Could not resolve source path"**
- Set `a11yBridge.sourceRoot` to your project root (absolute path).
- Confirm your React app is running in **development mode** — production builds strip source info.

**No component found for selector**
- Verify the selector matches an element on the current page (`document.querySelector(...)` in the browser console).
- The element must be inside a React tree. Pure HTML elements with no React parent won't resolve to a component.

**Copilot Chat doesn't open**
- Requires VS Code 1.85+ with the GitHub Copilot extension installed.
- As a fallback the prompt is copied to your clipboard automatically.
