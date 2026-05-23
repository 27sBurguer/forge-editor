# Forge Desktop + Web

Este pacote já está configurado para o repositório:

```txt
https://github.com/27sBurguer/forge-editor
```

O Forge pode rodar de duas formas:

1. **Site/servidor Node** usando `npm start`.
2. **Aplicativo desktop Electron** usando `npm run desktop` ou instalador `.exe`.

## Rodar como site

```bash
npm install
npm start
```

Abra:

```txt
http://localhost:3000
```

## Rodar como app desktop em desenvolvimento

```bash
npm install
npm run desktop
```

O aplicativo abre uma janela própria e sobe o Forge localmente em `localhost:3000`.

## Gerar instalador Windows localmente

```bash
npm install
npm run build:win
```

O instalador fica em:

```txt
dist/Forge-Setup.exe
```

## Publicar uma versão com auto-update

Faça commit dos arquivos e envie para o GitHub:

```bash
git add .
git commit -m "Add Forge desktop app"
git push origin main
```

Depois crie uma tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

O GitHub Actions vai gerar o instalador Windows e publicar nos Releases.

## Link direto do botão Baixar Forge App

O botão do site já aponta para:

```txt
https://github.com/27sBurguer/forge-editor/releases/latest/download/Forge-Setup.exe
```

Depois que a primeira release existir, esse link baixa o instalador mais recente.

## Atualizações automáticas

O app usa `electron-updater` com GitHub Releases. Quando você publicar uma nova tag, por exemplo:

```bash
git tag v1.0.1
git push origin v1.0.1
```

O app instalado detecta a atualização e baixa automaticamente.

## Plugin Roblox

A pasta `plugin/` inclui `ForgePlugin.txt`, a versão segura sem roots runtime como `Players` e `NetworkClient`.

Essa versão pausa durante Play Mode para evitar conflitos enquanto o jogo está rodando.


## Desktop release notes

This package is already configured for:

- GitHub owner: `27sBurguer`
- Repository: `forge-editor`
- Windows installer artifact: `Forge-Setup.exe`
- App icon: `public/assets/forge-icon.ico`
- Auto-update through GitHub Releases

The release workflow intentionally does not use npm cache, so it does not require `package-lock.json`.

To publish a new Windows installer:

```bash
git add .
git commit -m "Update Forge desktop build"
git push origin main

git tag v1.0.0
git push origin v1.0.0
```

If the tag already exists from a failed run:

```bash
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

git tag v1.0.0
git push origin v1.0.0
```

After the Action finishes, the download button points to:

```txt
https://github.com/27sBurguer/forge-editor/releases/latest/download/Forge-Setup.exe
```
