# Building the fork's AppImage

The NixOS config (`~/NixOS/pkgs/orca-claude.nix`) installs the fork from an
AppImage attached to a GitHub release of `nazmur96/orca`. To make a new one:

1. In the FHS dev shell (`nix run ~/projects/orca -- -c '<cmd>'`), once:

   ```sh
   pnpm install --frozen-lockfile
   pnpm -C mobile install --frozen-lockfile   # the build bundles Orca Mobile's web app
   ```

2. Build only the AppImage, never publishing:

   ```sh
   pnpm run build:desktop
   pnpm run ensure:electron-runtime
   pnpm exec electron-builder --config config/electron-builder.config.cjs \
     --linux AppImage --x64 --publish never
   ```

   The result is `dist/orca-linux.AppImage`.

3. Attach it to a release named `claude-first-v<version>`, where `<version>` is
   `package.json`'s version plus `-claude.<n>`:

   ```sh
   gh release create claude-first-v1.4.214-claude.1 dist/orca-linux.AppImage \
     --repo nazmur96/orca --target claude-first --title "Orca (Claude) 1.4.214-claude.1"
   ```

4. In `~/NixOS/pkgs/orca-claude.nix`, bump `version` and set `sha256` to
   `nix hash file --type sha256 --base32 dist/orca-linux.AppImage`. Then run
   `nixos-rebuild switch` yourself.

The in-app updater is off in fork builds (`src/main/fork/fork-in-app-updates.ts`),
because it would install stablyai's stock releases over the fork.
