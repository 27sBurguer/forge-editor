# Forge Desktop + Web

This package is configured for:

```txt
https://github.com/27sBurguer/forge-editor
```

Forge can run in two modes:

1. **Web / Node server** with `npm start`.
2. **Desktop Electron app** with `npm run desktop` or the Windows installer.

## Run as web server

```bash
npm install
npm start
```

Open:

```txt
http://localhost:3000
```

## Run as desktop app in development

```bash
npm install
npm run desktop
```

The desktop app opens its own window and starts Forge locally at `localhost:3000`.

## Build the Windows installer locally

```bash
npm install
npm run build:win
```

The installer is generated at:

```txt
dist/Forge-Setup.exe
```

## Publish a release with auto-update

Commit and push your files:

```bash
git add .
git commit -m "Update Forge desktop app"
git push origin main
```

Create a new tag:

```bash
git tag v1.0.2
git push origin v1.0.2
```

The GitHub Action builds the Windows installer and uploads it to GitHub Releases.

Do not keep reusing the same tag for updates. Use newer versions such as:

```txt
v1.0.2
v1.0.3
v1.0.4
```

## Download button

The web download button points to:

```txt
https://github.com/27sBurguer/forge-editor/releases/latest/download/Forge-Setup.exe
```

The Electron app hides the desktop download button, because the user is already inside the app.

## Plugin button

The title bar includes a Plugin button pointing to:

```txt
https://create.roblox.com/store/asset/110405258188669/Forge-Codex
```

## Discord Rich Presence

The desktop app uses Discord Rich Presence with:

```txt
Application ID: 1507948057289822229
Large Image Key: forge_logo
```

The activity updates when the user opens or switches scripts. Discord must be open on the user's computer for Rich Presence to appear.

The Discord buttons are `Open Forge` and `Plugin`.

## Auto-updates

The app uses `electron-updater` with GitHub Releases. When you publish a newer tag, the installed app can detect and download the update automatically.

## Plugin

The `plugin/` folder includes `ForgePlugin.txt`.

The plugin automatically detects the best API target:

```txt
1. http://localhost:3000
2. https://forge-editor.onrender.com
```

So if the Forge Desktop App is open, the plugin uses the local app. If not, it falls back to Render cloud.

The plugin also pauses during Play Mode to avoid runtime conflicts.


## Release note

This package is set to version `1.0.5`. Build releases with matching tags such as `v1.0.5`; the app updater reads the packaged app version and the GitHub release metadata.

Shortcuts added: `Ctrl+1` through `Ctrl+9` switch to open tabs by order.
