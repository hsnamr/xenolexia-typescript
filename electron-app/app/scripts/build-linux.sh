#!/usr/bin/env bash
# Build Linux targets: always AppImage + tar.gz; add deb/rpm/pacman if the distro supports it.
# Run from electron-app/app/ (e.g. npm run electron:build:linux).

set -e

# Ensure jszip has nested readable-stream 2.x (with deps) so electron-builder's dependency check passes
# (root may have readable-stream 3.x for stream-browserify; jszip requires ~2.3.6)
# Script runs from electron-app/app; monorepo root is ../..
ROOT_NM="../../node_modules"
JSZIP_RS="$ROOT_NM/jszip/node_modules/readable-stream"
if [ -d "$ROOT_NM/jszip" ] && [ ! -d "$JSZIP_RS" ]; then
  echo "Adding readable-stream@2.x under jszip for electron-builder..."
  mkdir -p "$ROOT_NM/jszip/node_modules"
  (cd ../.. && npm install readable-stream@2.3.8 --prefix node_modules/jszip --no-save --legacy-peer-deps 2>/dev/null)
fi

# Always build these
TARGETS="AppImage tar.gz"

# Detect native package format from the current distro
if command -v dpkg >/dev/null 2>&1; then
  # Debian, Ubuntu, and derivatives
  TARGETS="$TARGETS deb"
  echo "Detected dpkg: will build .deb"
fi
if command -v rpmbuild >/dev/null 2>&1; then
  # Fedora, RHEL, openSUSE, and derivatives (electron-builder requires rpmbuild for rpm)
  TARGETS="$TARGETS rpm"
  echo "Detected rpmbuild: will build .rpm"
fi
if command -v pacman >/dev/null 2>&1; then
  # Arch Linux and derivatives
  TARGETS="$TARGETS pacman"
  echo "Detected pacman: will build .pacman"
fi

echo "Linux targets: $TARGETS"

npm run build:assets
npx electron-builder --linux $TARGETS
