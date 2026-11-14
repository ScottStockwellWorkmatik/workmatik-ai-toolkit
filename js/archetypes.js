(function () {
  'use strict';
  // The five organisation archetypes and how the Strategy grid points to them. These are working hypotheses from the research brief
  // (v2, 14 Nov 2026), not validated findings. Everything the recommendation scores comes from this table, so it can be recalibrated here.
  var LIST = [
    { id: 'A', name: 'Governed hub' },
    { id: 'B', name: 'Hub and spoke' },
    { id: 'C', name: 'Outcome pods on a shared platform' },
    { id: 'D', name: 'Fixed base with assembled crews' },
    { id: 'E', name: 'Orchestrator-led lean team' }
  ];
  // Starter row x starter column -> [first choice, second choice]. Rows: SR01 Build brand and trust, SR02 Win new customers, SR03 Grow existing customers.
  // Columns: SC01 Speed, SC02 Quality, SC03 Cost.
  var CELLS = {
    'SR01|SC01': ['B', 'A'], 'SR01|SC02': ['D', 'A'], 'SR01|SC03': ['A', 'D'],
    'SR02|SC01': ['E', 'C'], 'SR02|SC02': ['B', 'C'], 'SR02|SC03': ['D', 'E'],
    'SR03|SC01': ['D', 'C'], 'SR03|SC02': ['B', 'C'], 'SR03|SC03': ['C', 'D']
  };
  var NOTES = {
    'SR01|SC01': 'Speed on brand and trust leans towards control, so hub and spoke first, then the governed hub.',
    'SR02|SC01': 'Speed on winning new customers suits the orchestrator-led lean team, then pods.',
    'SR01|SC02': 'Quality on brand and trust suits the fixed base with assembled crews, then the governed hub.',
    'SR03|SC01': 'Speed on growing existing customers suits the fixed base with assembled crews, then pods.',
    'SR03|SC03': 'Cost on growing existing customers leans towards pods first, then the fixed base.'
  };
  // Points: first choice 2, second choice 1, each multiplied by the measure's rank weight. Rank 1 counts in full; no limit on how many ranks count.
  var POINTS = { first: 2, second: 1 };
  function rankWeight(rank) { return rank >= 1 ? 1 / rank : 0; }

  // Work modes: the kind of work a person is accountable for at a given moment. One person can work in more than one mode.
  // This is the Workmatik framework, not a research finding. Innovator is a mindset that cuts across all five, not a sixth mode. Builder is an interim mode, expected to merge into Practitioner.
  var MODE_LABEL = 'work mode';
  var MODES = [
    { id: 'S', name: 'Strategist', text: 'Owns outcomes and makes judgement calls. Sets direction for agents, decides when AI output is good enough and when it needs human intervention, and holds the commercial accountability for the pod\'s results.' },
    { id: 'O', name: 'Orchestrator', text: 'Designs and manages the agent workflows. Defines the quality parameters agents work within, supervises execution at scale, catches failure modes before they compound, and keeps improving the workflow design as capability matures.' },
    { id: 'B', name: 'Builder', text: 'Builds and maintains the agents and automations that the workflows run on, and tests them before others rely on them. An interim mode: expected to merge into Practitioner as agent building becomes a core skill.' },
    { id: 'G', name: 'Governor', text: 'Owns the human decision gates: brand safety, compliance review, quality assurance on AI-generated content, and escalation when an agent output falls outside acceptable parameters.' },
    { id: 'P', name: 'Practitioner', text: 'Teams with the agents and uses AI to deliver campaigns, build relationships and drive impact, to delight customers with the organisation\'s products and services.' }
  ];
  // How much each organisation model leans on each work mode: H high, M medium, L low. Draft ratings from the research brief, to test with clients.
  var MODEL_MODES = {
    A: { S: 'M', O: 'H', B: 'M', G: 'H', P: 'M' },
    B: { S: 'M', O: 'M', B: 'H', G: 'M', P: 'H' },
    C: { S: 'H', O: 'M', B: 'M', G: 'M', P: 'H' },
    D: { S: 'H', O: 'M', B: 'M', G: 'H', P: 'H' },
    E: { S: 'H', O: 'H', B: 'H', G: 'M', P: 'L' }
  };
  // Gap weighting: what each organisation model depends on. A gap lowers the model's score and is shown as a "gap to close"; it never removes a model.
  // Weights are working hypotheses, editable on the Rules tab, to calibrate with real cases.
  // level: 0 = no gap, 1 = partial gap, 2 = large gap. Score change = weight x level x -1. A total gap of NOT_READY or more shows "not ready yet".
  var GAP_AREAS = [
    { id: 'gov', name: 'Governance and human oversight', kind: 'capability' },
    { id: 'plat', name: 'Shared AI platform and data readiness', kind: 'capability' },
    { id: 'brief', name: 'Briefing agents and judging output quality', kind: 'skill' },
    { id: 'spoke', name: 'AI skills in each team or spoke', kind: 'skill' },
    { id: 'all', name: 'AI skills across the whole team', kind: 'skill' }
  ];
  var GAP_WEIGHTS = {
    A: { gov: 1.5, plat: 0.5, brief: 0.5, spoke: 0, all: 0 },
    B: { gov: 0.5, plat: 1.5, brief: 0, spoke: 1.5, all: 0 },
    C: { gov: 0.5, plat: 1.5, brief: 0.5, spoke: 0, all: 0.5 },
    D: { gov: 1.5, plat: 0.5, brief: 1.5, spoke: 0, all: 0 },
    E: { gov: 0.5, plat: 0.5, brief: 0.5, spoke: 0, all: 1.5 }
  };
  var NOT_READY = 3;
  // Share of an augmented activity's work assumed to move to agents when estimating the target number of people. A starting guess to calibrate with real cases.
  var AUG_SHARE = 0.25;
  function gapPenalty(id, levels, base) {
    var w = GAP_WEIGHTS[id] || {}, total = 0, gaps = [];
    GAP_AREAS.forEach(function (g) {
      var lv = Number(levels && levels[g.id]) || 0, pts = (w[g.id] || 0) * lv - ((base && base[g.id]) || 0);
      if (pts > 0) { total += pts; gaps.push({ id: g.id, name: g.name, level: lv, points: pts }); }
    });
    gaps.sort(function (a, b) { return b.points - a.points; });
    return { penalty: total, gaps: gaps, notReady: total >= NOT_READY };
  }
  // Where each gap area is read from. Capability scores run 1 to 5 (AI Capability Assessment); skill domain scores run 0 to 4 (AI Skills Assessment, averaged across responses).
  // The mapping is the author's judgement, editable on the Rules tab. A missing file means "not assessed", never "no gap".
  var GAP_SOURCES = {
    gov: { caps: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'W3'] },
    plat: { caps: ['D1', 'D2', 'D3', 'D4', 'D5'] },
    brief: { domains: ['SD02', 'SD03'] },
    spoke: { domains: ['SD03'] },
    all: { domains: ['SD01', 'SD03'] }
  };
  var GAP_CUTS = { cap: { large: 2, partial: 3 }, skill: { large: 1, partial: 2 } }; // average at or below the cut
  // capScores: {id: 1-5} or null; oos: {id: true}; domAvg: {SD01: 0-4} or null. Returns {levels, avg, assessed}.
  function gapLevels(capScores, oos, domAvg) {
    var levels = {}, avg = {}, assessed = {};
    GAP_AREAS.forEach(function (g) {
      var src = GAP_SOURCES[g.id] || {}, vals = [], cut;
      if (src.caps && capScores) src.caps.forEach(function (id) { if (!(oos && oos[id]) && capScores[id] >= 1) vals.push(capScores[id]); });
      if (src.domains && domAvg) src.domains.forEach(function (id) { if (domAvg[id] != null) vals.push(domAvg[id]); });
      if (!vals.length) { levels[g.id] = 0; avg[g.id] = null; assessed[g.id] = false; return; }
      var a = vals.reduce(function (x, y) { return x + y; }, 0) / vals.length;
      cut = src.caps ? GAP_CUTS.cap : GAP_CUTS.skill;
      levels[g.id] = a <= cut.large ? 2 : a <= cut.partial ? 1 : 0; avg[g.id] = a; assessed[g.id] = true;
    });
    return { levels: levels, avg: avg, assessed: assessed };
  }
  // Context signals from the Organisation answers. Simple points: 1 each, 0.5 for the two weak-evidence fields (deal_complexity, skill_shape).
  // Each rule: field, the answers that count, the model that gains the points, and the reason shown. Working hypotheses from the research brief.
  var CONTEXT = [
    { f: 'compliance_burden', a: ['Heavy'], m: 'A', p: 1, why: 'Heavy regulatory or brand risk favours central control' },
    { f: 'ai_maturity_stage', a: ['Not started', 'Trials'], m: 'A', p: 1, why: 'Early AI use favours a central team holding the skills' },
    { f: 'breadth', a: ['Two to five', 'Six or more'], m: 'B', p: 1, why: 'Several segments or markets need local relevance with central consistency' },
    { f: 'data_readiness', a: ['Medium', 'High'], m: 'B', p: 1, why: 'A central platform is something the team can fund and use' },
    { f: 'skill_shape', a: ['T-shaped (specialist depth, broad range)', 'Mixed'], m: 'B', p: 0.5, why: 'Some AI skill at spoke level (weak evidence)' },
    { f: 'deal_complexity', a: ['Complex, many buyers and long cycle'], m: 'B', p: 0.5, why: 'Complex sales need local judgement (weak evidence)' },
    { f: 'data_readiness', a: ['High'], m: 'C', p: 1, why: 'Trusted data lets pods work on a shared platform' },
    { f: 'headcount_band', a: ['51-200', 'Over 200'], m: 'C', p: 1, why: 'Enough scale to fund a platform team' },
    { f: 'org_axis', a: ['By segment or market', 'By outcome or value stream'], m: 'C', p: 1, why: 'Already organised around segments or outcomes that can be measured' },
    { f: 'demand_variability', a: ['Lumpy'], m: 'D', p: 1, why: 'Lumpy demand suits a fixed base with assembled crews' },
    { f: 'skill_shape', a: ['Mostly specialists', 'T-shaped (specialist depth, broad range)'], m: 'D', p: 0.5, why: 'Stable role vocabulary to assemble crews from (weak evidence)' },
    { f: 'headcount_band', a: ['Under 10'], m: 'E', p: 1, why: 'A small team can run lean around one orchestrator' },
    { f: 'compliance_burden', a: ['Light'], m: 'E', p: 1, why: 'Light regulation leaves room for a lean model' },
    { f: 'ai_maturity_stage', a: ['Used in most workflows'], m: 'E', p: 1, why: 'High AI maturity' },
    { f: 'deal_complexity', a: ['Transactional'], m: 'E', p: 0.5, why: 'Simple sales suit a lean team (weak evidence)' }
  ];
  var CONTEXT_FIELDS = ['compliance_burden', 'ai_maturity_stage', 'breadth', 'data_readiness', 'skill_shape', 'deal_complexity', 'headcount_band', 'org_axis', 'demand_variability'];
  function contextPoints(answers) {
    var pts = {}, why = {}; LIST.forEach(function (a) { pts[a.id] = 0; why[a.id] = []; });
    CONTEXT.forEach(function (r) { var v = answers && answers[r.f]; if (v && r.a.indexOf(v) >= 0) { pts[r.m] += r.p; why[r.m].push({ field: r.f, answer: v, points: r.p, text: r.why }); } });
    return { pts: pts, why: why };
  }
  // Recommendation: simple points from the strategy grid, less the gap penalty. Organisation context signals are added in the next step.
  var MARGIN = 2; // a runner-up is shown when its score is within this many points of the best
  // state = WorkmatikStrategy.state(); measures with rank >= 1 count, with no limit. Added rows or columns count only when the client chose a model for them.
  function recommend(state, levels, answers, noFlip) {
    var pts = {}, why = {}, ignored = [];
    LIST.forEach(function (a) { pts[a.id] = 0; why[a.id] = []; });
    function rowOf(id) { return state.rows.filter(function (r) { return r.id === id; })[0] || {}; }
    function colOf(id) { return state.cols.filter(function (c) { return c.id === id; })[0] || {}; }
    state.measures.filter(function (m) { return m.rank >= 1; }).sort(function (a, b) { return a.rank - b.rank; }).forEach(function (m) {
      var r = rowOf(m.row), c = colOf(m.col), pick = CELLS[m.row + '|' + m.col];
      if (!pick) { pick = [r.arch, c.arch].filter(function (x) { return x && byId(x); }); if (pick.length === 2 && pick[0] === pick[1]) pick = [pick[0]]; }
      if (!pick || !pick.length) { ignored.push((r.label || '') + ' · ' + (c.label || '')); return; }
      var w = rankWeight(m.rank), label = (r.label || '') + ' · ' + (c.label || '');
      [POINTS.first, POINTS.second].forEach(function (p, i) { var id = pick[i]; if (!id) return; var v = p * w; pts[id] += v; why[id].push({ cell: label, rank: m.rank, points: v }); });
    });
    var cx = contextPoints(answers);
    // A gap that every model depends on is a foundation to fix whichever model is chosen. Only the extra weight a model puts on it counts against that model,
    // so "not ready yet" marks gaps that differ between models.
    var common = [], base = {};
    GAP_AREAS.forEach(function (g) {
      var lv = Number(levels && levels[g.id]) || 0; if (lv <= 0) return;
      var ws = LIST.map(function (a) { return (GAP_WEIGHTS[a.id] || {})[g.id] || 0; });
      if (ws.some(function (x) { return x <= 0; })) return;
      var b = Math.min.apply(null, ws) * lv; base[g.id] = b; common.push({ id: g.id, name: g.name, kind: g.kind, level: lv, points: b });
    });
    var rows = LIST.map(function (a) { var g = gapPenalty(a.id, levels, base), st = pts[a.id], tot = st + cx.pts[a.id]; return { id: a.id, name: a.name, strategy: st, context: cx.pts[a.id], points: tot, penalty: g.penalty, gaps: g.gaps, notReady: g.notReady, score: tot - g.penalty, why: why[a.id], contextWhy: cx.why[a.id] }; });
    rows.sort(function (x, y) { return y.score - x.score; });
    var best = rows[0], runner = rows[1] && best.score - rows[1].score <= MARGIN && rows[1].points > 0 ? rows[1] : null;
    var rec = { common: common, rows: rows, best: best.points > 0 ? best : null, runnerUp: runner, ignored: ignored, margin: MARGIN };
    // Exploration unit: strategy needs new customers or channels as well as efficiency, the team can fund a separate unit, and never for E.
    var needsNew = state.measures.some(function (m) { return m.rank >= 1 && m.row === 'SR02'; });
    var canFund = answers && (['51-200', 'Over 200'].indexOf(answers.headcount_band) >= 0 || (answers.exploration_unit && answers.exploration_unit !== 'No'));
    rec.exploration = !!(rec.best && rec.best.id !== 'E' && needsNew && canFund);
    // What would change the answer: change one Organisation answer at a time and see whether the best fit moves.
    rec.flips = [];
    if (!noFlip && rec.best && answers) {
      CONTEXT_FIELDS.forEach(function (f) {
        var opts = {}; CONTEXT.forEach(function (r) { if (r.f === f) r.a.forEach(function (o) { opts[o] = 1; }); });
        Object.keys(opts).forEach(function (o) {
          if (answers[f] === o) return;
          var alt = {}; Object.keys(answers).forEach(function (k) { alt[k] = answers[k]; }); alt[f] = o;
          var r2 = recommend(state, levels, alt, true);
          if (r2.best && r2.best.id !== rec.best.id) rec.flips.push({ field: f, from: answers[f] || 'not answered', to: o, model: r2.best.name });
        });
      });
    }
    return rec;
  }
  // Team shape. Four levels, listed bottom to top. McKinsey's "From anxiety to advantage" (June 2026) uses five (operators, senior operators, managers, directors and senior managers, leaders); Workmatik merges the top two and renames the bottom two.
  var LEVELS = [
    { id: 'jr', name: 'Junior practitioners' }, { id: 'sr', name: 'Senior practitioners' }, { id: 'mgr', name: 'Managers' }, { id: 'dir', name: 'Directors' }
  ];
  // vals: four numbers, bottom to top. Returns Pyramid, Diamond, Hourglass, Other, or '' when there is nothing to classify.
  function classifyShape(vals) {
    var v = (vals || []).map(function (x) { return Number(x) || 0; });
    if (v.length !== 4 || v.reduce(function (a, b) { return a + b; }, 0) <= 0) return '';
    var nonInc = true; for (var i = 1; i < 4; i++) if (v[i] > v[i - 1]) nonInc = false;
    if (nonInc && v[0] > v[2]) return 'Pyramid';
    var peak = Math.max(v[1], v[2]);
    if (peak > v[0] && peak > v[3]) return 'Diamond';
    var midMin = Math.min(v[1], v[2]);
    if (midMin < v[0] && midMin < v[3]) return 'Hourglass';
    return 'Other';
  }
  // Editable rules (Rules tab). Defaults are copied once so they can be restored.
  var DEFAULTS = { weights: JSON.parse(JSON.stringify(GAP_WEIGHTS)), points: CONTEXT.map(function (r) { return r.p; }), notReady: NOT_READY, margin: MARGIN, augShare: AUG_SHARE };
  function setRule(kind, a, b, v) {
    v = parseFloat(v); if (isNaN(v) || v < 0) return;
    if (kind === 'weight') GAP_WEIGHTS[a][b] = v;
    else if (kind === 'context') CONTEXT[a].p = v;
    else if (kind === 'notReady') { NOT_READY = v; api.notReady = v; }
    else if (kind === 'margin') { MARGIN = v; api.margin = v; }
    else if (kind === 'augShare') { AUG_SHARE = Math.min(1, v); api.augShare = AUG_SHARE; }
  }
  function resetRules() {
    Object.keys(DEFAULTS.weights).forEach(function (m) { Object.keys(DEFAULTS.weights[m]).forEach(function (g) { GAP_WEIGHTS[m][g] = DEFAULTS.weights[m][g]; }); });
    CONTEXT.forEach(function (r, i) { r.p = DEFAULTS.points[i]; });
    NOT_READY = DEFAULTS.notReady; MARGIN = DEFAULTS.margin; AUG_SHARE = DEFAULTS.augShare;
    api.notReady = NOT_READY; api.margin = MARGIN; api.augShare = AUG_SHARE;
  }
  function byId(id) { return LIST.filter(function (a) { return a.id === id; })[0]; }
  var api = window.WorkmatikArchetypes = { setRule: setRule, resetRules: resetRules, list: LIST, cells: CELLS, notes: NOTES, points: POINTS, rankWeight: rankWeight, byId: byId, modes: MODES, modelModes: MODEL_MODES, modeLabel: MODE_LABEL, gapAreas: GAP_AREAS, gapWeights: GAP_WEIGHTS, notReady: NOT_READY, gapPenalty: gapPenalty, gapSources: GAP_SOURCES, gapCuts: GAP_CUTS, gapLevels: gapLevels, recommend: recommend, margin: MARGIN, levels: LEVELS, augShare: AUG_SHARE, classifyShape: classifyShape, context: CONTEXT };
})();
