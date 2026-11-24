{
  description = "lievre: 日本語の画面のためのデザインシステム（トークン・React の部品・端末の部品）";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      inherit (nixpkgs) lib;
      systems = [
        "aarch64-darwin"
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
      version = (lib.importJSON ./packages/react/package.json).version;

      # Only what `pnpm install` and the builds read, so editing docs or references does not rebuild.
      src = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./package.json
          ./pnpm-lock.yaml
          ./pnpm-workspace.yaml
          ./DESIGN.md
          ./MIGRATION.md
          ./logo
          ./packages
        ];
      };

      # One set of node_modules (from pnpm-lock.yaml) for every package below.
      mkLievre =
        pkgs: args:
        let
          pnpm = pkgs.pnpm_12;
        in
        pkgs.stdenv.mkDerivation (
          finalAttrs:
          {
            inherit version src;
            # Fetched from pnpm-lock.yaml without network during the build. When the lockfile
            # changes, `nix run github:shiroinock/workflows#nix-hashes -- --fix .#default.pnpmDeps`
            # writes the new hash here (CI fails until then).
            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              inherit pnpm;
              fetcherVersion = 5;
              hash = "sha256-H26hZquWiLaEtrorI809Jvc9cecKrSXqEFnBmAhkcEE=";
            };
            nativeBuildInputs = [
              pkgs.nodejs_24
              pkgs.pnpm_12
              pnpm
              pkgs.pnpmConfigHook
            ]
            ++ (args.nativeBuildInputs or [ ]);
            # So that patchShebangs points bin/ scripts at this node.
            buildInputs = [ pkgs.nodejs_24 ];
            # The playwright package must not fetch browsers; nothing here runs one.
            env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          }
          // removeAttrs args [ "nativeBuildInputs" ]
        );
    in
    {
      packages = forAllSystems (
        pkgs:
        let
          nodejs = pkgs.nodejs_24;
          # Builds a script of packages/react and copies its output folder to $out.
          site =
            name: script: dir:
            mkLievre pkgs {
              pname = "lievre-${name}";
              buildPhase = ''
                runHook preBuild
                pnpm --filter @lievre/react run ${script}
                runHook postBuild
              '';
              installPhase = ''
                runHook preInstall
                cp -r packages/react/${dir} $out
                runHook postInstall
              '';
            };
        in
        {
          # The three libraries, laid out as `pnpm pack` would publish them, and lievre-migrate.
          default = mkLievre pkgs {
            pname = "lievre";
            nativeBuildInputs = [ pkgs.makeWrapper ];
            buildPhase = ''
              runHook preBuild
              pnpm --filter @lievre/react run build:lib
              pnpm --filter @lievre/tui run build
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p packs $out/lib/node_modules/@lievre
              pnpm --filter "./packages/*" pack --pack-destination "$PWD/packs"
              for name in tokens react tui; do
                mkdir -p $out/lib/node_modules/@lievre/$name
                tar -xzf packs/lievre-$name-*.tgz --strip-components=1 \
                  -C $out/lib/node_modules/@lievre/$name
              done
              makeWrapper ${lib.getExe nodejs} $out/bin/lievre-migrate \
                --add-flags $out/lib/node_modules/@lievre/react/bin/lievre-migrate.mjs
              runHook postInstall
            '';
            meta = {
              description = "lievre のライブラリ（@lievre/tokens・@lievre/react・@lievre/tui）と lievre-migrate";
              homepage = "https://github.com/shiroinock/lievre";
              mainProgram = "lievre-migrate";
              platforms = systems;
            };
          };
          demo = site "demo" "build:demo" "dist";
          storybook = site "storybook" "build:storybook" "dist/storybook";
        }
      );

      apps = forAllSystems (pkgs: {
        default = {
          type = "app";
          program = lib.getExe self.packages.${pkgs.stdenv.hostPlatform.system}.default;
          meta.description = "改名の前の名前を lievre の名前に書き換える（MIGRATION.md）";
        };
      });

      devShells = forAllSystems (
        pkgs:
        let
          # Bakes the worn fonts (scripts/wear/font.py) in place of .venv-wear/.
          wearPython = pkgs.python3.withPackages (ps: [
            ps.fonttools
            ps.brotli
          ]);
          browsers = pkgs.playwright-driver.browsers;
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_24
              pkgs.pnpm_12
              wearPython
              pkgs.nixfmt
            ];
            LIEVRE_WEAR_PYTHON = lib.getExe wearPython;
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
            # nixpkgs' Playwright is not the one in pnpm-lock.yaml, so its browser folders
            # have other names. `pnpm run test:layout` launches this headless shell by path instead.
            shellHook = ''
              for path in ${browsers}/chromium_headless_shell-*/chrome-headless-shell-*/chrome-headless-shell \
                ${browsers}/chromium_headless_shell-*/chrome-linux/headless_shell; do
                if [ -x "$path" ]; then
                  export LIEVRE_CHROMIUM="$path"
                  break
                fi
              done
            '';
          };
        }
      );

      checks = forAllSystems (pkgs: {
        default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      });

      formatter = forAllSystems (pkgs: pkgs.nixfmt-tree);
    };
}
