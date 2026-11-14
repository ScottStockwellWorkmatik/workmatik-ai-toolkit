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
  function byId(id) { return LIST.filter(function (a) { return a.id === id; })[0]; }
  window.WorkmatikArchetypes = { list: LIST, cells: CELLS, notes: NOTES, points: POINTS, rankWeight: rankWeight, byId: byId };
})();
