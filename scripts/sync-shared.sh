#!/bin/sh
# Copies the shared Workmatik files from this repo (the single source) into the other app repos.
# Run from anywhere. Expects the repos to sit side by side in the same parent folder.
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PARENT="$(dirname "$HERE")"
for app in ai-roles-assessment ai-workflow-assessment ai-capability-assessment ai-skills-assessment ai-skills-map; do
  if [ -d "$PARENT/$app" ]; then
    mkdir -p "$PARENT/$app/css" "$PARENT/$app/js"
    cp "$HERE/css/workmatik-shared.css" "$PARENT/$app/css/"
    cp "$HERE/js/workmatik-shared.js" "$PARENT/$app/js/"
    echo "synced $app"
  else
    echo "skipped $app (folder not found)"
  fi
done
