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
    return { kind: 'roles', org: String(d['Organisation'] || ''), date: serialToIso(d['Exported']), rows: rows };
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
    rowsOf(ws).forEach(function (row) {
      if (String(row['Included']).toUpperCase() === 'N') { off++; return; }
      var sc = {}, got = 0; ['V1', 'V2', 'F1', 'F2', 'F3', 'R1', 'R2'].forEach(function (k) { var n = parseInt(row[k], 10); if (n >= 1 && n <= 5) { sc[k] = n; got++; } });
      if (got !== 7) { unscored++; return; }
      var tier = String(row['EU AI Act tier'] || 'minimal').trim();
      var v = (sc.V1 + sc.V2) / 2, f = (sc.F1 + sc.F2 + sc.F3) / 3, r = (sc.R1 + sc.R2) / 2;
      var quad = tier === 'prohibited' ? 'prohibited' : (v > tv && f > tf) ? 'start' : (v > tv) ? 'prepare' : (f > tf) ? 'quick' : 'park';
      rows.push({ id: normWfId(row['ID']), name: String(row['Workflow']), group: String(row['Group'] || ''), own: String(row['Source']).toLowerCase() === 'own', v: v, f: f, r: r, tier: tier, quad: quad, priority: Math.round(v * f / 25 * 100 * (1 - 0.1 * (r - 1))), caps: wfCaps(sc, tier) });
    });
    return { kind: 'workflow', org: String(sm['Organisation or function'] || ''), date: serialToIso(sm['Assessment date']), rows: rows, unscored: unscored, off: off };
  }
  function parseCapability(wb) {
    var ws = wb.Sheets['Scoring'], sm = kv(wb.Sheets['Summary']), scores = {}, oos = {}, n = 0;
    rowsOf(ws).forEach(function (r) {
      var id = String(r['ID']).trim(); if (!capById(id)) return;
      var s = parseInt(r['Score (1-5)'], 10); if (s >= 1 && s <= 5) { scores[id] = s; n++; }
      if (String(r['Out of scope']).toUpperCase() === 'Y') oos[id] = true;
    });
    return { kind: 'capability', org: String(sm['Organisation or function'] || ''), date: serialToIso(sm['Assessment date']), scores: scores, oos: oos, n: n };
  }
  function parseSkills(wb) {
    var m = kv(wb.Sheets['Meta']), scores = [];
    var by = {}; XLSX.utils.sheet_to_json(wb.Sheets['Assessment'], { header: 1, defval: '' }).forEach(function (r, i) { if (i === 0) return; var id = Number(r[0]), s = Number(r[2]); if (Number.isInteger(id) && Number.isInteger(s) && s >= 0 && s <= 4) by[id] = s; });
    for (var i = 0; i < REF.skillDomains.length; i++) { if (by[i] === undefined) throw new Error('missing domain'); scores.push(by[i]); }
    return { kind: 'skills', org: String(m['Team'] || ''), name: String(m['Name'] || ''), rater: String(m['Rater type'] || ''), date: serialToIso(m['Date']), scores: scores };
  }
  function parseMap(wb) {
    var rows = rowsOf(wb.Sheets['Data']), out = [], org = '';
    rows.forEach(function (r) {
      var tag = String(r['Skill Tag']).trim(); var ms = REF.mapSkills.filter(function (s) { return s.tag === tag; })[0]; if (!ms) return;
      org = org || String(r['Organisation Name'] || '');
      out.push({ id: ms.id, tag: tag, title: String(r['Skill Title']), rank: parseInt(r['Organisation Rank'], 10), cov: parseInt(r['Coverage'], 10) });
    });
    if (!out.length) throw new Error('no skills');
    return { kind: 'map', org: org, date: '', rows: out };
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
          var p; try { p = detect(XLSX.read(buf, { type: 'array' })); } catch (e) { msgs.appendChild(el('li', 'bad', f.name + ' was not recognised as a file from a Workmatik tool.')); return; }
          p.file = f.name;
          if (p.kind === 'skills') {
            if (F.skills.some(function (s) { return s.file === p.file && s.name === p.name && s.rater === p.rater && s.date === p.date; })) { msgs.appendChild(el('li', 'bad', f.name + ' is already loaded.')); return; }
            F.skills.push(p);
          } else {
            var had = F[p.kind]; F[p.kind] = p;
            if (had) msgs.appendChild(el('li', 'ok', f.name + ' replaced ' + had.file + '.'));
          }
          msgs.appendChild(el('li', 'ok', f.name + ': ' + LABEL[p.kind] + '.'));
        });
      });
    });
    chain.then(function () { renderFiles(); if (!$('panel-strategy').hidden) renderStrategy(); });
  }
  function loadedItems() {
    var out = [];
    ['roles', 'workflow', 'capability', 'map'].forEach(function (k) { if (F[k]) out.push(F[k]); });
    F.skills.forEach(function (s) { out.push(s); });
    return out;
  }
  function detailOf(p) {
    if (p.kind === 'roles') return plural(p.rows.length, 'activity', 'activities') + ' in scope';
    if (p.kind === 'workflow') return plural(p.rows.length, 'scored workflow', 'scored workflows') + (p.unscored ? ', ' + p.unscored + ' not fully scored' : '');
    if (p.kind === 'capability') return plural(p.n, 'capability', 'capabilities') + ' scored';
    if (p.kind === 'skills') return (p.name || 'Unnamed') + ', ' + p.rater;
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
    if (!F.skills.length) missing.push(LABEL.skills); if (!F.map) missing.push(LABEL.map);
    var note = $('missingNote'); if (!note) { note = el('p', 'hint'); note.id = 'missingNote'; $('fileTable').parentNode.parentNode.insertBefore(note, $('fileTable').parentNode.nextSibling); }
    note.textContent = missing.length && items.length ? 'Not loaded: ' + missing.join('; ') + '. Those sections will not appear.' : '';
  }

  // ---------- compute
  function rules() { return { cap: numv('rCap', 2), first: numv('rFirst', 3), skill: numv('rSkill', 1.5), rank: numv('rRank', 5), cov: numv('rCov', 4) }; }
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
        var vals = F.skills.map(function (s) { return s.scores[i]; }), avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        var by = []; out.foundations.forEach(function (f) { if ((REF.catToDomains[String(f.cap.cat)] || []).indexOf(d.id) >= 0) by.push(f.cap.id); });
        return { d: d, avg: avg, n: vals.length, gap: avg <= R.skill, by: by };
      });
    }
    out.mapGaps = null;
    if (F.map) out.mapGaps = F.map.rows.slice().sort(function (a, b) { return a.rank - b.rank; }).map(function (r) { return { r: r, gap: r.rank <= R.rank && r.cov <= R.cov }; });
    // consistency
    var orgs = {}; loadedItems().forEach(function (p) { if (p.org && p.kind !== 'skills') orgs[p.org.toLowerCase()] = p.org; });
    if (Object.keys(orgs).length > 1) out.warnings.push('The files name different organisations or functions (' + Object.keys(orgs).map(function (k) { return orgs[k]; }).join('; ') + '). Check they belong together.');
    if (wf && !cap) out.warnings.push('No capability file is loaded, so no workflow is held back for a weak capability. Load the AI Capability Assessment file to test readiness.');
    if (cap && !wf) out.warnings.push('No workflow file is loaded, so capabilities cannot be linked to workflows.');
    return out;
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

  function renderStrategy() {
    var host = $('strategyBody'); host.textContent = '';
    var items = loadedItems(); $('strategyEmpty').hidden = items.length > 0; host.hidden = !items.length; if (!items.length) return;
    var C = compute(); window.__last = C;
    var cards = el('div', 'summary-grid');
    function metric(l, v) { var m = el('div', 'metric'); m.appendChild(el('div', 'label', l)); m.appendChild(el('div', 'val', String(v))); cards.appendChild(m); }
    metric('Files loaded', items.length);
    if (F.roles) metric('Activities in scope', F.roles.rows.length);
    if (F.workflow) { metric('Start now', C.workflows.filter(function (x) { return x.wave === 'now'; }).length); metric('Fix first', C.workflows.filter(function (x) { return x.wave === 'fix'; }).length); }
    if (F.capability) metric('Foundations to fix', C.foundations.length);
    if (C.domains) metric('Skill domain gaps', C.domains.filter(function (d) { return d.gap; }).length);
    host.appendChild(cards);
    C.warnings.forEach(function (w) { var b = el('div', 'flagbox'); b.appendChild(el('strong', null, 'Check. ')); b.appendChild(document.createTextNode(w)); host.appendChild(b); });

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
        s2.appendChild(table(['Workflow', 'ID', 'Priority', 'Group', wv[0] === 'fix' ? 'Held up by' : 'Capabilities to watch'], list.map(function (x) {
          var by = wv[0] === 'fix' ? x.weak.map(function (b) { return b.id; }) : x.blockers.map(function (b) { return b.id + ' (' + statusText(b.status) + ')'; });
          return [x.w.name + (x.w.own ? ' (your own)' : ''), x.w.id, x.w.quad === 'prohibited' ? '–' : x.w.priority, REF.quadrants[x.w.quad], by.length ? by.join(', ') : (wv[0] === 'fix' ? 'Low feasibility, no capability gap flagged' : 'None flagged')];
        }), [2], [32, 8, 9, 14, 37]));
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

    if (C.domains || C.mapGaps) {
      var s4 = section('Skills to build', 'Skill domains link to the foundation capabilities by category. The link is the author’s judgement.');
      if (C.domains) {
        s4.appendChild(el('h3', null, 'AI Skills Assessment (' + plural(F.skills.length, 'response', 'responses') + ')'));
        s4.appendChild(table(['Domain', 'ID', 'Average (0 to 4)', 'Gap', 'Needed for foundations'], C.domains.map(function (d) { return [d.d.name, d.d.id, round1(d.avg).toFixed(1), d.gap ? 'Yes' : '', d.by.join(', ')]; }), [2], [34, 9, 15, 9, 33]));
      }
      if (C.mapGaps) {
        s4.appendChild(el('h3', null, 'Marketing Skills Map'));
        s4.appendChild(table(['Rank', 'Skill', 'ID', 'Coverage (0 to 10)', 'Gap'], C.mapGaps.map(function (x) { return [x.r.rank, x.r.tag, x.r.id, x.r.cov, x.gap ? 'Important, low coverage' : '']; }), [0, 3], [9, 31, 9, 17, 34]));
      }
      host.appendChild(s4);
    }
    var act = el('div', 'actions'); var b = el('button', 'btn primary', 'Download strategy (XLSX)'); b.type = 'button'; b.addEventListener('click', download); act.appendChild(b); host.appendChild(act);
  }

  // ---------- download
  function sheets(C) {
    var items = loadedItems(), org = '';
    items.forEach(function (p) { if (!org && p.org && p.kind !== 'skills') org = p.org; });
    var today = new Date().toISOString().slice(0, 10);
    var out = [];
    var sum = [['AI Strategy View'], ['Organisation or function', org], ['Date', today], [], ['Start now', C.workflows.filter(function (x) { return x.wave === 'now'; }).length], ['Start next', C.workflows.filter(function (x) { return x.wave === 'next'; }).length], ['Quick wins', C.workflows.filter(function (x) { return x.wave === 'quick'; }).length], ['Fix first', C.workflows.filter(function (x) { return x.wave === 'fix'; }).length], ['Foundations to fix', C.foundations.length], [], ['Generated in the browser by the Workmatik AI Strategy View. The rules and thresholds are the author’s draft judgement.']];
    C.warnings.forEach(function (w) { sum.push(['Check', w]); });
    out.push(['Summary', sum, [30, 90]]);
    out.push(['Workmatik data', [['Field', 'Value'], ['Tool', 'Workmatik AI Strategy View'], ['Tool key', 'strategy'], ['Data version', REF.version], ['Schema', 'workmatik-shared-ids-1'], ['Organisation', org], ['Date', today], ['Capability weak at or below', C.R.cap], ['Workflows to start first', C.R.first], ['Skill domain gap at or below', C.R.skill]], [30, 60]]);
    var files = [['Tool', 'File', 'Organisation or team', 'Date', 'What it holds']]; items.forEach(function (p) { files.push([LABEL[p.kind], p.file, p.org, p.date, detailOf(p)]); });
    out.push(['Files used', files, [28, 44, 28, 14, 40]]);
    if (F.workflow) {
      var seq = [['Wave', 'Workflow ID', 'Workflow', 'Group', 'Priority', 'Capabilities flagged', 'Held up by']];
      WAVES.forEach(function (wv) { C.workflows.filter(function (x) { return x.wave === wv[0]; }).forEach(function (x) { seq.push([wv[1], x.w.id, x.w.name, REF.quadrants[x.w.quad], x.w.quad === 'prohibited' ? '' : x.w.priority, x.blockers.map(function (b) { return b.id + ' (' + statusText(b.status) + ')'; }).join('; '), x.weak.map(function (b) { return b.id; }).join('; ')]); }); });
      out.push(['Sequence', seq, [22, 12, 44, 18, 9, 50, 24]]);
    }
    if (F.capability || C.foundations.length) {
      var fd = [['Capability ID', 'Capability', 'Phase', 'Your score', 'Workflows held up']]; C.foundations.forEach(function (f) { fd.push([f.cap.id, f.cap.name, REF.phases[f.cap.phase], F.capability ? F.capability.scores[f.cap.id] : '', f.wfs.map(function (w) { return w.id + ' ' + w.name; }).join('; ')]); });
      out.push(['Foundations', fd, [13, 46, 12, 11, 80]]);
    }
    if (C.domains || C.mapGaps) {
      var sk = [['Source', 'ID', 'Skill or domain', 'Measure', 'Value', 'Gap', 'Needed for']];
      if (C.domains) C.domains.forEach(function (d) { sk.push(['AI Skills Assessment', d.d.id, d.d.name, 'Average (0 to 4)', round1(d.avg), d.gap ? 'Yes' : '', d.by.join('; ')]); });
      if (C.mapGaps) C.mapGaps.forEach(function (x) { sk.push(['Marketing Skills Map', x.r.id, x.r.tag, 'Rank ' + x.r.rank + ', coverage (0 to 10)', x.r.cov, x.gap ? 'Yes' : '', '']); });
      out.push(['Skills', sk, [22, 9, 44, 26, 9, 8, 24]]);
    }
    if (F.roles) {
      var rl = [['Activity ID', 'Role ID', 'Group', 'Role', 'Task', 'Activity', 'Classification']]; F.roles.rows.forEach(function (r) { rl.push([r.id, r.rid, r.group, r.role, r.task, r.activity, r.cls]); });
      out.push(['Roles in scope', rl, [11, 8, 28, 34, 30, 50, 20]]);
    }
    return out;
  }
  function download() {
    var C = compute(), sh = sheets(C), fname = 'AI_Strategy_View_' + new Date().toISOString().slice(0, 10) + '.xlsx';
    function fallback() { var wb = XLSX.utils.book_new(); sh.forEach(function (s) { var ws = XLSX.utils.aoa_to_sheet(s[1]); ws['!cols'] = s[2].map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, s[0]); }); XLSX.writeFile(wb, fname); }
    if (typeof ExcelJS === 'undefined') { fallback(); return; }
    var wb = new ExcelJS.Workbook(); wb.creator = 'Workmatik'; wb.title = 'AI Strategy View';
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
  function renderRules() {
    var t = $('mapTable'); t.textContent = '';
    var hr = el('tr'); ['Capability category', 'Skill domains'].forEach(function (h) { hr.appendChild(el('th', null, h)); }); var th = el('thead'); th.appendChild(hr); t.appendChild(th); var tb = el('tbody');
    REF.categories.forEach(function (c, i) { var tr = el('tr'); tr.appendChild(el('td', null, c)); tr.appendChild(el('td', null, (REF.catToDomains[String(i)] || []).map(function (id) { return id + ' ' + domById(id).name; }).join('; '))); tb.appendChild(tr); });
    t.appendChild(tb);
    var f = $('feedTable'); f.textContent = '';
    var h2 = el('tr'); ['Section', 'Needs this file', 'Joined on'].forEach(function (h) { h2.appendChild(el('th', null, h)); }); var t2 = el('thead'); t2.appendChild(h2); f.appendChild(t2); var b2 = el('tbody');
    [['Where AI applies', 'AI Roles Assessment', 'Role IDs and activity IDs'], ['Suggested sequence', 'AI Workflow Assessment (and the AI Capability Assessment to test readiness)', 'Workflow IDs, capability IDs'], ['Foundations to fix first', 'AI Capability Assessment and AI Workflow Assessment', 'Capability IDs'], ['Skills to build', 'AI Skills Assessment and/or Marketing Skills Map', 'Skill domain IDs (SD01 to SD06), skill IDs (MS01 to MS10)']].forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', null, c)); }); b2.appendChild(tr); });
    f.appendChild(b2);
  }
  var TABS = ['path', 'files', 'strategy', 'journey', 'rules', 'guide', 'framework'];
  function showTab(name) {
    TABS.forEach(function (t) { var on = t === name; $('tab-' + t).setAttribute('aria-selected', on ? 'true' : 'false'); $('tab-' + t).tabIndex = on ? 0 : -1; $('panel-' + t).hidden = !on; });
    if (name === 'strategy') renderStrategy();
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
    var d = { rCap: 2, rFirst: 3, rSkill: 1.5, rRank: 5, rCov: 4 }; Object.keys(d).forEach(function (k) { $(k).value = d[k]; $(k).addEventListener('input', function () { if (!$('panel-strategy').hidden) renderStrategy(); }); });
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
    $('btnGoStrategy').addEventListener('click', function () { showTab('strategy'); });
    $('btnClear').addEventListener('click', function () { F = { roles: null, workflow: null, capability: null, map: null, skills: [] }; $('loadMessages').textContent = ''; renderFiles(); });
  }
})();
