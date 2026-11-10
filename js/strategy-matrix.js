(function () {
  'use strict';
  // Strategy tab: purpose line, matrix of measures, and the ranks that drive the rest of the Toolkit.
  var KEY = 'workmatik-strategy-1';
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }

  var STARTER_ROWS = ['Build brand and trust', 'Win new customers', 'Grow existing customers'];
  var STARTER_COLS = ['Speed', 'Quality', 'Cost'];

  function fresh() {
    return {
      purpose: '',
      rows: STARTER_ROWS.map(function (l, i) { return { id: 'SR' + pad(i + 1, 2), label: l, source: 'starter' }; }),
      cols: STARTER_COLS.map(function (l, i) { return { id: 'SC' + pad(i + 1, 2), label: l, source: 'starter' }; }),
      measures: [],
      next: { measure: 1, row: 1, col: 1 }
    };
  }
  var S = fresh();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && Array.isArray(v.rows) && Array.isArray(v.cols) && Array.isArray(v.measures)) { S = v; S.next = S.next || { measure: 1, row: 1, col: 1 }; }
    } catch (e) { S = fresh(); }
  }

  // ---------- ranks
  function ranked() { return S.measures.filter(function (m) { return m.rank >= 1; }).sort(function (a, b) { return a.rank - b.rank; }); }
  function renumber() { ranked().forEach(function (m, i) { m.rank = i + 1; }); }
  // Give measure m the rank r. Anything at r or below moves down one place. r = 0 clears the rank.
  function setRank(m, r) {
    if (!(r >= 1)) { m.rank = 0; renumber(); return; }
    var n = ranked().filter(function (x) { return x !== m; }).length;
    r = Math.min(r, n + 1);
    S.measures.forEach(function (x) { if (x !== m && x.rank >= r) x.rank += 1; });
    m.rank = r; renumber();
  }
  function byId(id) { return S.measures.filter(function (m) { return m.id === id; })[0]; }
  function rowById(id) { return S.rows.filter(function (r) { return r.id === id; })[0]; }
  function colById(id) { return S.cols.filter(function (c) { return c.id === id; })[0]; }

  // ---------- edits
  function addMeasure(rowId, colId) {
    var m = { id: 'M' + pad(S.next.measure++, 2), row: rowId, col: colId, name: '', baseline: '', target: '', owner: '', rank: 0 };
    S.measures.push(m); save(); render();
    var f = document.querySelector('[data-focus="' + m.id + '"]'); if (f) f.focus();
  }
  function removeMeasure(m) { S.measures.splice(S.measures.indexOf(m), 1); renumber(); save(); render(); }
  function addRow() { S.rows.push({ id: 'SRC' + pad(S.next.row++, 2), label: 'New row', source: 'own' }); save(); render(); }
  function addCol() { S.cols.push({ id: 'SCC' + pad(S.next.col++, 2), label: 'New column', source: 'own' }); save(); render(); }
  function removeRow(r) {
    var n = S.measures.filter(function (m) { return m.row === r.id; }).length;
    if (n && !window.confirm('Remove "' + r.label + '" and its ' + n + ' measure' + (n === 1 ? '' : 's') + '? Their IDs will not be reused.')) return;
    S.measures = S.measures.filter(function (m) { return m.row !== r.id; }); S.rows.splice(S.rows.indexOf(r), 1); renumber(); save(); render();
  }
  function removeCol(c) {
    var n = S.measures.filter(function (m) { return m.col === c.id; }).length;
    if (n && !window.confirm('Remove "' + c.label + '" and its ' + n + ' measure' + (n === 1 ? '' : 's') + '? Their IDs will not be reused.')) return;
    S.measures = S.measures.filter(function (m) { return m.col !== c.id; }); S.cols.splice(S.cols.indexOf(c), 1); renumber(); save(); render();
  }

  // ---------- render
  function field(label, value, onInput, opts) {
    opts = opts || {};
    var w = el('label', 'sm-field'); w.appendChild(el('span', 'sm-lbl', label));
    var i = el('input'); i.type = 'text'; i.maxLength = opts.max || 120; i.value = value || ''; if (opts.placeholder) i.placeholder = opts.placeholder;
    if (opts.focusId) i.setAttribute('data-focus', opts.focusId);
    i.addEventListener('input', function () { onInput(i.value); save(); renderRanked(); });
    w.appendChild(i); return w;
  }
  function measureCard(m) {
    var c = el('div', 'sm-measure' + (m.rank >= 1 ? ' tracked' : ''));
    var top = el('div', 'sm-top');
    top.appendChild(el('span', 'sm-id', m.id));
    var rk = el('label', 'sm-rank'); rk.appendChild(el('span', null, 'Priority '));
    var sel = el('select'); sel.setAttribute('aria-label', 'Priority rank for ' + (m.name || m.id));
    var maxOpt = ranked().length + (m.rank >= 1 ? 0 : 1);
    var o0 = el('option', null, 'Not tracked'); o0.value = '0'; sel.appendChild(o0);
    for (var r = 1; r <= Math.max(maxOpt, m.rank); r++) { var o = el('option', null, String(r)); o.value = String(r); sel.appendChild(o); }
    sel.value = String(m.rank >= 1 ? m.rank : 0);
    sel.addEventListener('change', function () { setRank(m, parseInt(sel.value, 10)); save(); render(); });
    rk.appendChild(sel); top.appendChild(rk);
    var rm = el('button', 'btn small sm-remove', 'Remove'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove measure ' + m.id); rm.addEventListener('click', function () { removeMeasure(m); }); top.appendChild(rm);
    c.appendChild(top);
    c.appendChild(field('Measure', m.name, function (v) { m.name = v; }, { placeholder: 'e.g. Pipeline created from target accounts', focusId: m.id }));
    var g = el('div', 'sm-three');
    g.appendChild(field('Baseline', m.baseline, function (v) { m.baseline = v; }, { max: 40 }));
    g.appendChild(field('Target', m.target, function (v) { m.target = v; }, { max: 40 }));
    g.appendChild(field('Owner', m.owner, function (v) { m.owner = v; }, { max: 40 }));
    c.appendChild(g);
    return c;
  }
  function render() {
    var host = $('strategyMatrix'); if (!host) return; host.textContent = '';
    var t = el('table', 'sm-table'), hr = el('tr'); hr.appendChild(el('th', null, ''));
    S.cols.forEach(function (c) {
      var th = el('th'); var i = el('input'); i.type = 'text'; i.value = c.label; i.maxLength = 40; i.setAttribute('aria-label', 'Column name');
      i.addEventListener('input', function () { c.label = i.value; save(); renderRanked(); }); th.appendChild(i);
      var rm = el('button', 'btn small sm-remove', 'Remove'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove column ' + c.label); rm.addEventListener('click', function () { removeCol(c); }); th.appendChild(rm); hr.appendChild(th);
    });
    var addTh = el('th'); var ac = el('button', 'btn small sm-addstruct', 'Add column'); ac.type = 'button'; ac.addEventListener('click', addCol); addTh.appendChild(ac); hr.appendChild(addTh);
    var thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
    var tb = el('tbody');
    S.rows.forEach(function (r) {
      var tr = el('tr'); var th = el('th', 'sm-rowhead'); var i = el('input'); i.type = 'text'; i.value = r.label; i.maxLength = 60; i.setAttribute('aria-label', 'Row name');
      i.addEventListener('input', function () { r.label = i.value; save(); renderRanked(); }); th.appendChild(i);
      var rm = el('button', 'btn small sm-remove', 'Remove'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remove row ' + r.label); rm.addEventListener('click', function () { removeRow(r); }); th.appendChild(rm); tr.appendChild(th);
      S.cols.forEach(function (c) {
        var td = el('td', 'sm-cell');
        S.measures.filter(function (m) { return m.row === r.id && m.col === c.id; }).forEach(function (m) { td.appendChild(measureCard(m)); });
        var add = el('button', 'btn small', 'Add measure'); add.type = 'button'; add.addEventListener('click', function () { addMeasure(r.id, c.id); }); td.appendChild(add);
        tr.appendChild(td);
      });
      tr.appendChild(el('td', 'sm-spacer')); tb.appendChild(tr);
    });
    var addTr = el('tr'); var addTd = el('td'); addTd.colSpan = S.cols.length + 2;
    var ar = el('button', 'btn small sm-addstruct', 'Add row'); ar.type = 'button'; ar.addEventListener('click', addRow); addTd.appendChild(ar); addTr.appendChild(addTd); tb.appendChild(addTr);
    t.appendChild(tb);
    var sc = el('div', 'table-scroll'); sc.appendChild(t); host.appendChild(sc);
    renderRanked();
  }
  function renderRanked() {
    var host = $('strategyRanked'); if (!host) return; host.textContent = '';
    var list = ranked();
    if (!list.length) { host.appendChild(el('p', 'empty', 'Nothing is tracked yet. Choose a priority number on the measures you want to carry through the other tools.')); return; }
    if (list.length > 5) { var w = el('div', 'flagbox'); w.appendChild(el('strong', null, 'Check. ')); w.appendChild(document.createTextNode('You are tracking ' + list.length + ' measures. Five or fewer keeps the rest of the toolkit focused.')); host.appendChild(w); }
    var ol = el('ol', 'sm-ranked');
    list.forEach(function (m) {
      var r = rowById(m.row), c = colById(m.col);
      var li = el('li'); li.appendChild(el('strong', null, (m.name || '(unnamed measure)') + ' '));
      li.appendChild(el('span', 'hint', m.id + ' · ' + (r ? r.label : '') + ' · ' + (c ? c.label : '') + (m.target ? ' · target ' + m.target : '') + (m.owner ? ' · ' + m.owner : '')));
      ol.appendChild(li);
    });
    host.appendChild(ol);
    var un = S.measures.length - list.length;
    if (un) host.appendChild(el('p', 'hint', un + ' other measure' + (un === 1 ? ' is' : 's are') + ' recorded but not tracked.'));
  }

  // ---------- file
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function sheets() {
    var meas = [['Measure ID', 'Row ID', 'Column ID', 'Measure', 'Baseline', 'Target', 'Owner', 'Rank']];
    S.measures.forEach(function (m) { meas.push([m.id, m.row, m.col, m.name, m.baseline, m.target, m.owner, m.rank >= 1 ? m.rank : '']); });
    var rows = [['ID', 'Label', 'Source']]; S.rows.forEach(function (r) { rows.push([r.id, r.label, r.source]); });
    var cols = [['ID', 'Label', 'Source']]; S.cols.forEach(function (c) { cols.push([c.id, c.label, c.source]); });
    return [
      ['Measures', meas, [11, 9, 10, 52, 16, 16, 20, 7]],
      ['Rows', rows, [9, 40, 10]],
      ['Columns', cols, [9, 40, 10]],
      ['Purpose', [['Purpose and strategy'], [S.purpose]], [100]],
      ['Workmatik data', Workmatik.metaRows('Workmatik AI Strategy', 'strategy', '1.0.0', [['Next measure number', S.next.measure], ['Next own row number', S.next.row], ['Next own column number', S.next.col], ['Note', 'Measure IDs (M01, M02...) are never reused. Other Workmatik tools match on these IDs.']]), [26, 90]]
    ];
  }
  function download() {
    if (!Workmatik.requireOrg()) return;
    var sh = sheets(), fname = Workmatik.fileName('strategy');
    function fallback() { var wb = XLSX.utils.book_new(); sh.forEach(function (s) { var ws = XLSX.utils.aoa_to_sheet(s[1]); ws['!cols'] = s[2].map(function (w) { return { wch: w }; }); XLSX.utils.book_append_sheet(wb, ws, s[0]); }); XLSX.writeFile(wb, fname); }
    if (typeof ExcelJS === 'undefined') { fallback(); return; }
    var wb = new ExcelJS.Workbook(); wb.creator = 'Workmatik'; wb.title = 'AI Strategy';
    sh.forEach(function (s) {
      var ws = wb.addWorksheet(s[0]); s[1].forEach(function (r) { ws.addRow(r); }); s[2].forEach(function (w, i) { ws.getColumn(i + 1).width = w; });
      ws.eachRow(function (row) { row.alignment = { vertical: 'top', wrapText: true }; });
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).eachCell(function (c) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF024873' } }; });
    });
    wb.xlsx.writeBuffer().then(function (buf) {
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }).catch(fallback);
  }
  function kvOf(ws) { var o = {}; if (ws) XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).forEach(function (r) { if (r[0] !== '' && r[0] !== 'Field') o[String(r[0])] = r[1]; }); return o; }
  function num(id, prefix) { var m = new RegExp('^' + prefix + '(\\d+)$').exec(String(id)); return m ? parseInt(m[1], 10) : 0; }
  function parseFile(buf) {
    var wb = XLSX.read(buf, { type: 'array' }), W = wb.Sheets;
    if (!W['Measures'] || !W['Rows'] || !W['Columns']) throw new Error('not a strategy file');
    var j = function (n) { return XLSX.utils.sheet_to_json(W[n], { defval: '' }); };
    var out = fresh(); out.rows = []; out.cols = [];
    j('Rows').forEach(function (r) { if (String(r['ID']).trim()) out.rows.push({ id: String(r['ID']).trim(), label: String(r['Label']), source: String(r['Source']) === 'own' ? 'own' : 'starter' }); });
    j('Columns').forEach(function (r) { if (String(r['ID']).trim()) out.cols.push({ id: String(r['ID']).trim(), label: String(r['Label']), source: String(r['Source']) === 'own' ? 'own' : 'starter' }); });
    j('Measures').forEach(function (r) {
      var id = String(r['Measure ID']).trim(); if (!id) return;
      var rk = parseInt(r['Rank'], 10);
      out.measures.push({ id: id, row: String(r['Row ID']).trim(), col: String(r['Column ID']).trim(), name: String(r['Measure']), baseline: String(r['Baseline']), target: String(r['Target']), owner: String(r['Owner']), rank: rk >= 1 ? rk : 0 });
    });
    if (W['Purpose']) { var p = XLSX.utils.sheet_to_json(W['Purpose'], { header: 1, defval: '' }); out.purpose = String((p[1] && p[1][0]) || ''); }
    var d = kvOf(W['Workmatik data']);
    out.next = {
      measure: Math.max(parseInt(d['Next measure number'], 10) || 1, out.measures.reduce(function (a, m) { return Math.max(a, num(m.id, 'M') + 1); }, 1)),
      row: Math.max(parseInt(d['Next own row number'], 10) || 1, out.rows.reduce(function (a, r) { return Math.max(a, num(r.id, 'SRC') + 1); }, 1)),
      col: Math.max(parseInt(d['Next own column number'], 10) || 1, out.cols.reduce(function (a, c) { return Math.max(a, num(c.id, 'SCC') + 1); }, 1))
    };
    return { state: out, kv: d };
  }
  // Reads a strategy workbook already in memory. Used by the Strategy tab button and by the Files tab.
  function importBuffer(buf, name, msgs) {
    var p; try { p = parseFile(buf); } catch (e) { msgs.appendChild(el('li', 'bad', name + ' could not be read as a Workmatik strategy file, so it was not loaded.')); return false; }
    var chk = Workmatik.check(p.kv);
    if (!chk.ok && !window.confirm(chk.message + ' Load it anyway? The page will switch to the file\'s organisation.')) { msgs.appendChild(el('li', 'bad', 'Not loaded: ' + name + ' is for a different organisation or business unit.')); return false; }
    Workmatik.set({ org: p.kv['Organisation'] || Workmatik.get().org, unit: p.kv['Business unit'] || '', by: p.kv['Prepared by'] || Workmatik.get().by });
    S = p.state; renumber(); save(); $('strategyPurpose').value = S.purpose; render();
    msgs.appendChild(el('li', 'ok', name + ' loaded into the Strategy tab: ' + S.measures.length + ' measure' + (S.measures.length === 1 ? '' : 's') + ', ' + ranked().length + ' tracked.'));
    return true;
  }
  function loadFile(file) {
    var msgs = $('strategyMessages'); msgs.textContent = '';
    var rd = new FileReader();
    rd.onload = function () { importBuffer(rd.result, file.name, msgs); };
    rd.readAsArrayBuffer(file);
  }
  function isStrategyBook(wb) { return !!(wb.Sheets['Measures'] && wb.Sheets['Rows'] && wb.Sheets['Columns']); }

  function init() {
    load();
    var pu = $('strategyPurpose'); pu.value = S.purpose || '';
    pu.addEventListener('input', function () { S.purpose = pu.value; save(); });
    $('btnStrategyDownload').addEventListener('click', download);
    $('btnStrategyLoad').addEventListener('click', function () { $('strategyFile').click(); });
    $('strategyFile').addEventListener('change', function (e) { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });
    $('btnStrategyClear').addEventListener('click', function () {
      if (!window.confirm('Clear the purpose, matrix and priorities? Download first if you want to keep them.')) return;
      S = fresh(); save(); pu.value = ''; $('strategyMessages').textContent = ''; render();
    });
    render();
  }
  window.WorkmatikStrategy = { state: function () { return S; }, ranked: ranked, measure: byId, render: render, importBuffer: importBuffer, isStrategyBook: isStrategyBook };
  window.__renderStrategyTab = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
