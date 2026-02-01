#!/usr/bin/env bash
# Build Linux targets: always AppImage + tar.gz; add deb/rpm/pacman if the distro supports it.
# Run from electron-app/app/ (e.g. npm run electron:build:linux).

set -e

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
