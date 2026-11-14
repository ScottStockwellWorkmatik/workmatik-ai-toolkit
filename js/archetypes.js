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
  function byId(id) { return LIST.filter(function (a) { return a.id === id; })[0]; }
  window.WorkmatikArchetypes = { list: LIST, cells: CELLS, notes: NOTES, points: POINTS, rankWeight: rankWeight, byId: byId, modes: MODES, modelModes: MODEL_MODES, modeLabel: MODE_LABEL };
})();
