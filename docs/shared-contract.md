# Workmatik shared contract, schema workmatik-shared-ids-2

Status: draft for review, 10 November 2026. Extends the existing `Workmatik data` sheet (schema `workmatik-shared-ids-1`) that every app already writes. Importers must keep accepting version 1 files.

## 1. Organisation block (every app, top of page)

Fields: Organisation (required), Business unit (optional), Prepared by (optional), Date (automatic).
Each app remembers the last values in the browser and prefills them when it imports a Strategy file.

## 2. File naming (every export)

`{Organisation}_{BusinessUnit}_{toolkey}_{YYYY-MM-DD}.xlsx`

- Organisation and Business unit: letters and digits only, other runs of characters become a single hyphen, trimmed to 40 characters. Omit the unit segment if blank.
- Tool keys: `strategy`, `roles`, `workflow`, `capability`, `skills`, `skillsmap`, `roadmap`.
- Comparison and roll-up files add a suffix to the key: `workflow-comparison`, `skills-rollup`.
- The Toolkit's current export (`AI_Strategy_View_...`) becomes tool key `roadmap`. The key `strategy` is reserved for the new Strategy file.

## 3. Metadata sheet (`Workmatik data`, Field and Value columns)

Existing fields stay: Tool, Tool key, Data version, Schema, Organisation, Exported. Importers also accept the older date field names `Date` and `Assessment date`.
New fields: `Business unit` and `Prepared by`. Schema value becomes `workmatik-shared-ids-2`.
The shared helper `js/workmatik-shared.js` writes these rows, builds file names and runs the organisation check, so no app needs its own copy of that logic.

## 4. Strategy file (tool key `strategy`)

Sheet `Measures`: Measure ID, Row ID, Column ID, Measure, Baseline, Target, Owner, Rank.
- Measure IDs: `M01`, `M02`, and so on. There are no starter measures, so every measure is the user's own. Row IDs are `SR01` to `SR03` for starters and `SRC01` upwards for own rows; column IDs are `SC01` to `SC03` and `SCC01` upwards. IDs are never reused or renumbered; the file records the next numbers in `Workmatik data`.
- Rank: blank means not tracked in the toolkit, 1 to 5 means tracked in that order. Ranks are unique and renumber when one is removed (the renumbering changes Rank only, never IDs).
Sheets `Rows` and `Columns`: ID, Label, Source (`starter` or `own`). Starter rows: Build brand and trust, Win new customers, Grow existing customers. Starter columns: Speed, Quality, Cost.
Sheet `Purpose`: one cell holding the purpose and strategy sentence.

## 5. Links back to the strategy

Workflow files add a `Supports` column on the `Scoring` sheet: Measure IDs separated by semicolons, ranked measures only. Importers ignore unknown columns.
Everything else inherits, using links the apps already hold:
- Workflow to activities: the `steps` list in the workflow framework. Activity to role: the Role ID.
- Workflow to capabilities: the readiness rules in the Toolkit (`wfCaps`), meaning the capabilities the workflow's scores show it needs.
- Capability to skill domains: `catToDomains` in the Toolkit reference data.
- Own workflows with no steps, and enabler capabilities with no workflow, take a direct `Supports` tag or the marker `ALL`.
- Inherited rank is the lowest rank number among the measures an item supports.

## 6. Checks (Roadmap tab)

The Toolkit reads the strategy from its own Strategy tab, so a file is not needed there. The Workflow Assessment loads the Strategy file to offer the tags.

- Ranked measure with no workflow: "no workflow support planned".
- Workflow, capability or skill domain with no ranked measure in its chain: "not linked to purpose".
- Import of a file whose cleaned Organisation or Business unit differs from the one entered: warn, allow continue.
- Show counts only, never a score. Rank sets sequence, nothing else.

## 7. Open items

- Roles: confirm whether Own roles (RC01...) and own activities (AC001...) can appear in workflow steps.
- Confirm the Toolkit's existing priority score on workflows (value, feasibility, risk) stays as a within-rank tiebreak.
