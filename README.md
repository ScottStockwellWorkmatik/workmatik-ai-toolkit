# Workmatik AI Toolkit

One page that guides people through the Workmatik AI tools and then joins their Excel files into a single AI roadmap that traces back to the organisation's strategy.

Tabs: Path (seven steps with links and a progress tick-list), Strategy (purpose, matrix of measures, priority ranks; XLSX download and load), Files (load the XLSX files from the other tools), Roadmap (priorities and what supports them, sequence, foundations, skills; XLSX download), Rules (editable thresholds), How to use.

Shared files: css/workmatik-shared.css and js/workmatik-shared.js hold the organisation block, file naming and metadata used by every app. This repo is the single source; run scripts/sync-shared.sh to copy them into the other app repos. See docs/shared-contract.md.

Static site, browser-only. Files are read locally and never uploaded. Nothing is stored in the browser: the organisation block, progress ticks and strategy are cleared when the page closes, and the page asks before leaving. Tool links point to https://scottstockwellworkmatik.github.io/ (edit BASE in js/path.js if the account changes).

Replaces the separate ai-strategy-view repo. The Journey Map tab embeds a copy of that page from the journey/ folder (iframe, ?embed=1). The Framework tab is inline in index.html with styles scoped in css/framework.css.
