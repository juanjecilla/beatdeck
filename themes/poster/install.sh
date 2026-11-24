#!/usr/bin/env bash
# Install the poster theme into a beatdeck project.
#   ./install.sh <path-to-beatdeck-project> [--example]
# Copies themes/poster.css, deck/poster.tsx, deck/a11y-kit.tsx and tools/contrast.mjs, and adds the font.
# With --example it also replaces the project's deck/ scenes with the example deck (asks nothing: run it on a fresh project).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
dest="${1:?usage: install.sh <beatdeck project> [--example]}"
[ -d "$dest/src/beatdeck" ] || { echo "$dest is not a beatdeck project (no src/beatdeck)" >&2; exit 2; }

mkdir -p "$dest/themes" "$dest/deck" "$dest/tools"
cp "$here/poster.css" "$dest/themes/poster.css"
cp "$here/components/poster.tsx" "$dest/deck/poster.tsx"
cp "$here/components/a11y-kit.tsx" "$dest/deck/a11y-kit.tsx"
cp "$here/tools/contrast.mjs" "$dest/tools/contrast.mjs"
(cd "$dest" && npm install --save @fontsource-variable/fraunces >/dev/null)

if [ "${2:-}" = "--example" ]; then
  rm -rf "$dest/deck/scenes"
  cp -R "$here/example/deck/." "$dest/deck/"
fi
echo "poster theme installed in $dest"
echo "next: import '../themes/poster.css' after neutral.css in deck/index.tsx, then: node tools/contrast.mjs"
