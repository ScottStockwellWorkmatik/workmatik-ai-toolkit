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
    'SR01|SC01': ['B', 'A'], 'SR01|SC02': ['A', 'B'], 'SR01|SC03': ['A', 'D'],
    'SR02|SC01': ['C', 'E'], 'SR02|SC02': ['B', 'C'], 'SR02|SC03': ['D', 'E'],
    'SR03|SC01': ['C', 'E'], 'SR03|SC02': ['B', 'C'], 'SR03|SC03': ['C', 'D']
  };
  var NOTES = {
    'SR01|SC01': 'Speed on brand and trust leans towards control, so hub and spoke first, then the governed hub.',
    'SR03|SC03': 'Cost on growing existing customers leans towards pods first, then the fixed base.'
  };
  // Points: first choice 2, second choice 1, each multiplied by the measure's rank weight. Rank 1 counts in full; no limit on how many ranks count.
  var POINTS = { first: 2, second: 1 };
  function rankWeight(rank) { return rank >= 1 ? 1 / rank : 0; }

  // Work modes: the kind of work a person is accountable for at a given moment. One person can work in more than one mode.
  // This is the Workmatik framework, not a research finding. Innovator is a mindset that cuts across all four, not a fifth mode.
  var MODE_LABEL = 'work mode';
  var MODES = [
    { id: 'S', name: 'Strategist', text: 'Owns outcomes and makes judgement calls. Sets direction for agents, decides when AI output is good enough and when it needs human intervention, and holds the commercial accountability for the pod\'s results.' },
    { id: 'O', name: 'Orchestrator', text: 'Designs and manages the agent workflows. Defines the quality parameters agents work within, supervises execution at scale, catches failure modes before they compound, and keeps improving the workflow design as capability matures.' },
    { id: 'G', name: 'Governor', text: 'Owns the human decision gates: brand safety, compliance review, quality assurance on AI-generated content, and escalation when an agent output falls outside acceptable parameters.' },
    { id: 'P', name: 'Practitioner', text: 'Teams with the agents and uses AI to deliver campaigns, build relationships and drive impact, to delight customers with the organisation\'s products and services.' }
  ];
  // How much each organisation model leans on each work mode: H high, M medium, L low. Draft ratings from the research brief, to test with clients.
  var MODEL_MODES = {
    A: { S: 'M', O: 'H', G: 'H', P: 'M' },
    B: { S: 'M', O: 'M', G: 'M', P: 'H' },
    C: { S: 'H', O: 'M', G: 'M', P: 'H' },
    D: { S: 'H', O: 'M', G: 'H', P: 'H' },
    E: { S: 'H', O: 'H', G: 'M', P: 'L' }
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
  function gapPenalty(id, levels) {
    var w = GAP_WEIGHTS[id] || {}, total = 0, gaps = [];
    GAP_AREAS.forEach(function (g) {
      var lv = Number(levels && levels[g.id]) || 0, pts = (w[g.id] || 0) * lv;
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
  // Recommendation: simple points from the strategy grid, less the gap penalty. Organisation context signals are added in the next step.
  var MARGIN = 2; // a runner-up is shown when its score is within this many points of the best
  // state = WorkmatikStrategy.state(); measures with rank >= 1 count, with no limit. Added rows or columns count only when the client chose a model for them.
  function recommend(state, levels) {
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
    var rows = LIST.map(function (a) { var g = gapPenalty(a.id, levels); return { id: a.id, name: a.name, points: pts[a.id], penalty: g.penalty, gaps: g.gaps, notReady: g.notReady, score: pts[a.id] - g.penalty, why: why[a.id] }; });
    rows.sort(function (x, y) { return y.score - x.score; });
    var best = rows[0], runner = rows[1] && best.score - rows[1].score <= MARGIN && rows[1].points > 0 ? rows[1] : null;
    return { rows: rows, best: best.points > 0 ? best : null, runnerUp: runner, ignored: ignored, margin: MARGIN };
  }
  function byId(id) { return LIST.filter(function (a) { return a.id === id; })[0]; }
  window.WorkmatikArchetypes = { list: LIST, cells: CELLS, notes: NOTES, points: POINTS, rankWeight: rankWeight, byId: byId, modes: MODES, modelModes: MODEL_MODES, modeLabel: MODE_LABEL, gapAreas: GAP_AREAS, gapWeights: GAP_WEIGHTS, notReady: NOT_READY, gapPenalty: gapPenalty, gapSources: GAP_SOURCES, gapCuts: GAP_CUTS, gapLevels: gapLevels, recommend: recommend, margin: MARGIN };
})();
