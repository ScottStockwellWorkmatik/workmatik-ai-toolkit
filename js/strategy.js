(function () {
  'use strict';
  var REF = null;
  var F = { roles: null, workflow: null, capability: null, map: null, skills: [] };
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function round1(n) { return Math.round(n * 10) / 10; }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
  function numv(id, d) { var v = parseFloat($(id).value); return isNaN(v) ? d : v; }

  (function () {
    var img = $('logoScreen'); if (!img) return;
    function swap() { var w = el('p', 'logo wordmark', 'Workmatik'); if (img.parentNode) img.parentNode.replaceChild(w, img); }
    if (img.complete && img.naturalWidth === 0) swap(); else img.addEventListener('error', swap);
  })();

  fetch('data/reference.json?v=1').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { REF = d; init(); })
    .catch(function () { var e = $('loadError'); e.textContent = 'The reference data could not be loaded. If you opened this file directly from your computer, use the published web address instead.'; e.hidden = false; });

  // ---------- helpers on reference data
  function capById(id) { return REF.capabilities.filter(function (c) { return c.id === id; })[0]; }
  function domById(id) { return REF.skillDomains.filter(function (d) { return d.id === id; })[0]; }
  function serialToIso(v) {
    if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v == null ? '' : v).slice(0, 20);
  }
  function normWfId(id) { id = String(id || '').trim(); var m = /^W(\d{2})$/.exec(id); return m ? 'WF' + m[1] : id; }
  function rowsOf(ws) { return XLSX.utils.sheet_to_json(ws, { defval: '' }); }
  function kv(ws) { var o = {}; if (ws) XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).forEach(function (r) { if (r[0] !== '' && r[0] !== 'Field') o[String(r[0])] = r[1]; }); return o; }

  // ---------- parsers
  function parseRoles(wb) {
    var ws = wb.Sheets['Selected activities'], d = kv(wb.Sheets['Workmatik data']);
    var rows = rowsOf(ws).filter(function (r) { return String(r['Activity ID']).trim(); }).map(function (r) {
      return { id: String(r['Activity ID']).trim(), rid: String(r['Role ID']).trim(), group: String(r['Group']), role: String(r['Role']), task: String(r['Task']), activity: String(r['Activity']), cls: String(r['AI Suitability Classification']), custom: /^AC/.test(String(r['Activity ID'])) };
    });
    var meta = {}; if (wb.Sheets['Role details']) rowsOf(wb.Sheets['Role details']).forEach(function (r) { var nm = String(r['Role']).trim(); if (!nm) return; var m = {}, f = parseFloat(r['FTE today']); if (String(r['Usual level']).trim()) m.level = String(r['Usual level']).trim(); if (String(r['Usual work mode']).trim()) m.mode = String(r['Usual work mode']).trim(); if (String(r['Team'] === undefined ? '' : r['Team']).trim()) m.team = String(r['Team']).trim(); if (!isNaN(f) && f >= 0) m.fte = f; if (Object.keys(m).length) meta[nm] = m; });
    var totals = {}; if (wb.Sheets['All activities']) rowsOf(wb.Sheets['All activities']).forEach(function (r) { var nm = String(r['Role']).trim(); if (nm) totals[nm] = (totals[nm] || 0) + 1; });
    return { kind: 'roles', kv: d, org: String(d['Organisation'] || ''), date: serialToIso(d['Exported']), rows: rows, meta: meta, totals: totals };
  }
  function wfCaps(sc, tier) {
    var out = [];
    if (sc.F1 <= 2) out.push(['W1', 'Repeatability scored 2 or below']);
    if (sc.F2 <= 2) out.push(['D2', 'Data and content readiness scored 2 or below']);
    if (sc.F3 <= 2) out.push(['D4', 'Tool and integration readiness scored 2 or below']);
    if (sc.R1 >= 4 || sc.R2 >= 4 || tier === 'limited' || tier === 'high') { out.push(['G1', 'High risk or limited/high EU AI Act tier']); out.push(['G4', 'High risk or limited/high EU AI Act tier']); }
    if (sc.R1 >= 3) out.push(['W3', 'Consequence of an error scored 3 or above']);
    return out;
  }
  function parseWorkflow(wb) {
    var ws = wb.Sheets['Scoring'], sm = kv(wb.Sheets['Summary']);
    var tv = parseFloat(sm['Value is high above']) || 3, tf = parseFloat(sm['Feasibility is high above']) || 3, rows = [], unscored = 0, off = 0;
    var stepRoles = {}, decs = {};
    if (wb.Sheets['Steps']) rowsOf(wb.Sheets['Steps']).forEach(function (r) {
      if (String(r['Included']).toUpperCase() === 'N' || !String(r['Role'] || '').trim()) return;
      var k = normWfId(r['Workflow ID']); (stepRoles[k] = stepRoles[k] || {})[String(r['Role']).trim()] = 1;
    });
    if (wb.Sheets['Steps']) rowsOf(wb.Sheets['Steps']).forEach(function (r) {
      if (String(r['Included']).toUpperCase() === 'N' || String(r['Decision point'] === undefined ? '' : r['Decision point']).toUpperCase() !== 'Y') return;
      var k = normWfId(r['Workflow ID']); (decs[k] = decs[k] || []).push({ activity: String(r['Activity'] || ''), by: String(r['Decided by'] || '').trim() });
    });
    rowsOf(ws).forEach(function (row) {
      if (String(row['Included']).toUpperCase() === 'N') { off++; return; }
      var sc = {}, got = 0; ['V1', 'V2', 'F1', 'F2', 'F3', 'R1', 'R2'].forEach(function (k) { var n = parseInt(row[k], 10); if (n >= 1 && n <= 5) { sc[k] = n; got++; } });
      if (got !== 7) { unscored++; return; }
      var tier = String(row['EU AI Act tier'] || 'minimal').trim();
      var v = (sc.V1 + sc.V2) / 2, f = (sc.F1 + sc.F2 + sc.F3) / 3, r = (sc.R1 + sc.R2) / 2;
      var quad = tier === 'prohibited' ? 'prohibited' : (v > tv && f > tf) ? 'start' : (v > tv) ? 'prepare' : (f > tf) ? 'quick' : 'park';
      rows.push({ id: normWfId(row['ID']), name: String(row['Workflow']), group: String(row['Group'] || ''), own: String(row['Source']).toLowerCase() === 'own', v: v, f: f, r: r, tier: tier, quad: quad, priority: Math.round(v * f / 25 * 100 * (1 - 0.1 * (r - 1))), caps: wfCaps(sc, tier), supports: String(row['Supports'] || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean), roles: Object.keys(stepRoles[normWfId(row['ID'])] || {}), hours: (function () { var h = parseFloat(row['Hours a month (estimate)']); return isNaN(h) || h < 0 ? null : h; })(), decisions: decs[normWfId(row['ID'])] || [] });
    });
    return { kind: 'workflow', kv: kv(wb.Sheets['Workmatik data']), org: String(sm['Organisation or function'] || ''), date: serialToIso(sm['Assessment date']), rows: rows, unscored: unscored, off: off };
  }
  function parseCapability(wb) {
    var ws = wb.Sheets['Scoring'], sm = kv(wb.Sheets['Summary']), scores = {}, oos = {}, n = 0;
    rowsOf(ws).forEach(function (r) {
      var id = String(r['ID']).trim(); if (!capById(id)) return;
      var s = parseInt(r['Score (1-5)'], 10); if (s >= 1 && s <= 5) { scores[id] = s; n++; }
      if (String(r['Out of scope']).toUpperCase() === 'Y') oos[id] = true;
    });
    return { kind: 'capability', kv: kv(wb.Sheets['Workmatik data']), org: String(sm['Organisation or function'] || ''), date: serialToIso(sm['Assessment date']), scores: scores, oos: oos, n: n };
  }
  function parseSkills(wb) {
    var m = kv(wb.Sheets['Meta']), scores = [];
    var rater = String(m['Rater type'] || '').toLowerCase(), team = rater === 'team';
    var by = {}; XLSX.utils.sheet_to_json(wb.Sheets['Assessment'], { header: 1, defval: '' }).forEach(function (r, i) { if (i === 0) return; var id = Number(r[0]), s = Number(r[2]); if (Number.isInteger(id) && isFinite(s) && r[2] !== '' && s >= 0 && s <= 4 && (team || Number.isInteger(s))) by[id] = s; });
    for (var i = 0; i < REF.skillDomains.length; i++) { if (by[i] === undefined) throw new Error('missing domain'); scores.push(by[i]); }
    var people = team ? Math.max(1, parseInt(m['People'], 10) || 1) : 1;
    return { kind: 'skills', kv: kv(wb.Sheets['Workmatik data']), org: String(m['Team'] || ''), name: String(m['Name'] || ''), rater: String(m['Rater type'] || ''), date: serialToIso(m['Date']), scores: scores, team: team, people: people };
  }
  function parseMap(wb) {
    var rows = rowsOf(wb.Sheets['Data']), out = [], org = '';
    rows.forEach(function (r) {
      var tag = String(r['Skill Tag']).trim(); var ms = REF.mapSkills.filter(function (s) { return s.tag === tag; })[0]; if (!ms) return;
      org = org || String(r['Organisation Name'] || '');
      out.push({ id: ms.id, tag: tag, title: String(r['Skill Title']), rank: parseInt(r['Organisation Rank'], 10), cov: parseInt(r['Coverage'], 10) });
    });
    if (!out.length) throw new Error('no skills');
    return { kind: 'map', kv: kv(wb.Sheets['Workmatik data']), org: org, date: '', rows: out };
  }
  function detect(wb) {
    var S = wb.Sheets;
    if (S['Selected activities']) return parseRoles(wb);
    if (S['Scoring']) {
      var first = rowsOf(S['Scoring'])[0] || {};
      if ('V1' in first && 'F1' in first) return parseWorkflow(wb);
      if ('Score (1-5)' in first) return parseCapability(wb);
    }
    if (S['Assessment'] && S['Meta'] && kv(S['Meta'])['Tool'] === 'Workmatik AI Skills Assessment') return parseSkills(wb);
    if (S['Data'] && S['Matrix']) return parseMap(wb);
    throw new Error('unrecognised');
  }
  var LABEL = { roles: 'AI Roles Assessment', workflow: 'AI Workflow Assessment', capability: 'AI Capability Assessment', skills: 'AI Skills Assessment', map: 'Marketing Skills Map' };

  // ---------- load
  function readBuf(file) { return new Promise(function (res, rej) { var rd = new FileReader(); rd.onload = function () { res(rd.result); }; rd.onerror = rej; rd.readAsArrayBuffer(file); }); }
  function loadFiles(list) {
    var msgs = $('loadMessages'); var chain = Promise.resolve();
    Array.prototype.slice.call(list).forEach(function (f) {
      chain = chain.then(function () {
        if (!/\.xlsx$/i.test(f.name)) { msgs.appendChild(el('li', 'bad', f.name + ' was skipped: only .xlsx files are accepted.')); return; }
        if (f.size > 5 * 1024 * 1024) { msgs.appendChild(el('li', 'bad', f.name + ' was skipped: larger than 5 MB.')); return; }
        return readBuf(f).then(function (buf) {
          var wbk = null; try { wbk = XLSX.read(buf, { type: 'array' }); } catch (e) {}
          if (wbk && window.WorkmatikStrategy && window.WorkmatikStrategy.isStrategyBook(wbk)) { window.WorkmatikStrategy.importBuffer(buf, f.name, msgs); return; }
          if (wbk && window.WorkmatikOrganisation && window.WorkmatikOrganisation.isOrganisationBook(wbk)) { window.WorkmatikOrganisation.importBuffer(buf, f.name, msgs); return; }
          var p; try { p = detect(wbk || XLSX.read(buf, { type: 'array' })); } catch (e) { msgs.appendChild(el('li', 'bad', f.name + ' was not recognised as a file from a Workmatik tool.')); return; }
          p.file = f.name;
          var fk = Object.assign({}, p.kv || {}); if (!fk['Organisation'] && p.kind !== 'skills') fk['Organisation'] = p.org;
          var chk = Workmatik.check(fk); Workmatik.prefillFrom(fk);
          if (!chk.ok) msgs.appendChild(el('li', 'bad', 'Check: ' + f.name + ' was loaded, but ' + chk.message));
          if (p.kind === 'skills') {
            if (F.skills.some(function (s) { return s.file === p.file && s.name === p.name && s.rater === p.rater && s.date === p.date; })) { msgs.appendChild(el('li', 'bad', f.name + ' is already loaded.')); return; }
            F.skills.push(p);
          } else {
            if (p.kind === 'map') { msgs.appendChild(el('li', 'ok', f.name + ': Marketing Skills Map file recognised. It is reference only and is not used in the roadmap.')); return; }
            var had = F[p.kind]; F[p.kind] = p;
            if (had) msgs.appendChild(el('li', 'ok', f.name + ' replaced ' + had.file + '.'));
          }
          msgs.appendChild(el('li', 'ok', f.name + ': ' + LABEL[p.kind] + '.'));
        });
      });
    });
    chain.then(function () { renderFiles(); if (!$('panel-roadmap').hidden) renderRoadmap(); });
  }
  function loadedItems() {
    var out = [];
    ['roles', 'workflow', 'capability'].forEach(function (k) { if (F[k]) out.push(F[k]); });
    F.skills.forEach(function (s) { out.push(s); });
    return out;
  }
  function detailOf(p) {
    if (p.kind === 'roles') return plural(p.rows.length, 'activity', 'activities') + ' in scope';
    if (p.kind === 'workflow') return plural(p.rows.length, 'scored workflow', 'scored workflows') + (p.unscored ? ', ' + p.unscored + ' not fully scored' : '');
    if (p.kind === 'capability') return plural(p.n, 'capability', 'capabilities') + ' scored';
    if (p.kind === 'skills') return p.team ? (p.name || 'Team') + ', team file, ' + plural(p.people, 'person', 'people') : (p.name || 'Unnamed') + ', ' + p.rater;
    return plural(p.rows.length, 'skill', 'skills') + ' ranked';
  }
  function renderFiles() {
    var t = $('fileTable'); t.textContent = '';
    var items = loadedItems();
    var hr = el('tr'); ['Tool', 'File', 'Organisation or team', 'Date', 'What it holds'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    var th = el('thead'); th.appendChild(hr); t.appendChild(th); var tb = el('tbody');
    if (!items.length) { var tr0 = el('tr'); var td0 = el('td', null, 'No files loaded yet.'); td0.colSpan = 5; tr0.appendChild(td0); tb.appendChild(tr0); }
    items.forEach(function (p) { var tr = el('tr'); [LABEL[p.kind], p.file, p.org, p.date, detailOf(p)].forEach(function (c) { tr.appendChild(el('td', null, c)); }); tb.appendChild(tr); });
    t.appendChild(tb);
    var missing = ['roles', 'workflow', 'capability'].filter(function (k) { return !F[k]; }).map(function (k) { return LABEL[k]; });
    if (!F.skills.length) missing.push(LABEL.skills);
    var note = $('missingNote'); if (!note) { note = el('p', 'hint'); note.id = 'missingNote'; $('fileTable').parentNode.parentNode.insertBefore(note, $('fileTable').parentNode.nextSibling); }
    note.textContent = missing.length && items.length ? 'Not loaded: ' + missing.join('; ') + '. Those sections will not appear.' : '';
  }

  // ---------- compute
  function rules() { return { cap: numv('rCap', 2), first: numv('rFirst', 3), skill: numv('rSkill', 1.5) }; }
  function compute() {
    var R = rules(), out = { R: R, warnings: [] };
    var cap = F.capability, wf = F.workflow;
    function capStatus(id) {
      if (!cap) return 'unknown';
      if (cap.oos[id]) return 'oos';
      var s = cap.scores[id]; if (!(s >= 1)) return 'unscored';
      return s <= R.cap ? 'weak' : 'ok';
    }
    out.capStatus = capStatus;
    out.workflows = [];
    if (wf) {
      var start = wf.rows.filter(function (w) { return w.quad === 'start'; }).sort(function (a, b) { return b.priority - a.priority; });
      var startRank = {}; start.forEach(function (w, i) { startRank[w.id] = i; });
      wf.rows.slice().sort(function (a, b) { return b.priority - a.priority || a.name.localeCompare(b.name); }).forEach(function (w) {
        var bl = w.caps.map(function (c) { return { id: c[0], why: c[1], status: capStatus(c[0]) }; });
        var weak = bl.filter(function (b) { return b.status === 'weak'; });
        var wave;
        if (w.quad === 'prohibited') wave = 'hold-prohibited';
        else if (w.quad === 'park') wave = 'hold';
        else if (w.quad === 'start') wave = weak.length ? 'fix' : (startRank[w.id] < R.first ? 'now' : 'next');
        else if (w.quad === 'prepare') wave = 'fix';
        else wave = weak.length ? 'fix' : 'quick';
        out.workflows.push({ w: w, blockers: bl, weak: weak, wave: wave });
      });
    }
    // foundations
    var fnd = {};
    out.workflows.filter(function (x) { return x.wave === 'fix'; }).forEach(function (x) {
      x.weak.forEach(function (b) { var c = capById(b.id); if (!c) return; (fnd[b.id] = fnd[b.id] || { cap: c, wfs: [] }).wfs.push(x.w); });
    });
    out.foundations = Object.keys(fnd).map(function (k) { return fnd[k]; }).sort(function (a, b) { return a.cap.phase - b.cap.phase || b.wfs.length - a.cap.wfs - 0 || b.wfs.length - a.wfs.length; });
    out.foundations.sort(function (a, b) { return a.cap.phase - b.cap.phase || b.wfs.length - a.wfs.length || a.cap.id.localeCompare(b.cap.id); });
    out.checks = [];
    if (cap && wf) {
      var seen = {};
      out.workflows.filter(function (x) { return x.wave === 'now' || x.wave === 'next' || x.wave === 'quick'; }).forEach(function (x) {
        x.blockers.filter(function (b) { return b.status === 'unscored'; }).forEach(function (b) { if (!seen[b.id]) { seen[b.id] = 1; out.checks.push(capById(b.id)); } });
      });
    }
    // skills
    out.domains = null;
    if (F.skills.length) {
      out.domains = REF.skillDomains.map(function (d, i) {
        // A team file already holds the average of its people, so when one is loaded it stands in for the individual files and nobody is counted twice.
        var pool = F.skills.filter(function (s) { return s.team; }); if (!pool.length) pool = F.skills;
        var tot = pool.reduce(function (a, s) { return a + (s.people || 1); }, 0), avg = pool.reduce(function (a, s) { return a + s.scores[i] * (s.people || 1); }, 0) / tot, vals = { length: tot };
        var by = []; out.foundations.forEach(function (f) { if ((REF.catToDomains[String(f.cap.cat)] || []).indexOf(d.id) >= 0) by.push(f.cap.id); });
        return { d: d, avg: avg, n: vals.length, gap: avg <= R.skill, by: by };
      });
    }
    out.strat = buildStrategy(out);
    if (out.strat) out.workflows.sort(function (a, b) { return (out.strat.wfRank[a.w.id] || 99) - (out.strat.wfRank[b.w.id] || 99); });
    // consistency
    var orgs = {}; loadedItems().forEach(function (p) { if (p.org && p.kind !== 'skills') orgs[p.org.toLowerCase()] = p.org; });
    if (Object.keys(orgs).length > 1) out.warnings.push('The files name different organisations or functions (' + Object.keys(orgs).map(function (k) { return orgs[k]; }).join('; ') + '). Check they belong together.');
    if (wf && !cap) out.warnings.push('No capability file is loaded, so no workflow is held back for a weak capability. Load the AI Capability Assessment file to test readiness.');
    if (cap && !wf) out.warnings.push('No workflow file is loaded, so capabilities cannot be linked to workflows.');
    return out;
  }

  // ---------- strategy join
  function buildStrategy(C) {
    var SM = window.WorkmatikStrategy; if (!SM) return null;
    var ms = SM.ranked(); if (!ms.length) return null;
    var st = SM.state(), rowL = {}, colL = {};
    st.rows.forEach(function (r) { rowL[r.id] = r.label; }); st.cols.forEach(function (c) { colL[c.id] = c.label; });
    var items = ms.map(function (m) { return { m: m, where: (rowL[m.row] || '') + ' · ' + (colL[m.col] || ''), wfs: [], caps: {}, doms: {}, roles: {} }; });
    var byId = {}; items.forEach(function (i) { byId[i.m.id] = i; });
    var wfRank = {}, capRank = {}, domRank = {};
    C.workflows.forEach(function (x) {
      (x.w.supports || []).forEach(function (id) {
        var it = byId[id]; if (!it) return;
        it.wfs.push(x); wfRank[x.w.id] = Math.min(wfRank[x.w.id] || 99, it.m.rank);
        (x.w.roles || []).forEach(function (r) { it.roles[r] = 1; });
        x.blockers.forEach(function (b) {
          it.caps[b.id] = b; capRank[b.id] = Math.min(capRank[b.id] || 99, it.m.rank);
          var c = capById(b.id); if (!c) return;
          (REF.catToDomains[String(c.cat)] || []).forEach(function (d) { it.doms[d] = 1; domRank[d] = Math.min(domRank[d] || 99, it.m.rank); });
        });
      });
    });
    var hasWf = !!F.workflow, flags = {};
    if (hasWf) {
      flags.noWorkflow = items.filter(function (i) { return !i.wfs.length; }).length;
      flags.wfNotLinked = C.workflows.filter(function (x) { return x.wave !== 'hold-prohibited' && !wfRank[x.w.id]; }).length;
      flags.capNotLinked = C.foundations.filter(function (f) { return !capRank[f.cap.id]; }).length;
    }
    if (C.domains) flags.domNotLinked = C.domains.filter(function (d) { return d.gap && !domRank[d.d.id]; }).length;
    return { items: items, wfRank: wfRank, capRank: capRank, domRank: domRank, flags: flags, purpose: st.purpose || '', hasWf: hasWf };
  }

  // ---------- render
  function table(heads, rows, numCols, widths) {
    var wrap = el('div', 'table-scroll'), t = el('table', 'rank-table fixed'), hr = el('tr');
    if (widths) { var cg = el('colgroup'); widths.forEach(function (w) { var c = el('col'); c.style.width = w + '%'; cg.appendChild(c); }); t.appendChild(cg); }
    heads.forEach(function (h) { hr.appendChild(el('th', null, h)); }); var th = el('thead'); th.appendChild(hr); t.appendChild(th);
    var tb = el('tbody'); rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c, i) { tr.appendChild(el('td', (numCols || []).indexOf(i) >= 0 ? 'num' : null, c == null ? '' : String(c))); }); tb.appendChild(tr); }); t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  function section(title, hint) { var c = el('div', 'card'); c.appendChild(el('h2', null, title)); if (hint) c.appendChild(el('p', 'hint', hint)); return c; }
  function statusText(s) { return s === 'weak' ? 'weak' : s === 'unscored' ? 'not yet scored' : s === 'oos' ? 'out of scope' : s === 'ok' ? 'ok' : 'not checked'; }
  var WAVES = [['now', 'Start now'], ['next', 'Start next'], ['quick', 'Quick wins'], ['fix', 'Fix first, then build'], ['hold', 'Hold'], ['hold-prohibited', 'Do not proceed']];


  // Workflow and role signals for the model score. A signal is only produced when its file is loaded.
  function signals() {
    var out = { wf: null, roles: null }, w = F.workflow, r = F.roles;
    if (w && w.rows && w.rows.length) {
      var n = w.rows.length, risky = 0, ready = 0, rolesSum = 0;
      w.rows.forEach(function (x) { if (x.r >= 3.5 || x.tier === 'high') risky++; if (x.quad === 'start' || x.quad === 'quick') ready++; rolesSum += (x.roles || []).length; });
      out.wf = { n: n, riskShare: risky / n, readyShare: ready / n, avgRoles: rolesSum / n };
      var anyDec = w.rows.some(function (x) { return x.decisions && x.decisions.length; });
      if (anyDec) out.wf.decShare = w.rows.filter(function (x) { return x.decisions && x.decisions.length; }).length / n;
    }
    if (r && r.rows && r.rows.length) {
      var nAct = r.rows.length, auto = r.rows.filter(function (x) { return x.cls === 'Full automation'; }).length, names = {}, meta = r.meta || {};
      r.rows.forEach(function (x) { names[x.role] = 1; });
      var roleList = Object.keys(names), modeOf = function (nm) { return meta[nm] && meta[nm].mode ? String(meta[nm].mode) : ''; };
      var withMode = roleList.filter(function (nm) { return modeOf(nm); }), cnt = function (re) { return withMode.filter(function (nm) { return re.test(modeOf(nm)); }).length; };
      out.roles = { n: nAct, roles: roleList.length, autoShare: auto / nAct };
      if (withMode.length) { out.roles.orchShare = (cnt(/^(Orchestrator|Builder)/i)) / withMode.length; out.roles.govShare = cnt(/^Governor/i) / withMode.length; }
    }
    return out;
  }
  function renderModel(host, C) {
    var AR = window.WorkmatikArchetypes, SM = window.WorkmatikStrategy; if (!AR || !SM || !SM.ranked().length) return null;
    var capScores = F.capability ? F.capability.scores : null, oos = F.capability ? F.capability.oos : null, dom = null;
    if (C.domains) { dom = {}; C.domains.forEach(function (d) { dom[d.d.id] = d.avg; }); }
    var g = AR.gapLevels(capScores, oos, dom), ans = window.WorkmatikOrganisation ? window.WorkmatikOrganisation.answers() : {}, sig = signals(), rec = AR.recommend(SM.state(), g.levels, ans, false, sig);
    var sec = section('Recommended starting model, to test with your team', 'Points come from your ranked strategy priorities (first choice 2, second choice 1, divided by rank), your Organisation answers, and signals in your Workflow and Roles files. Capability and skills gaps lower a model\u2019s score and are shown as gaps to close. They never remove a model. Weights are working hypotheses.');
    if (!rec.best) { sec.appendChild(el('p', null, 'No ranked priority points to a model yet. Give at least one measure a priority on the Strategy tab.')); host.appendChild(sec); return null; }
    var b = rec.best;
    sec.appendChild(el('h3', null, 'Best fit: ' + b.name + (b.notReady ? ' (not ready yet)' : '')));
    if (rec.runnerUp) sec.appendChild(el('p', null, 'Runner-up: ' + rec.runnerUp.name + (rec.runnerUp.notReady ? ' (not ready yet)' : '') + '. It scores within ' + rec.margin + ' points of the best fit, so the case for each is close. Both are worth testing, and the choice is yours.'));
    if (rec.exploration) sec.appendChild(el('p', null, 'Add an exploration unit (+ exploration unit). Your strategy needs new customers as well as efficiency, and the team is large enough to fund a separate unit.'));
    sec.appendChild(table(['Model', 'Strategy points', 'Context points', 'Workflow and role points', 'Gap penalty', 'Score', 'Model-specific gaps'], rec.rows.map(function (r) { return [r.name + (r.notReady ? ' (not ready yet)' : ''), round1(r.strategy), round1(r.context), round1(r.signals), r.penalty ? '-' + round1(r.penalty) : 0, round1(r.score), r.gaps.length ? r.gaps.map(function (x) { return x.name + (x.level === 2 ? ' (large)' : ' (partial)'); }).join('; ') : 'None found']; }), [1, 2, 3, 4, 5], [20, 9, 9, 11, 9, 8, 34]));
    renderShape(sec);
    renderToday(sec, ans, b);
    renderTeamsEffort(sec);
    if (rec.common.length) { sec.appendChild(el('h3', null, 'Gaps that affect every model')); sec.appendChild(el('p', null, 'Fix these whichever model you choose: ' + rec.common.map(function (x) { return x.name + (x.level === 2 ? ' (large)' : ' (partial)'); }).join('; ') + '. They are left out of the model scores, apart from the extra weight a model puts on them.')); }
    sec.appendChild(el('h3', null, 'Why ' + b.name));
    var ul = el('ul'); b.why.forEach(function (w) { ul.appendChild(el('li', null, 'Strategy: ' + w.cell + ' (priority ' + w.rank + ') adds ' + round1(w.points) + '.')); });
    b.contextWhy.forEach(function (w) { ul.appendChild(el('li', null, 'Organisation: ' + w.text + ' (' + w.answer + ') adds ' + round1(w.points) + '.')); });
    b.signalWhy.forEach(function (w) { ul.appendChild(el('li', null, (w.src === 'wf' ? 'Workflows: ' : 'Roles: ') + w.text + ' (' + (w.pct ? Math.round(w.value * 100) + '%' : round1(w.value)) + ') adds ' + round1(w.points) + '.')); });
    sec.appendChild(ul);
    sec.appendChild(el('h3', null, 'Gaps against ' + b.name));
    if (b.gaps.length) { var gl = el('ul'); b.gaps.forEach(function (w) { gl.appendChild(el('li', null, w.name + (w.level === 2 ? ' (large)' : ' (partial)') + ' lowers the score by ' + round1(w.points) + '.')); }); sec.appendChild(gl); }
    else sec.appendChild(el('p', null, 'No gaps specific to this model were found.'));
    sec.appendChild(el('h3', null, 'What would change the answer'));
    if (rec.flips.length) { var fl = el('ul'); rec.flips.slice(0, 5).forEach(function (f) { fl.appendChild(el('li', null, 'If ' + f.field.replace(/_/g, ' ') + ' were \u201c' + f.to + '\u201d (now ' + f.from + '), the best fit would be ' + f.model + '.')); }); sec.appendChild(fl); }
    else sec.appendChild(el('p', null, 'No single Organisation answer would change the best fit.'));
    var miss = []; if (!sig.wf) miss.push('AI Workflow Assessment'); if (!sig.roles) miss.push('AI Roles Assessment');
    if (miss.length) sec.appendChild(el('p', 'hint', 'Workflow and role signals not counted: load the ' + miss.join(' and ') + ' file' + (miss.length > 1 ? 's' : '') + ' to add them. Missing files add no points to any model.'));
    var nOrg = ['compliance_burden', 'ai_maturity_stage', 'breadth', 'data_readiness', 'headcount_band', 'demand_variability'].filter(function (k) { return !ans[k]; });
    if (nOrg.length) sec.appendChild(el('p', 'hint', 'Not yet answered on the Organisation tab: ' + nOrg.map(function (k) { return k.replace(/_/g, ' '); }).join(', ') + '. Answering these will sharpen the recommendation.'));
    var na = Object.keys(g.assessed).filter(function (k) { return !g.assessed[k]; });
    if (na.length) sec.appendChild(el('p', 'hint', 'Not assessed, so no gap counted: ' + na.map(function (k) { return AR.gapAreas.filter(function (a) { return a.id === k; })[0].name; }).join('; ') + '. Load the AI Capability Assessment and AI Skills Assessment files to test these.'));
    if (rec.ignored.length) sec.appendChild(el('p', 'hint', 'Ignored, no best-fit model chosen: ' + rec.ignored.join('; ') + '.'));
    host.appendChild(sec);
    return rec;
  }

  // Team shape, as is and to be.
  // As is: the FTE at each level from the Organisation tab (all human).
  // To be: the same total, redistributed across the levels in proportion to the level of the roles in the AI Roles Assessment
  // (weighted by each role's FTE when entered, otherwise one per role). Within each level the work is then split into human only,
  // augmented and automated using the activities of the roles at that level (the overall split where a level has no roles).
  function computeShape(AR) {
    var OG = window.WorkmatikOrganisation, sh = OG ? OG.shape() : { today: {} }, L = AR.levels, has = function (o) { return o && Object.keys(o).length > 0; };
    var meta = F.roles ? (F.roles.meta || {}) : {}, ids = {}; L.forEach(function (l) { ids[l.name] = l.id; });
    var per = {};   // role -> split
    if (F.roles) F.roles.rows.forEach(function (r) { var x = per[r.role] = per[r.role] || { n: 0, ho: 0, au: 0, fa: 0 }; x.n++; if (r.cls === 'Full automation') x.fa++; else if (r.cls === 'Augmentation') x.au++; else x.ho++; });
    var roleNames = Object.keys(per), withLevel = roleNames.filter(function (r) { return meta[r] && ids[meta[r].level]; });
    var allFte = withLevel.length > 0 && withLevel.every(function (r) { return meta[r].fte != null && meta[r].fte > 0; });
    var weight = {}, lvTot = {}, grand = 0, acts = {}, all = { n: 0, ho: 0, au: 0, fa: 0 };
    L.forEach(function (l) { weight[l.id] = 0; acts[l.id] = { n: 0, ho: 0, au: 0, fa: 0 }; });
    roleNames.forEach(function (r) { var x = per[r]; all.n += x.n; all.ho += x.ho; all.au += x.au; all.fa += x.fa; });
    withLevel.forEach(function (r) {
      var id = ids[meta[r].level], w = allFte ? meta[r].fte : 1; weight[id] += w; grand += w;
      ['n', 'ho', 'au', 'fa'].forEach(function (k) { acts[id][k] += per[r][k]; });
    });
    var today = {}, note = '', fromRoles = false;
    if (has(sh.today)) { Object.keys(sh.today).forEach(function (k) { today[k] = sh.today[k]; }); }
    else if (allFte) { fromRoles = true; withLevel.forEach(function (r) { var id = ids[meta[r].level]; today[id] = (today[id] || 0) + meta[r].fte; }); note = 'As-is numbers come from the FTE on each role in the AI Roles Assessment, because none were entered on the Organisation tab.'; }
    var T = L.reduce(function (a, l) { return a + (today[l.id] || 0); }, 0);
    var tobe = null;
    if (T > 0 && grand > 0) {
      tobe = {}; var share = function (k, id) { var a = acts[id]; return a.n ? a[k] / a.n : (all.n ? all[k] / all.n : 0); };
      L.forEach(function (l) {
        var vol = T * weight[l.id] / grand, ho = vol * share('ho', l.id), au = vol * share('au', l.id), fa = vol * share('fa', l.id);
        tobe[l.id] = { vol: vol, ho: ho, au: au, fa: fa, people: ho + au * (1 - AR.augShare) };
      });
    }
    return { today: today, tobe: tobe, T: T, note: note, fromRoles: fromRoles, rolesUsed: withLevel.length, rolesTotal: roleNames.length, byFte: allFte };
  }

  function svgEl(tag, attrs, text) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = text; return e; }
  var LIGHT = '#5DC1FF', LIGHT_FILL = '#CDEBFF', DARK_BLUE = '#024873';
  // Shape of the team by level. Solid light blue is human work, a pale fill is work shared with AI (augmented) and an outline is work AI does alone.
  // Where marketing starts today, read from the Organisation answers that do not score the models. Positions follow the grid in the research brief.
  function renderToday(host, ans, best) {
    var AR = window.WorkmatikArchetypes; if (!AR || !ans) return;
    var dec = ans.decision_location, res = ans.resource_location, dur = ans.team_duration, sec = el('div'), any = false;
    var dCen = ['Central team decides', 'Central sets rules, local approves'].indexOf(dec) >= 0, dDis = ['Teams decide within agreed limits', 'Individuals decide'].indexOf(dec) >= 0;
    var rCen = ['All in one central team', 'Central platform with some specialists in teams'].indexOf(res) >= 0, rEmb = ['Mostly embedded in teams with light central support', 'Fully embedded in each team'].indexOf(res) >= 0;
    if ((dCen || dDis) && (rCen || rEmb)) {
      var id = dCen ? (rCen ? 'A' : 'B') : (rCen ? ((dur === 'Assembled per project or campaign' || dur === 'Mixed: permanent core plus time-bound crews') ? 'D' : 'C') : 'E');
      var near = AR.byId(id), nm = near ? near.name : id; any = true;
      sec.appendChild(el('h3', null, 'Where you start today'));
      sec.appendChild(el('p', null, 'Your decision, resource and team-duration answers sit closest to ' + nm + ' on the grid. ' + (best ? (best.id === id ? 'That is also the best fit, so the move is about tuning rather than restructuring.' : 'The best fit is ' + best.name + ', so expect a change in where decisions are made or where resources sit.') : '')));
      sec.appendChild(el('p', 'hint', 'This reading uses only the three Classification answers and the grid in the research brief. It is a starting position, not a score, and it does not change the recommendation.'));
    }
    var DIM = [
      ['S1', 'Working unit', 'working_unit', 'Human team using AI tools', 'Individual plus AI', 'Orchestrator-led lean team works at the individual-plus-AI end'],
      ['S4', 'Review model', 'review_model', 'Periodic review gates', 'Embedded checks with a named owner', 'Not linked to one model in the brief'],
      ['S5', 'Organising axis', 'org_axis', 'By function or channel', 'By outcome or value stream', 'Separates the central models (A, B) from outcome pods (C)'],
      ['S6', 'Exploration unit', 'exploration_unit', 'One structure for running and exploring', 'A separate exploration unit', 'A modifier added to A to D, not a sixth model'],
      ['S7', 'Production sourcing', 'production_sourcing', 'In-house', 'Agencies and platforms', 'More agency reliance pulls towards the fixed base with crews (D)']
    ], rows = DIM.filter(function (d) { return ans[d[2]]; }).map(function (d) { return [d[0] + ' ' + d[1], ans[d[2]], d[3] + ' to ' + d[4], d[5]]; });
    if (rows.length) { any = true; sec.appendChild(el('h3', null, 'Supporting dimensions today')); sec.appendChild(el('p', 'hint', 'The supporting dimensions describe how a model works in practice. They do not score the models. They show where you start along each range, so you can see how far each would have to move. S2 and S3 come from your Workflow and Roles work, not from a question here.')); sec.appendChild(table(['Dimension', 'Your answer', 'Range', 'Link to the models'], rows)); }
    if (any) host.appendChild(sec);
  }
  function renderTeamsEffort(host) {
    var w = F.workflow, r = F.roles, sec = el('div'), any = false;
    var meta = r && r.meta ? r.meta : {}, teams = {}, names = {};
    if (r && r.rows) r.rows.forEach(function (x) { names[x.role] = 1; });
    Object.keys(names).forEach(function (nm) { var m = meta[nm] || {}; if (m.team) { var t = teams[m.team] = teams[m.team] || { roles: 0, fte: 0, hasFte: true }; t.roles++; if (m.fte != null) t.fte += m.fte; else t.hasFte = false; } });
    var tn = Object.keys(teams).sort();
    if (tn.length) {
      any = true; sec.appendChild(el('h3', null, 'Teams today'));
      sec.appendChild(el('p', 'hint', 'From the Team field in your AI Roles file. Roles without a team are not counted. Use these as the starting units when you test the model with your team.'));
      sec.appendChild(table(['Team', 'Roles', 'FTE today'], tn.map(function (t) { return [t, String(teams[t].roles), teams[t].hasFte ? String(Math.round(teams[t].fte * 10) / 10) : 'not all roles have FTE']; })));
    }
    if (w && w.rows) {
      var withH = w.rows.filter(function (x) { return x.hours != null; }), withD = w.rows.filter(function (x) { return x.decisions && x.decisions.length; });
      if (withH.length) {
        any = true; var tot = 0; withH.forEach(function (x) { tot += x.hours; });
        sec.appendChild(el('h3', null, 'Effort at stake (estimates)'));
        sec.appendChild(el('p', null, withH.length + ' of ' + w.rows.length + ' selected workflows have an hours-a-month estimate, ' + Math.round(tot) + ' hours in total (about ' + Math.round(tot / 140 * 10) / 10 + ' FTE at 140 hours a month). Compare this with the shape above: the shape assumes 25% of augmented work moves to agents, so check that the hours support it.'));
        sec.appendChild(table(['Workflow', 'Hours a month', 'Priority'], withH.slice().sort(function (a, b) { return b.hours - a.hours; }).slice(0, 10).map(function (x) { return [x.name, String(x.hours), String(x.priority)]; })));
      }
      if (withD.length) {
        any = true; sec.appendChild(el('h3', null, 'Decision points'));
        sec.appendChild(el('p', 'hint', 'Steps marked as a human decision, and the role that decides. These stay with people whichever model you choose, so they show where authority has to sit.'));
        sec.appendChild(table(['Workflow', 'Decision', 'Decided by'], [].concat.apply([], withD.map(function (x) { return x.decisions.map(function (d) { return [x.name, d.activity, d.by || 'not set']; }); })).slice(0, 30)));
      }
    }
    if (any) host.appendChild(sec);
  }
  function renderShape(host) {
    var AR = window.WorkmatikArchetypes, OG = window.WorkmatikOrganisation; if (!AR || !OG) return;
    var L = AR.levels, S = computeShape(AR), r1 = function (n) { return Math.round(n * 10) / 10; };
    var sec = el('div'); sec.appendChild(el('h3', null, 'Shape of the team'));
    sec.appendChild(el('p', 'hint', 'As is: the people at each level from the Organisation tab, all human. To be: the same total spread across levels in proportion to the level of the roles in your AI Roles Assessment, with each level split into human only, augmented and automated work. Reference shapes: McKinsey & Company, “From anxiety to advantage: A marketing organization that thrives with AI” (June 2026); PwC, “No more pyramids” (January 2026).'));
    if (!S.T) { sec.appendChild(el('p', null, 'Enter the FTE at each level on the Organisation tab (Team shape by level) to see the shape.')); host.appendChild(sec); return; }
    var today = L.map(function (x) { return S.today[x.id] || 0; });
    var max = Math.max.apply(null, today.concat(S.tobe ? L.map(function (x) { return S.tobe[x.id].vol; }) : [])) || 1, W = 330, rowH = 34, gap = 6, top = 34, H = top + L.length * (rowH + gap) + 8;
    function panel(title, label, rows) {
      var svg = svgEl('svg', { viewBox: '0 0 ' + (W + 200) + ' ' + H, role: 'img', 'aria-label': title + ': ' + (label || 'shape') + '. ' + L.map(function (x, i) { return x.name + ' ' + r1(rows[i].vol) + (rows[i].au != null ? ' (human ' + r1(rows[i].ho) + ', augmented ' + r1(rows[i].au) + ', automated ' + r1(rows[i].fa) + ')' : ''); }).join(', ') });
      svg.style.width = '100%'; svg.style.maxWidth = '520px';
      svg.appendChild(svgEl('text', { x: 150 + W / 2, y: 18, 'text-anchor': 'middle', 'font-weight': '600', 'font-size': '14', fill: 'currentColor' }, title + (label ? ': ' + label : '')));
      for (var i = L.length - 1; i >= 0; i--) {
        var y = top + (L.length - 1 - i) * (rowH + gap), cx = 150 + W / 2, x = rows[i], w = x.vol / max * W, x0 = cx - w / 2;
        svg.appendChild(svgEl('text', { x: 144, y: y + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': '12', fill: 'currentColor' }, L[i].name));
        if (x.au == null) svg.appendChild(svgEl('rect', { x: x0, y: y, width: w, height: rowH, fill: LIGHT, stroke: LIGHT, 'stroke-width': '1.5' }));
        else {
          var wh = x.ho / max * W, wa = x.au / max * W, wf = x.fa / max * W;
          svg.appendChild(svgEl('rect', { x: x0, y: y, width: wh, height: rowH, fill: LIGHT, stroke: LIGHT, 'stroke-width': '1.5' }));
          svg.appendChild(svgEl('rect', { x: x0 + wh, y: y, width: wa, height: rowH, fill: LIGHT_FILL, stroke: LIGHT, 'stroke-width': '1.5' }));
          svg.appendChild(svgEl('rect', { x: x0 + wh + wa, y: y, width: wf, height: rowH, fill: 'none', stroke: DARK_BLUE, 'stroke-width': '1.5', 'stroke-dasharray': '4 3' }));
        }
        svg.appendChild(svgEl('text', { x: x0 + w + 6, y: y + rowH / 2 + 4, 'text-anchor': 'start', 'font-size': '12', fill: '#323B4B' }, String(r1(x.vol))));
      }
      return svg;
    }
    var grid = el('div'); grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px';
    grid.appendChild(panel('As is', AR.classifyShape(today), L.map(function (x, i) { return { vol: today[i] }; })));
    if (S.tobe) grid.appendChild(panel('To be', AR.classifyShape(L.map(function (x) { return S.tobe[x.id].vol; })), L.map(function (x) { return S.tobe[x.id]; })));
    sec.appendChild(grid);
    if (S.tobe) {
      var lg = el('p', 'hint'); lg.innerHTML = '<span style="display:inline-block;width:12px;height:12px;background:' + LIGHT + ';border:1.5px solid ' + LIGHT + ';vertical-align:-1px"></span> Human only &nbsp; <span style="display:inline-block;width:12px;height:12px;background:' + LIGHT_FILL + ';border:1.5px solid ' + LIGHT + ';vertical-align:-1px"></span> Augmented (human with AI) &nbsp; <span style="display:inline-block;width:12px;height:12px;border:1.5px dashed ' + DARK_BLUE + ';vertical-align:-1px"></span> Automated (AI)';
      sec.appendChild(lg);
      var rows = L.slice().reverse().map(function (x) { var t = S.tobe[x.id]; return [x.name, r1(S.today[x.id] || 0), r1(t.vol), r1(t.ho), r1(t.au), r1(t.fa), r1(t.people)]; });
      var tot = L.reduce(function (a, x) { var t = S.tobe[x.id]; return [a[0] + (S.today[x.id] || 0), a[1] + t.vol, a[2] + t.ho, a[3] + t.au, a[4] + t.fa, a[5] + t.people]; }, [0, 0, 0, 0, 0, 0]);
      rows.push(['Total'].concat(tot.map(r1)));
      sec.appendChild(table(['Level', 'As is', 'To be: all work', 'Human only', 'Augmented', 'Automated', 'People needed'], rows, [1, 2, 3, 4, 5, 6], [22, 11, 15, 13, 13, 13, 13]));
      sec.appendChild(el('p', 'hint', 'People needed is the human only work plus the part of the augmented work people still do (' + Math.round((1 - AR.augShare) * 100) + '%, a starting assumption you can change on the Rules tab). The shapes follow from your numbers. They are not a recommendation.'));
    } else {
      sec.appendChild(el('p', 'hint', F.roles ? 'Add the usual level (and FTE) to each role in the AI Roles Assessment, "About this role", then reload the file to see the to-be shape.' : 'Load the AI Roles Assessment file, with the level of each role, to see the to-be shape and the AI share at each level.'));
    }
    if (S.note) sec.appendChild(el('p', 'hint', S.note));
    if (S.tobe && S.rolesUsed < S.rolesTotal) sec.appendChild(el('p', 'hint', S.rolesUsed + ' of ' + S.rolesTotal + ' roles have a level and are counted. Add a level to the others in the AI Roles Assessment to include them.'));
    if (S.tobe && !S.byFte) sec.appendChild(el('p', 'hint', 'Not every role has an FTE, so each role counts once. Enter FTE on every role for a closer result.'));
    host.appendChild(sec);
  }

  // Roles needed to deliver the strategy, and within each role how much of the work is human only, augmented or automated.
  function rolesNeeded(C) {
    var split = {}; if (F.roles) F.roles.rows.forEach(function (r) { var x = split[r.role] = split[r.role] || { n: 0, ho: 0, au: 0, fa: 0 }; x.n++; if (r.cls === 'Full automation') x.fa++; else if (r.cls === 'Augmentation') x.au++; else x.ho++; });
    var best = {}, linked = false;
    if (C.strat && C.strat.hasWf) C.strat.items.forEach(function (i) { Object.keys(i.roles).forEach(function (r) { linked = true; best[r] = Math.min(best[r] || 99, i.m.rank); }); });
    if (!linked) { Object.keys(split).forEach(function (r) { best[r] = 0; }); }
    return Object.keys(best).map(function (r) { var x = split[r]; return { role: r, rank: best[r], n: x ? x.n : 0, ho: x ? x.ho / x.n : null, au: x ? x.au / x.n : null, fa: x ? x.fa / x.n : null }; })
      .sort(function (a, b) { return (a.rank || 99) - (b.rank || 99) || (a.role < b.role ? -1 : 1); });
  }
  function renderRolesNeeded(host, C) {
    var rows = rolesNeeded(C); if (!rows.length) return;
    var pct = function (v) { return v == null ? '' : Math.round(v * 100) + '%'; };
    var linked = C.strat && C.strat.hasWf && rows.some(function (r) { return r.rank; });
    var sec = section('Roles needed to deliver the strategy', linked ? 'The roles in the workflows that support your priorities, in priority order. For each role, the share of its activities that are human only, augmented by AI or fully automated, from the AI Roles Assessment.' : 'Load the AI Workflow Assessment with your strategy file to see which roles each priority needs. Until then this lists every role in the AI Roles Assessment.');
    if (!F.roles) sec.appendChild(el('p', 'hint', 'Load the AI Roles Assessment file to see the human only, augmented and automated split for each role.'));
    var meta = F.roles ? F.roles.meta : {}, hasMeta = Object.keys(meta || {}).length > 0;
    if (hasMeta) sec.appendChild(table(['Priority', 'Role', 'Level', 'FTE', 'Work mode', 'Activities', 'Human only', 'Augmented', 'Automated'], rows.map(function (r) { var m = meta[r.role] || {}; return [r.rank || '', r.role, m.level || '', m.fte != null ? m.fte : '', m.mode || '', r.n || '', pct(r.ho), pct(r.au), pct(r.fa)]; }), [0, 3, 5, 6, 7, 8], [7, 25, 15, 6, 12, 9, 9, 9, 8]));
    else sec.appendChild(table(['Priority', 'Role', 'Activities', 'Human only', 'Augmented', 'Automated'], rows.map(function (r) { return [r.rank || '', r.role, r.n || '', pct(r.ho), pct(r.au), pct(r.fa)]; }), [0, 2, 3, 4, 5], [10, 34, 12, 14, 15, 15]));
    host.appendChild(sec);
  }

  // What moves first: workflows in order of the strategy priority they serve, then readiness, then score, with the people and model gaps each one touches.
  function renderMovesFirst(host, C, rec) {
    if (!F.workflow || !C.workflows.length) return;
    var AR = window.WorkmatikArchetypes, meta = F.roles ? (F.roles.meta || {}) : {};
    var order = {}; WAVES.forEach(function (w, i) { order[w[0]] = i; });
    var label = {}; WAVES.forEach(function (w) { label[w[0]] = w[1]; });
    var rank = function (x) { return (C.strat && C.strat.wfRank[x.w.id]) || 99; };
    var list = C.workflows.slice().sort(function (a, b) { return rank(a) - rank(b) || order[a.wave] - order[b.wave] || b.w.priority - a.w.priority; });
    var gapCaps = {};   // capability id -> gap area name, for the gaps that count against the recommended model
    if (rec && rec.best && AR) rec.best.gaps.forEach(function (g) { ((AR.gapSources[g.id] || {}).caps || []).forEach(function (id) { gapCaps[id] = g.name; }); });
    (rec ? rec.common : []).forEach(function (g) { ((AR.gapSources[g.id] || {}).caps || []).forEach(function (id) { gapCaps[id] = g.name; }); });
    var rows = list.map(function (x, i) {
      var roles = x.w.roles || [], modes = {}, gaps = {};
      roles.forEach(function (r) { var m = meta[r]; if (m && m.mode) modes[m.mode] = 1; });
      x.blockers.forEach(function (b) { if (gapCaps[b.id]) gaps[gapCaps[b.id]] = 1; });
      var r = rank(x);
      return [i + 1, x.w.name, r === 99 ? 'Not linked' : r, label[x.wave], roles.join('; '), Object.keys(modes).join(', '), Object.keys(gaps).join('; ')];
    });
    var hasMeta = Object.keys(meta).length > 0, heads = ['Order', 'Workflow', 'Priority', 'When', 'Roles'], widths = [6, 22, 9, 15, 22];
    if (hasMeta) { heads.push('Work modes needed'); widths.push(14); }
    heads.push('Model gap it touches'); widths.push(100 - widths.reduce(function (a, b) { return a + b; }, 0));
    var sec = section('What moves first', 'Workflows in order of the strategy priority they serve (the highest rank wins where a workflow serves several), then readiness, then priority score. Work modes describe the type of person the roles usually need. The last column shows where the workflow depends on a capability the recommended model also needs.');
    sec.appendChild(table(heads, rows.map(function (r) { var out = r.slice(0, 5); if (hasMeta) out.push(r[5]); out.push(r[6]); return out; }), [0], widths));
    host.appendChild(sec);
  }

  function renderRoadmap() {
    var host = $('roadmapBody'); host.textContent = '';
    var items = loadedItems(), hasStrat = !!(window.WorkmatikStrategy && window.WorkmatikStrategy.ranked().length); $('roadmapEmpty').hidden = items.length > 0 || hasStrat; host.hidden = !(items.length || hasStrat); if (!items.length && !hasStrat) return;
    var C = compute(); window.__last = C;
    var cards = el('div', 'summary-grid');
    function metric(l, v) { var m = el('div', 'metric'); m.appendChild(el('div', 'label', l)); m.appendChild(el('div', 'val', String(v))); cards.appendChild(m); }
    metric('Files loaded', items.length);
    if (C.strat) metric('Tracked priorities', C.strat.items.length);
    if (F.roles) metric('Activities in scope', F.roles.rows.length);
    if (F.workflow) { metric('Start now', C.workflows.filter(function (x) { return x.wave === 'now'; }).length); metric('Fix first', C.workflows.filter(function (x) { return x.wave === 'fix'; }).length); }
    if (F.capability) metric('Foundations to fix', C.foundations.length);
    if (C.domains) metric('Skill domain gaps', C.domains.filter(function (d) { return d.gap; }).length);
    host.appendChild(cards);
    C.warnings.forEach(function (w) { var b = el('div', 'flagbox'); b.appendChild(el('strong', null, 'Check. ')); b.appendChild(document.createTextNode(w)); host.appendChild(b); });

    var rec = renderModel(host, C);
    renderMovesFirst(host, C, rec);
    renderRolesNeeded(host, C);
    if (C.strat) {
      var P = C.strat, sp = section('Priorities and what supports them', 'From the Strategy tab. Each tracked priority is traced to the workflows you tagged to it, then to the capabilities, skill domains and roles those workflows depend on.');
      if (P.purpose) sp.appendChild(el('p', null, 'Purpose: ' + P.purpose));
      var fl = [];
      if (P.hasWf) {
        if (P.flags.noWorkflow) fl.push(plural(P.flags.noWorkflow, 'priority has', 'priorities have') + ' no workflow support planned');
        if (P.flags.wfNotLinked) fl.push(plural(P.flags.wfNotLinked, 'workflow is', 'workflows are') + ' not linked to purpose');
        if (P.flags.capNotLinked) fl.push(plural(P.flags.capNotLinked, 'foundation capability is', 'foundation capabilities are') + ' not linked to purpose');
      } else fl.push('No workflow file is loaded, so the support for each priority cannot be shown yet');
      if (P.flags.domNotLinked) fl.push(plural(P.flags.domNotLinked, 'skill domain gap is', 'skill domain gaps are') + ' not linked to purpose');
      if (fl.length) { var fb = el('div', 'flagbox'); fb.appendChild(el('strong', null, 'Check. ')); fb.appendChild(document.createTextNode(fl.join('; ') + '.')); sp.appendChild(fb); }
      var wlab = {}; WAVES.forEach(function (w) { wlab[w[0]] = w[1]; });
      sp.appendChild(table(['Priority', 'Measure', 'Workflows', 'Capabilities needed', 'Skill domains', 'Roles'], P.items.map(function (i) {
        return [i.m.rank, (i.m.name || i.m.id) + ' (' + i.m.id + ', ' + i.where + ')',
          i.wfs.length ? i.wfs.map(function (x) { return x.w.name + ' [' + wlab[x.wave] + ']'; }).join('; ') : (P.hasWf ? 'No workflow support planned' : ''),
          Object.keys(i.caps).map(function (id) { var b = i.caps[id]; return id + (b.status === 'weak' ? ' (weak)' : ''); }).join(', '),
          Object.keys(i.doms).join(', '), Object.keys(i.roles).join('; ')];
      }), [0], [8, 26, 26, 16, 10, 14]));
      host.appendChild(sp);
    }

    if (F.roles) {
      var g = {}; F.roles.rows.forEach(function (r) { var k = r.group || 'Other'; g[k] = g[k] || { n: 0, fa: 0, au: 0, ho: 0, roles: {} }; g[k].n++; g[k].roles[r.role] = 1; if (r.cls === 'Full automation') g[k].fa++; else if (r.cls === 'Augmentation') g[k].au++; else if (r.cls === 'Human only') g[k].ho++; });
      var rows = Object.keys(g).map(function (k) { var x = g[k]; return [k, Object.keys(x.roles).length, x.n, x.fa, x.au, x.ho, Math.round((x.fa + x.au) / x.n * 100) + '%']; });
      var tot = F.roles.rows.length, fa = F.roles.rows.filter(function (r) { return r.cls === 'Full automation'; }).length, au = F.roles.rows.filter(function (r) { return r.cls === 'Augmentation'; }).length;
      rows.push(['All groups', '', tot, fa, au, tot - fa - au, tot ? Math.round((fa + au) / tot * 100) + '%' : '']);
      var s = section('Where AI applies', 'From the AI Roles Assessment: the activities you put in scope, by role group.');
      s.appendChild(table(['Group', 'Roles', 'Activities', 'Full automation', 'Augmentation', 'Human only', 'Suited to AI'], rows, [1, 2, 3, 4, 5, 6], [26, 9, 12, 17, 15, 11, 10])); host.appendChild(s);
    }

    if (F.workflow) {
      var s2 = section('Suggested sequence', 'Built from workflow priority and capability readiness. The rules are on the Rules tab.');
      s2.appendChild(el('p', 'hint', 'Priority is a score from 0 to 100 from the AI Workflow Assessment: value multiplied by feasibility, reduced by 10% for each point of risk above 1. Higher means more valuable, easier and lower risk. It orders workflows within each group; it is a ranking within your own workflows, not a benchmark. The formula is the author\u2019s draft judgement.'));
      WAVES.forEach(function (wv) {
        var list = C.workflows.filter(function (x) { return x.wave === wv[0]; }); if (!list.length) return;
        s2.appendChild(el('h3', null, wv[1] + ' (' + list.length + ')'));
        s2.appendChild(table(['Workflow', 'ID', 'Supports priority', 'Priority score', 'Group', wv[0] === 'fix' ? 'Held up by' : 'Capabilities to watch'], list.map(function (x) {
          var by = wv[0] === 'fix' ? x.weak.map(function (b) { return b.id; }) : x.blockers.map(function (b) { return b.id + ' (' + statusText(b.status) + ')'; });
          return [x.w.name + (x.w.own ? ' (your own)' : ''), x.w.id, C.strat && C.strat.wfRank[x.w.id] ? C.strat.wfRank[x.w.id] : '', x.w.quad === 'prohibited' ? '–' : x.w.priority, REF.quadrants[x.w.quad], by.length ? by.join(', ') : (wv[0] === 'fix' ? 'Low feasibility, no capability gap flagged' : 'None flagged')];
        }), [2, 3], [28, 7, 10, 9, 13, 33]));
      });
      host.appendChild(s2);
    }

    if (F.capability || C.foundations.length) {
      var s3 = section('Foundations to fix first', 'Weak capabilities that hold up workflows, earliest journey-map phase first.');
      if (!C.foundations.length) s3.appendChild(el('p', null, F.capability ? 'No workflow is held up by a weak capability.' : 'Load a capability file to see this.'));
      else s3.appendChild(table(['Capability', 'Phase', 'Your score', 'Holds up'], C.foundations.map(function (f) { return [f.cap.id + ' ' + f.cap.name, REF.phases[f.cap.phase], F.capability.scores[f.cap.id], f.wfs.map(function (w) { return w.name; }).slice(0, 3).join('; ') + (f.wfs.length > 3 ? '; and ' + (f.wfs.length - 3) + ' more' : '')]; }), [2], [32, 12, 10, 46]));
      if (C.checks.length) { s3.appendChild(el('p', 'hint', 'Not yet scored, but needed by workflows you could start: ' + C.checks.map(function (c) { return c.id + ' ' + c.name; }).join('; ') + '. Score them before you build.')); }
      host.appendChild(s3);
    }

    if (C.domains) {
      var s4 = section('Skills to build', 'Skill domains link to the foundation capabilities by category. The link is the author’s judgement.');
      if (C.domains) {
        s4.appendChild(el('h3', null, 'AI Skills Assessment (' + plural(C.domains[0].n, 'person', 'people') + (F.skills.some(function (x) { return x.team; }) ? ', from your team file' : '') + ')'));
        s4.appendChild(table(['Domain', 'ID', 'Average (0 to 4)', 'Gap', 'Needed for foundations'], C.domains.map(function (d) { return [d.d.name, d.d.id, round1(d.avg).toFixed(1), d.gap ? 'Yes' : '', d.by.join(', ')]; }), [2], [34, 9, 15, 9, 33]));
      }
      host.appendChild(s4);
    }
    var act = el('div', 'actions'); var b = el('button', 'btn primary', 'Download roadmap (XLSX)'); b.type = 'button'; b.addEventListener('click', download); act.appendChild(b); host.appendChild(act);
  }

  // ---------- download
  function sheets(C) {
    var items = loadedItems(), org = '';
    items.forEach(function (p) { if (!org && p.org && p.kind !== 'skills') org = p.org; });
    var today = new Date().toISOString().slice(0, 10);
    var out = [];
    var sum = [['AI Roadmap'], ['Organisation or function', org], ['Business unit', Workmatik.get().unit], ['Date', today], [], ['Start now', C.workflows.filter(function (x) { return x.wave === 'now'; }).length], ['Start next', C.workflows.filter(function (x) { return x.wave === 'next'; }).length], ['Quick wins', C.workflows.filter(function (x) { return x.wave === 'quick'; }).length], ['Fix first', C.workflows.filter(function (x) { return x.wave === 'fix'; }).length], ['Foundations to fix', C.foundations.length], [], ['Generated in the browser by the Workmatik AI Strategy View. The rules and thresholds are the author’s draft judgement.']];
    C.warnings.forEach(function (w) { sum.push(['Check', w]); });
    out.push(['Summary', sum, [30, 90]]);
    out.push(['Workmatik data', Workmatik.metaRows('Workmatik AI Roadmap', 'roadmap', REF.version, [['Capability weak at or below', C.R.cap], ['Workflows to start first', C.R.first], ['Skill domain gap at or below', C.R.skill]]), [30, 60]]);
    var files = [['Tool', 'File', 'Organisation or team', 'Date', 'What it holds']]; items.forEach(function (p) { files.push([LABEL[p.kind], p.file, p.org, p.date, detailOf(p)]); });
    out.push(['Files used', files, [28, 44, 28, 14, 40]]);
    if (F.workflow) {
      var seq = [['Wave', 'Workflow ID', 'Workflow', 'Supports priority', 'Group', 'Priority score', 'Capabilities flagged', 'Held up by']];
      WAVES.forEach(function (wv) { C.workflows.filter(function (x) { return x.wave === wv[0]; }).forEach(function (x) { seq.push([wv[1], x.w.id, x.w.name, C.strat && C.strat.wfRank[x.w.id] ? C.strat.wfRank[x.w.id] : '', REF.quadrants[x.w.quad], x.w.quad === 'prohibited' ? '' : x.w.priority, x.blockers.map(function (b) { return b.id + ' (' + statusText(b.status) + ')'; }).join('; '), x.weak.map(function (b) { return b.id; }).join('; ')]); }); });
      out.push(['Sequence', seq, [22, 12, 44, 12, 18, 9, 50, 24]]);
      if (C.strat) {
        var pr = [['Priority', 'Measure ID', 'Measure', 'Where', 'Workflows', 'Capabilities', 'Skill domains', 'Roles']];
        C.strat.items.forEach(function (i) { pr.push([i.m.rank, i.m.id, i.m.name, i.where, i.wfs.map(function (x) { return x.w.id + ' ' + x.w.name; }).join('; ') || (C.strat.hasWf ? 'No workflow support planned' : ''), Object.keys(i.caps).join('; '), Object.keys(i.doms).join('; '), Object.keys(i.roles).join('; ')]); });
        out.splice(2, 0, ['Priorities', pr, [9, 11, 40, 36, 60, 28, 20, 40]]);
      }
    }
    if (F.capability || C.foundations.length) {
      var fd = [['Capability ID', 'Capability', 'Phase', 'Your score', 'Workflows held up']]; C.foundations.forEach(function (f) { fd.push([f.cap.id, f.cap.name, REF.phases[f.cap.phase], F.capability ? F.capability.scores[f.cap.id] : '', f.wfs.map(function (w) { return w.id + ' ' + w.name; }).join('; ')]); });
      out.push(['Foundations', fd, [13, 46, 12, 11, 80]]);
    }
    if (C.domains) {
      var sk = [['Source', 'ID', 'Skill or domain', 'Measure', 'Value', 'Gap', 'Needed for']];
      if (C.domains) C.domains.forEach(function (d) { sk.push(['AI Skills Assessment', d.d.id, d.d.name, 'Average (0 to 4)', round1(d.avg), d.gap ? 'Yes' : '', d.by.join('; ')]); });
      out.push(['Skills', sk, [22, 9, 44, 26, 9, 8, 24]]);
    }
    if (F.roles) {
      var rl = [['Activity ID', 'Role ID', 'Group', 'Role', 'Task', 'Activity', 'Classification']]; F.roles.rows.forEach(function (r) { rl.push([r.id, r.rid, r.group, r.role, r.task, r.activity, r.cls]); });
      out.push(['Roles in scope', rl, [11, 8, 28, 34, 30, 50, 20]]);
    }
    return out;
  }
  function download() {
    if (!Workmatik.requireOrg()) return;
    var C = compute(), sh = sheets(C), fname = Workmatik.fileName('roadmap');
    function fallback() { var wb = XLSX.utils.book_new(); sh.forEach(function (s) { var ws = XLSX.utils.aoa_to_sheet(s[1]); ws['!cols'] = s[2].map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, s[0]); }); XLSX.writeFile(wb, fname); }
    if (typeof ExcelJS === 'undefined') { fallback(); return; }
    var wb = new ExcelJS.Workbook(); wb.creator = 'Workmatik'; wb.title = 'AI Roadmap';
    sh.forEach(function (s) {
      var ws = wb.addWorksheet(s[0]); s[1].forEach(function (r) { ws.addRow(r); }); s[2].forEach(function (w, i) { ws.getColumn(i + 1).width = w; }); ws.eachRow(function (row) { row.alignment = { vertical: 'top', wrapText: true }; });
      if (s[0] === 'Summary') ws.getRow(1).font = { bold: true, size: 14 };
      else { ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; ws.getRow(1).eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF024873' } }; }); }
    });
    wb.xlsx.writeBuffer().then(function (buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }).catch(fallback);
  }

  // ---------- rules tab and guide
  function renderModelRules() {
    var A = window.WorkmatikArchetypes; if (!A) return;
    function changed() { if (!$('panel-roadmap').hidden) renderRoadmap(); }
    function num(val, min, max, step, fn, label) {
      var i = el('input'); i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = val; i.setAttribute('aria-label', label);
      i.addEventListener('input', function () { fn(i.value); changed(); }); return i;
    }
    var sc = $('modelScalars'); sc.textContent = '';
    [['Not ready yet when gap penalty reaches', 'notReady', A.notReady, 0, 10, 0.5], ['Show a runner-up within (points)', 'margin', A.margin, 0, 10, 0.5], ['Share of an augmented activity assumed to move to agents (0 to 1)', 'augShare', A.augShare, 0, 1, 0.05]].forEach(function (x) {
      var lb = el('label'); lb.appendChild(el('span', 'lbl', x[0])); lb.appendChild(num(x[2], x[3], x[4], x[5], function (v) { A.setRule(x[1], null, null, v); }, x[0])); sc.appendChild(lb);
    });
    var g = $('gapWeightTable'); g.textContent = '';
    var hr = el('tr'); hr.appendChild(el('th', null, 'Model')); A.gapAreas.forEach(function (a) { hr.appendChild(el('th', null, a.name)); });
    var th = el('thead'); th.appendChild(hr); g.appendChild(th); var tb = el('tbody');
    A.list.forEach(function (m) {
      var tr = el('tr'); tr.appendChild(el('td', null, m.id + ' ' + m.name));
      A.gapAreas.forEach(function (a) { var td = el('td'); td.appendChild(num(A.gapWeights[m.id][a.id], 0, 5, 0.5, function (v) { A.setRule('weight', m.id, a.id, v); }, m.name + ': ' + a.name)); tr.appendChild(td); });
      tb.appendChild(tr);
    });
    g.appendChild(tb);
    var c = $('contextTable'); c.textContent = '';
    var h3 = el('tr'); ['Model', 'Organisation answer', 'Points', 'Why'].forEach(function (x) { h3.appendChild(el('th', null, x)); });
    var th3 = el('thead'); th3.appendChild(h3); c.appendChild(th3); var tb3 = el('tbody');
    A.context.forEach(function (r, i) {
      var tr = el('tr'); tr.appendChild(el('td', null, r.m)); tr.appendChild(el('td', null, r.f.replace(/_/g, ' ') + ': ' + r.a.join(' or ')));
      var td = el('td'); td.appendChild(num(r.p, 0, 5, 0.5, function (v) { A.setRule('context', i, null, v); }, r.m + ' ' + r.f)); tr.appendChild(td); tr.appendChild(el('td', null, r.why)); tb3.appendChild(tr);
    });
    c.appendChild(tb3);
    var st = $('signalTable'); if (st) { st.textContent = '';
      var h4 = el('tr'); ['Model', 'Signal', 'Counts when at or above', 'Points', 'Why'].forEach(function (x) { h4.appendChild(el('th', null, x)); });
      var th4 = el('thead'); th4.appendChild(h4); st.appendChild(th4); var tb4 = el('tbody');
      A.signalRules.forEach(function (r, i) {
        var tr = el('tr'); tr.appendChild(el('td', null, r.m)); tr.appendChild(el('td', null, (r.src === 'wf' ? 'Workflows: ' : 'Roles: ') + r.label));
        var t1 = el('td'); t1.appendChild(num(r.pct ? Math.round(r.thr * 100) : r.thr, 0, r.pct ? 100 : 20, r.pct ? 5 : 0.5, function (v) { A.setRule('signalThr', i, null, r.pct ? parseFloat(v) / 100 : v); }, r.id + ' threshold')); if (r.pct) t1.appendChild(document.createTextNode(' %')); tr.appendChild(t1);
        var t2 = el('td'); t2.appendChild(num(r.p, 0, 5, 0.5, function (v) { A.setRule('signal', i, null, v); }, r.id + ' points')); tr.appendChild(t2); tr.appendChild(el('td', null, r.why)); tb4.appendChild(tr);
      });
      st.appendChild(tb4); }
    $('btnResetModelRules').onclick = function () { A.resetRules(); renderModelRules(); changed(); };
  }
  function renderRules() {
    renderModelRules();
    var t = $('mapTable'); t.textContent = '';
    var hr = el('tr'); ['Capability category', 'Skill domains'].forEach(function (h) { hr.appendChild(el('th', null, h)); }); var th = el('thead'); th.appendChild(hr); t.appendChild(th); var tb = el('tbody');
    REF.categories.forEach(function (c, i) { var tr = el('tr'); tr.appendChild(el('td', null, c)); tr.appendChild(el('td', null, (REF.catToDomains[String(i)] || []).map(function (id) { return id + ' ' + domById(id).name; }).join('; '))); tb.appendChild(tr); });
    t.appendChild(tb);
    var f = $('feedTable'); f.textContent = '';
    var h2 = el('tr'); ['Section', 'Needs this file', 'Joined on'].forEach(function (h) { h2.appendChild(el('th', null, h)); }); var t2 = el('thead'); t2.appendChild(h2); f.appendChild(t2); var b2 = el('tbody');
    [['Where AI applies', 'AI Roles Assessment', 'Role IDs and activity IDs'], ['Suggested sequence', 'AI Workflow Assessment (and the AI Capability Assessment to test readiness)', 'Workflow IDs, capability IDs'], ['Foundations to fix first', 'AI Capability Assessment and AI Workflow Assessment', 'Capability IDs'], ['Skills to build', 'AI Skills Assessment and/or Marketing Skills Map', 'Skill domain IDs (SD01 to SD06), skill IDs (MS01 to MS10)']].forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', null, c)); }); b2.appendChild(tr); });
    f.appendChild(b2);
  }
  var TABS = ['path', 'strategy', 'organisation', 'files', 'roadmap', 'framework', 'rules', 'guide', 'journey', 'skillsmap'];
  function showTab(name) {
    TABS.forEach(function (t) { var on = t === name; $('tab-' + t).setAttribute('aria-selected', on ? 'true' : 'false'); $('tab-' + t).tabIndex = on ? 0 : -1; $('panel-' + t).hidden = !on; });
    if (name === 'roadmap') renderRoadmap();
    if (name === 'strategy' && window.__renderStrategyTab) window.__renderStrategyTab();
    if (name === 'organisation' && window.__renderOrganisationTab) window.__renderOrganisationTab();
    if (name === 'journey') { var fr = $('frame-' + name); if (!fr.getAttribute('src')) fr.setAttribute('src', fr.getAttribute('data-src')); }
    try { history.replaceState(null, '', '#' + name); } catch (e) {}
    window.scrollTo(0, 0);
  }
  window.__toolkitShowTab = showTab;
  window.addEventListener('message', function (e) {
    var d = e.data; if (!d || d.type !== 'tk-height' || typeof d.h !== 'number') return;
    ['journey'].forEach(function (n) { var fr = $('frame-' + n); if (fr && fr.contentWindow === e.source) fr.style.height = Math.max(400, Math.min(d.h, 20000)) + 'px'; });
  });
  function init() {
    $('fwVersion').textContent = REF.version;
    Workmatik.renderOrgBlock($('orgBlock'));
    var d = { rCap: 2, rFirst: 3, rSkill: 1.5 }; Object.keys(d).forEach(function (k) { $(k).value = d[k]; $(k).addEventListener('input', function () { if (!$('panel-roadmap').hidden) renderRoadmap(); }); });
    renderRules(); renderFiles();
    TABS.forEach(function (t, i) {
      $('tab-' + t).addEventListener('click', function () { showTab(t); });
      $('tab-' + t).addEventListener('keydown', function (e) { var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!k) return; var nt = TABS[(i + k + TABS.length) % TABS.length]; showTab(nt); $('tab-' + nt).focus(); });
    });
    $('btnPick').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function (e) { if (e.target.files.length) loadFiles(e.target.files); e.target.value = ''; });
    var dz = $('dropzone');
    ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); }); });
    dz.addEventListener('drop', function (e) { loadFiles(e.dataTransfer.files); });
    $('btnGoRoadmap').addEventListener('click', function () { showTab('roadmap'); });
    $('btnClear').addEventListener('click', function () { F = { roles: null, workflow: null, capability: null, map: null, skills: [] }; $('loadMessages').textContent = ''; renderFiles(); });
  }
})();
