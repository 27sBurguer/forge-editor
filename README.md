# Forge Web v5

Professional web editor for Forge.

## Changes in v5

- Fixed Explorer rename mode so F2 stays active instead of instantly losing focus.
- Polling no longer re-renders the Explorer while a rename input is open.
- Open scripts are saved per private session and restored after page refresh.
- Split state, active script and tab order are also restored.
- Refresh only warns when there are unsaved scripts.

## Run

```bash
npm install
npm start
```

Open:

```txt
http://localhost:3000
```
