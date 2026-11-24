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

      # Only what `npm ci` and the builds read, so editing docs or references does not rebuild.
      src = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./package.json
          ./package-lock.json
          ./.npmrc
          ./DESIGN.md
          ./MIGRATION.md
          ./logo
          ./packages
        ];
      };

      # One set of node_modules (from package-lock.json) for every package below.
      mkLievre =
        pkgs: args:
        pkgs.buildNpmPackage (
          {
            inherit version src;
            nodejs = pkgs.nodejs_24;
            npmDepsHash = "sha256-mDXKb6pogNV1Xv3d8vqv5EOr+OaES6KtzF1mgoaKRHk=";
            # The npm playwright package must not fetch browsers; nothing here runs one.
            env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          }
          // args
        );
    in
    {
      packages = forAllSystems (
        pkgs:
        let
          nodejs = pkgs.nodejs_24;
          # Builds an npm script of packages/react and copies its output folder to $out.
          site =
            name: script: dir:
            mkLievre pkgs {
              pname = "lievre-${name}";
              buildPhase = ''
                runHook preBuild
                npm run ${script} -w packages/react
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
          # The three libraries, laid out as `npm pack` would publish them, and lievre-migrate.
          default = mkLievre pkgs {
            pname = "lievre";
            nativeBuildInputs = [ pkgs.makeWrapper ];
            buildPhase = ''
              runHook preBuild
              npm run build:lib -w packages/react
              npm run build -w packages/tui
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p packs $out/lib/node_modules/@lievre
              # The deps cache is read-only; packing only needs somewhere to write.
              npm pack --offline --cache "$TMPDIR/npm-cache" --pack-destination packs -w packages/tokens -w packages/react -w packages/tui
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
              wearPython
              pkgs.nixfmt
            ];
            LIEVRE_WEAR_PYTHON = lib.getExe wearPython;
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
            # nixpkgs' Playwright is not the npm one (package-lock.json), so its browser folders
            # have other names. `npm run test:layout` launches this headless shell by path instead.
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
