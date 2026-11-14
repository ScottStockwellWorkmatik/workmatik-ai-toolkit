(function () {
  'use strict';
  // Organisation tab: an as-is snapshot of how marketing is organised today. Nothing is kept in the browser.
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var GROUPS = [
    ['Classification', 'How decisions and resources are set up', 'These three answers do most of the work in placing your organisation.'],
    ['Structure', 'How marketing is organised', ''],
    ['Governance', 'Governance and accountability', ''],
    ['Sourcing', 'Where the work and tools come from', ''],
    ['Capacity', 'Capacity and AI position', ''],
    ['Context', 'About your context', 'Answer these once for the whole function.']
  ];
  var FIELDS = [
 {
  "id": "decision_location",
  "group": "Classification",
  "q": "Where are decisions about marketing output, tools and limits made?",
  "opts": [
   "Central team decides",
   "Central sets rules, local approves",
   "Teams decide within agreed limits",
   "Individuals decide"
  ],
  "low": false
 },
 {
  "id": "resource_location",
  "group": "Classification",
  "q": "Where do AI skills, platform, data and people sit?",
  "opts": [
   "All in one central team",
   "Central platform with some specialists in teams",
   "Mostly embedded in teams with light central support",
   "Fully embedded in each team"
  ],
  "low": false
 },
 {
  "id": "team_duration",
  "group": "Classification",
  "q": "How long do your teams exist?",
  "opts": [
   "Permanent",
   "Long-running, membership changes",
   "Assembled per project or campaign",
   "Mixed: permanent core plus time-bound crews"
  ],
  "low": false
 },
 {
  "id": "org_axis",
  "group": "Structure",
  "q": "How is marketing mainly organised?",
  "opts": [
   "By function or channel",
   "By segment or market",
   "By outcome or value stream",
   "By campaign"
  ],
  "low": false
 },
 {
  "id": "working_unit",
  "group": "Structure",
  "q": "What is the usual unit of work?",
  "opts": [
   "Human team using AI tools",
   "Individual plus AI",
   "Agents running workflows under human oversight"
  ],
  "low": false
 },
 {
  "id": "exploration_unit",
  "group": "Structure",
  "q": "Is there a separate unit exploring new AI uses?",
  "opts": [
   "No",
   "Informal group",
   "Dedicated unit"
  ],
  "low": false
 },
 {
  "id": "review_model",
  "group": "Governance",
  "q": "How is AI output checked?",
  "opts": [
   "Not checked",
   "Sampled",
   "Gate before publishing",
   "Embedded checks plus a named owner"
  ],
  "low": false
 },
 {
  "id": "ai_governance_owner",
  "group": "Governance",
  "q": "Who owns AI governance for marketing?",
  "opts": [
   "No one",
   "Marketing lead",
   "CMO",
   "CEO or board",
   "Shared across functions"
  ],
  "low": false
 },
 {
  "id": "accountability_owner",
  "group": "Governance",
  "q": "Who is accountable for each AI-supported workflow's outcome and quality?",
  "opts": [
   "No named owner",
   "Workflow lead",
   "Pod or channel lead",
   "Central team"
  ],
  "low": false
 },
 {
  "id": "planning_cadence",
  "group": "Governance",
  "q": "How often do you replan priorities?",
  "opts": [
   "Annually",
   "Quarterly",
   "Monthly",
   "Continuously"
  ],
  "low": false
 },
 {
  "id": "production_sourcing",
  "group": "Sourcing",
  "q": "Where is content mostly produced?",
  "opts": [
   "Mostly in-house",
   "Mixed",
   "Mostly agencies or partners",
   "Platform-led"
  ],
  "low": false
 },
 {
  "id": "tool_sourcing",
  "group": "Sourcing",
  "q": "How are AI tools sourced?",
  "opts": [
   "Mostly bought",
   "Bought and partnered",
   "Mostly built",
   "Mixed"
  ],
  "low": false
 },
 {
  "id": "agency_dependency",
  "group": "Sourcing",
  "q": "How much of production depends on agencies or freelancers?",
  "opts": [
   "Little",
   "Some",
   "Most"
  ],
  "low": false
 },
 {
  "id": "entry_pipeline",
  "group": "Capacity",
  "q": "How do you keep an entry-level route into the team?",
  "opts": [
   "Maintained",
   "Reduced",
   "Not considered"
  ],
  "low": false
 },
 {
  "id": "ai_maturity_stage",
  "group": "Capacity",
  "q": "Where is your AI use today?",
  "opts": [
   "Not started",
   "Trials",
   "Used in some workflows",
   "Used in most workflows"
  ],
  "low": false
 },
 {
  "id": "capacity_ai_share",
  "group": "Capacity",
  "q": "What share of team time goes on AI-supported work?",
  "opts": [
   "Under 10%",
   "10-30%",
   "30-60%",
   "Over 60%"
  ],
  "low": false
 },
 {
  "id": "demand_variability",
  "group": "Context",
  "q": "How variable is campaign demand?",
  "opts": [
   "Steady",
   "Seasonal",
   "Lumpy"
  ],
  "low": false
 },
 {
  "id": "compliance_burden",
  "group": "Context",
  "q": "How heavy is regulatory or brand risk?",
  "opts": [
   "Light",
   "Moderate",
   "Heavy"
  ],
  "low": false
 },
 {
  "id": "breadth",
  "group": "Context",
  "q": "How many segments or markets do you serve?",
  "opts": [
   "One",
   "Two to five",
   "Six or more"
  ],
  "low": false
 },
 {
  "id": "data_readiness",
  "group": "Context",
  "q": "How ready are your data and platform?",
  "opts": [
   "Low",
   "Medium",
   "High"
  ],
  "low": false
 },
 {
  "id": "deal_complexity",
  "group": "Context",
  "q": "How complex is a typical sale?",
  "opts": [
   "Transactional",
   "Considered, few buyers",
   "Complex, many buyers and long cycle"
  ],
  "low": true
 },
 {
  "id": "headcount_band",
  "group": "Context",
  "q": "How large is the marketing team?",
  "opts": [
   "Under 10",
   "10-50",
   "51-200",
   "Over 200"
  ],
  "low": false
 },
 {
  "id": "skill_shape",
  "group": "Context",
  "q": "Which best describes the skills of your marketers?",
  "opts": [
   "Mostly generalists",
   "Mostly specialists",
   "T-shaped (specialist depth, broad range)",
   "Mixed"
  ],
  "low": true
 }
];

  var A = {}, OWN = {}, dirty = false, askSave = false;   // answers by field id, own options by field id
  function reset() { A = {}; OWN = {}; dirty = false; askSave = false; }
  function mark() { dirty = true; renderCount(); renderNext(); }
  function fieldById(id) { return FIELDS.filter(function (f) { return f.id === id; })[0]; }
  function optionsOf(f) { return f.opts.concat(OWN[f.id] || []); }
  function answered() { return FIELDS.filter(function (f) { return A[f.id]; }).length; }

  function renderCount() { var c = $('orgCount'); if (c) c.textContent = answered() + ' of ' + FIELDS.length + ' answered'; var b = $('orgBar'); if (b) b.style.width = (answered() / FIELDS.length * 100) + '%'; }

  function renderField(f, host) {
    var box = el('fieldset', 'oq-field'); var lg = el('legend', null, f.q); box.appendChild(lg);
    if (f.low) box.appendChild(el('p', 'hint', 'Treated as a low-weight signal: the evidence for this one is thin.'));
    var list = el('div', 'oq-opts');
    optionsOf(f).forEach(function (o) {
      var lab = el('label', 'oq-opt' + ((OWN[f.id] || []).indexOf(o) >= 0 ? ' own' : ''));
      var r = el('input'); r.type = 'radio'; r.name = 'org-' + f.id; r.value = o; r.checked = A[f.id] === o;
      r.addEventListener('change', function () { A[f.id] = o; mark(); });
      lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + o)); list.appendChild(lab);
    });
    box.appendChild(list);
    var add = el('div', 'oq-add');
    var inp = el('input'); inp.type = 'text'; inp.maxLength = 80; inp.placeholder = 'Add your own option'; inp.setAttribute('aria-label', 'Add your own option to: ' + f.q);
    var btn = el('button', 'btn small', 'Add'); btn.type = 'button';
    function addOwn() {
      var v = inp.value.replace(/\s+/g, ' ').trim(); if (!v) return;
      if (optionsOf(f).some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) { inp.value = ''; return; }
      (OWN[f.id] = OWN[f.id] || []).push(v); A[f.id] = v; dirty = true; render();
    }
    btn.addEventListener('click', addOwn); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } });
    add.appendChild(inp); add.appendChild(btn); box.appendChild(add);
    if (A[f.id]) { var clr = el('button', 'lnk', 'Clear this answer'); clr.type = 'button'; clr.addEventListener('click', function () { delete A[f.id]; dirty = true; render(); }); box.appendChild(clr); }
    host.appendChild(box);
  }

  function render() {
    var host = $('orgStep'); if (!host) return; host.textContent = '';
    host.appendChild(el('h2', null, 'Where are we now?'));
    host.appendChild(el('p', 'lead', 'A snapshot of how marketing is organised today: structure, decisions, governance, sourcing, size and AI position. Answer for the function as it is now, not as you want it to be. The Roadmap uses this with your strategy to suggest a starting organisation model.'));
    var info = el('div', 'info-box'); info.appendChild(el('strong', null, 'Keep your work. ')); info.appendChild(document.createTextNode('Nothing you enter is kept in the browser. Download the Excel file to keep your answers and load it back later. You can add your own option to any list.')); host.appendChild(info);
    var prog = el('div', 'tk-progress'); prog.setAttribute('aria-live', 'polite'); var pt = el('span'); pt.id = 'orgCount'; prog.appendChild(pt);
    var bar = el('div', 'bar'); bar.setAttribute('aria-hidden', 'true'); var bi = el('span'); bi.id = 'orgBar'; bar.appendChild(bi); prog.appendChild(bar); host.appendChild(prog);

    var acts = el('div', 'actions');
    var dl = el('button', 'btn primary', 'Download organisation file'); dl.type = 'button'; dl.id = 'btnOrgDownload'; dl.addEventListener('click', download);
    var ld = el('button', 'btn', 'Load an organisation file'); ld.type = 'button'; ld.id = 'btnOrgLoad';
    var fi = el('input'); fi.type = 'file'; fi.accept = '.xlsx'; fi.id = 'orgFile'; fi.hidden = true;
    ld.addEventListener('click', function () { fi.click(); }); fi.addEventListener('change', function (e) { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });
    var cl = el('button', 'btn', 'Clear all answers'); cl.type = 'button'; cl.id = 'btnOrgClear';
    cl.addEventListener('click', function () {
      Workmatik.confirm('Clear every answer and any options you added? Download first if you want to keep them.', { title: 'Clear your answers?', ok: 'Clear answers', danger: true }).then(function (ok) { if (ok) { reset(); $('orgMessages').textContent = ''; render(); } });
    });
    acts.appendChild(dl); acts.appendChild(ld); acts.appendChild(fi); acts.appendChild(cl); host.appendChild(acts);
    var ms = el('ul', 'messages'); ms.id = 'orgMessages'; host.appendChild(ms);

    GROUPS.forEach(function (g) {
      var fs = FIELDS.filter(function (f) { return f.group === g[0]; }); if (!fs.length) return;
      host.appendChild(el('h3', 'oq-group', g[1])); if (g[2]) host.appendChild(el('p', 'hint', g[2]));
      fs.forEach(function (f) { renderField(f, host); });
    });
    var nx = el('div', 'sm-next'); nx.id = 'orgNext'; nx.hidden = true; host.appendChild(nx);
    renderCount(); renderNext();
  }

  function openWorkflow() { window.open('../ai-workflow-assessment/', '_blank'); }
  function renderNext() {
    var host = $('orgNext'); if (!host) return; host.textContent = ''; host.hidden = false;
    host.appendChild(el('h3', null, 'Organisation done? Next, choose the work that delivers your strategy'));
    host.appendChild(el('p', 'hint', dirty
      ? 'Download your organisation file first so you keep your answers. Then open the AI Workflow Assessment.'
      : 'Your organisation file is saved. Next is the AI Workflow Assessment, where you choose the workflows that deliver your strategy.'));
    if (askSave && dirty) {
      var warn = el('div', 'flagbox'); warn.appendChild(el('strong', null, 'Your organisation file is not saved yet. ')); warn.appendChild(document.createTextNode('Nothing is kept in the browser, so changes since your last download are lost if you close this tab. Download the file now, then continue.'));
      var wa = el('div', 'actions'); var d2 = el('button', 'btn primary', 'Download organisation file'); d2.type = 'button'; d2.addEventListener('click', download);
      var sk = el('button', 'lnk', 'Continue without saving'); sk.type = 'button'; sk.addEventListener('click', openWorkflow); wa.appendChild(d2); wa.appendChild(sk); warn.appendChild(wa); host.appendChild(warn);
    }
    var act = el('div', 'actions'); var go = el('button', 'btn primary', 'Start the AI Workflow Assessment'); go.type = 'button';
    go.addEventListener('click', function () { if (dirty && answered()) { askSave = true; renderNext(); } else openWorkflow(); });
    var back = el('button', 'btn', 'Back to the Path'); back.type = 'button'; back.addEventListener('click', function () { if (window.__toolkitShowTab) window.__toolkitShowTab('path'); });
    act.appendChild(go); act.appendChild(back); host.appendChild(act);
    host.appendChild(el('p', 'hint', 'The Workflow Assessment opens in a new tab so this page keeps your answers. Keep this tab open until you have downloaded the file.'));
  }

  // ---------- Excel
  function sheets() {
    var rows = [['Field ID', 'Group', 'Question', 'Answer', 'Answer source']];
    FIELDS.forEach(function (f) { rows.push([f.id, f.group, f.q, A[f.id] || '', A[f.id] ? ((OWN[f.id] || []).indexOf(A[f.id]) >= 0 ? 'own' : 'starter') : '']); });
    var own = [['Field ID', 'Own option']]; FIELDS.forEach(function (f) { (OWN[f.id] || []).forEach(function (o) { own.push([f.id, o]); }); });
    return [
      ['Organisation', rows, [24, 16, 60, 44, 14]],
      ['Own options', own, [24, 50]],
      ['Workmatik data', Workmatik.metaRows('Workmatik AI Organisation', 'organisation', '1.0.0', [['Fields answered', answered() + ' of ' + FIELDS.length], ['Note', 'An as-is snapshot of how marketing is organised today. Field IDs are stable. Other Workmatik tools match on these IDs.']]), [26, 90]]
    ];
  }
  function download() {
    if (!Workmatik.requireOrg()) return;
    var sh = sheets(), fname = Workmatik.fileName('organisation');
    function done() { dirty = false; askSave = false; renderNext(); }
    function fallback() { var wb = XLSX.utils.book_new(); sh.forEach(function (s) { var ws = XLSX.utils.aoa_to_sheet(s[1]); ws['!cols'] = s[2].map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, s[0]); }); XLSX.writeFile(wb, fname); done(); }
    if (typeof ExcelJS === 'undefined') { fallback(); return; }
    var wb = new ExcelJS.Workbook(); wb.creator = 'Workmatik'; wb.title = 'AI Organisation';
    sh.forEach(function (s) {
      var ws = wb.addWorksheet(s[0]); s[1].forEach(function (r) { ws.addRow(r); }); s[2].forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      ws.eachRow(function (row) { row.alignment = { vertical: 'top', wrapText: true }; });
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF024873' } }; });
    });
    wb.xlsx.writeBuffer().then(function (buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); done(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }).catch(fallback);
  }
  function kvOf(ws) { var o = {}; if (ws) XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).forEach(function (r) { if (r[0] !== '' && r[0] !== 'Field') o[String(r[0])] = r[1]; }); return o; }
  function isOrganisationBook(wb) {
    var kv = kvOf(wb.Sheets['Workmatik data']); return String(kv['Tool key'] || '') === 'organisation' && !!wb.Sheets['Organisation'];
  }
  function parseFile(buf) {
    var wb = XLSX.read(buf, { type: 'array' }), W = wb.Sheets;
    if (!isOrganisationBook(wb)) throw new Error('not an organisation file');
    var own = {}, ans = {};
    if (W['Own options']) XLSX.utils.sheet_to_json(W['Own options'], { defval: '' }).forEach(function (r) { var id = String(r['Field ID']).trim(), o = String(r['Own option']).trim(); if (fieldById(id) && o) (own[id] = own[id] || []).push(o); });
    XLSX.utils.sheet_to_json(W['Organisation'], { defval: '' }).forEach(function (r) {
      var id = String(r['Field ID']).trim(), f = fieldById(id), v = String(r['Answer']).trim(); if (!f || !v) return;
      if (f.opts.indexOf(v) < 0 && (own[id] || []).indexOf(v) < 0) (own[id] = own[id] || []).push(v);   // keep an answer whose option is not in this version's list
      ans[id] = v;
    });
    return { answers: ans, own: own, kv: kvOf(W['Workmatik data']) };
  }
  function importBuffer(buf, name, msgs) {
    var p; try { p = parseFile(buf); } catch (e) { msgs.appendChild(el('li', 'bad', name + ' could not be read as a Workmatik organisation file, so it was not loaded.')); return Promise.resolve(false); }
    return Workmatik.confirmLoad(Workmatik.check(p.kv), 'The page will switch to the file\'s organisation.').then(function (go) {
      if (!go) { msgs.appendChild(el('li', 'bad', 'Not loaded: ' + name + ' is for a different organisation or business unit.')); return false; }
      Workmatik.set({ org: p.kv['Organisation'] || Workmatik.get().org, unit: p.kv['Business unit'] || '', by: p.kv['Prepared by'] || Workmatik.get().by });
      A = p.answers; OWN = p.own; dirty = false; askSave = false; render();
      var m = $('orgMessages'); if (m) m.appendChild(el('li', 'ok', name + ' loaded into the Organisation tab: ' + answered() + ' of ' + FIELDS.length + ' answered.'));
      msgs.appendChild(el('li', 'ok', name + ' loaded into the Organisation tab: ' + answered() + ' of ' + FIELDS.length + ' answered.'));
      return true;
    });
  }
  function loadFile(file) {
    var msgs = $('orgMessages'); msgs.textContent = '';
    var rd = new FileReader(); rd.onload = function () { importBuffer(rd.result, file.name, msgs); }; rd.readAsArrayBuffer(file);
  }

  function init() {
    window.addEventListener('beforeunload', function (e) { if (dirty && answered()) { e.preventDefault(); e.returnValue = ''; } });
    render();
  }
  window.WorkmatikOrganisation = { answers: function () { return A; }, own: function () { return OWN; }, fields: FIELDS, importBuffer: importBuffer, isOrganisationBook: isOrganisationBook, render: render };
  window.__renderOrganisationTab = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
