# Forge

Private professional script workspace for Roblox projects.

## Run

```bash
npm start
```

Open:

```txt
http://localhost:3000
```

## Includes

- Professional black/gray Forge web editor.
- Hidden private connection modal with Session ID + Secret.
- Roblox-aware Luau autocomplete with service/context suggestions.
- Project-wide search with Ctrl+F.
- Autosave default: 3000ms.
- Split editing by dragging a tab to the editor area or double-clicking a tab.
- Compact create instance popover.
- Updated ForgePlugin.lua for Roblox Studio.

## Plugin copy note

Roblox Studio plugins cannot always write directly to your operating system clipboard. Forge tries to copy automatically when the environment allows it. If Studio blocks clipboard access, the plugin selects the login text inside the Copy Login box so you can press Ctrl+C manually.
