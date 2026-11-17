{
  inputs = {
    nixpkgs-matrixai = {
      type = "indirect";
      id = "nixpkgs-matrixai";
    };
    nixpkgs.follows = "nixpkgs-matrixai/nixpkgs";
    flake-parts.follows = "nixpkgs-matrixai/flake-parts";
    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{
      nixpkgs-matrixai,
      flake-parts,
      devenv,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ devenv.flakeModule ];
      systems = [ "x86_64-linux" ];

      perSystem =
        { config, system, ... }:
        let
          pkgs = nixpkgs-matrixai.legacyPackages.${system};
          nodejs = pkgs.nodejs_24;
          lint = pkgs.matrixai-lint.withTools [
            pkgs.nixfmt
            pkgs.shellcheck
          ];
          src = nixpkgs-matrixai.lib.gitignore.gitignoreSource ./.;
          package = builtins.fromJSON (builtins.readFile ./package.json);
          npmDependencies = import ./nix/npm-deps.nix { inherit pkgs nodejs; };
          installedDependencies = pkgs.buildNpmPackage {
            pname = "library-npm-dependencies";
            version = "0";
            src = npmDependencies.npmDeps;
            inherit nodejs;
            inherit (npmDependencies) npmDeps npmConfigHook;
            dontNpmBuild = true;
            dontFixup = true;
            installPhase = ''
              mkdir -p "$out"
              mv node_modules "$out/node_modules"
            '';
          };
          setupDependencies = ''
            mkdir node_modules
            find ${installedDependencies}/node_modules -mindepth 1 -maxdepth 1 \
              -exec ln -s -t node_modules {} +
            export PATH="$PWD/node_modules/.bin:$PATH"
          '';
          libraryBuild = import ./nix/npm-build.nix {
            inherit pkgs nodejs setupDependencies;
            gitignore = nixpkgs-matrixai.lib.gitignore;
          };
          npmPackage = import ./nix/npm-package.nix {
            inherit
              pkgs
              nodejs
              src
              package
              npmDependencies
              libraryBuild
              ;
            sourceProvenance = {
              rev = if inputs.self ? dirtyRev then null else inputs.self.rev or null;
              dirtyRev = inputs.self.dirtyRev or null;
              narHash = inputs.self.narHash or null;
              dirty =
                if inputs.self ? dirtyRev then
                  true
                else if inputs.self ? rev then
                  false
                else
                  null;
            };
          };
        in
        {
          packages = {
            default = npmPackage.out;
            npm-package = npmPackage.out;
            npm-package-unpacked = npmPackage.unpacked;
          };
          formatter = lint.formatter;
          checks = import ./nix/checks {
            inherit
              pkgs
              nodejs
              lint
              src
              npmDependencies
              system
              libraryBuild
              installedDependencies
              setupDependencies
              ;
          };
          devShells.ci = config.devShells.default;
          devenv.shells.default = { lib, ... }: {
            containers = lib.mkForce { };
            devenv.root = lib.mkForce (
              let
                root = builtins.getEnv "PWD";
              in
              if root == "" then toString ./. else root
            );
            packages = [
              nodejs
              lint
              pkgs.gnutar
              pkgs.structured-madr
            ];
            env = {
              PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
              PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
              PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
              FONTCONFIG_FILE = pkgs.makeFontsConf { fontDirectories = [ pkgs.dejavu_fonts ]; };
            };
            enterShell = ''
              export PATH="${lint}/bin:$PWD/node_modules/.bin:$PATH"
            '';
          };
        };
    };
}
