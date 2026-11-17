{
  pkgs,
  nodejs,
  lint,
  src,
  npmDependencies,
  system,
  libraryBuild,
  installedDependencies,
  setupDependencies,
}:
let
  runtimeInputs = {
    inherit
      pkgs
      nodejs
      system
      src
      setupDependencies
      ;
  };
  browserBundle = import ./browser/bundle.nix (runtimeInputs // { inherit libraryBuild; });
  integration-browser = import ./browser (runtimeInputs // { inherit browserBundle; });
  unit-js = import ./unit-js.nix {
    inherit
      pkgs
      nodejs
      system
      src
      libraryBuild
      installedDependencies
      setupDependencies
      ;
  };
  lintCheck = lint.mkCheck {
    inherit src;
    name = "events-lint";
    npmDependencies = npmDependencies // {
      inherit nodejs;
    };
  };
in
{
  inherit unit-js;
  inherit integration-browser;
  lint = lintCheck;
  runtime = pkgs.runCommand "events-check-runtime" { } ''
    mkdir -p "$out/artifacts"
    ln -s ${integration-browser} "$out/artifacts/integration-browser"
    cat > "$out/report.json" <<EOF
    {
      "schemaVersion": 1,
      "name": "runtime",
      "kind": "aggregate",
      "status": "passed",
      "system": "${system}",
      "summary": "Chromium document and dedicated-worker integration passed; not deployed-platform evidence",
      "artifacts": {
        "browser": "artifacts/integration-browser/report.json"
      }
    }
    EOF
  '';
  default = pkgs.runCommand "events-check-default" { } ''
    mkdir -p "$out/artifacts"
    ln -s ${unit-js} "$out/artifacts/unit-js"
    ln -s ${lintCheck} "$out/artifacts/lint"
    cat > "$out/report.json" <<EOF
    {
      "schemaVersion": 1,
      "name": "default",
      "kind": "aggregate",
      "status": "passed",
      "system": "${system}",
      "artifacts": {
        "unit-js": "artifacts/unit-js/report.json",
        "lint": "artifacts/lint/report.json"
      }
    }
    EOF
  '';
}
