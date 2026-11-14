(function () {
  'use strict';
  var BASE = 'https://scottstockwellworkmatik.github.io/';
  var STEPS = [
    { id: 'strategy', name: 'Strategy tab', level: 'Why?', q: 'What is the organisation for, and how will we know it is succeeding?', tab: 'strategy', cta: 'Open the Strategy tab',
      what: 'Write your purpose, record the business measures that show success, and give a priority number to the few you want every later choice to trace back to. Add your own rows, columns and measures.',
      needs: 'Nothing. This is where you start.', gives: 'An Excel strategy file with your measures and priority order. Download it to tag workflows in step 2.', next: 'Step 2 lets you tag each workflow with the priorities it supports. The Roadmap tab (step 7) puts the work in priority order.' },
    { id: 'workflow', name: 'AI Workflow Assessment', level: 'What work?', q: 'Which workflows first?', url: 'ai-workflow-assessment/',
      what: 'Choose the workflows that deliver your strategy and tag each to the priorities it supports. Take that list to step 3. When you return with your Roles file, the tool checks the two agree, and only then lets you score value, feasibility and risk.',
      needs: 'The Strategy file from step 1. On your return, the Roles file from step 3.', gives: 'An Excel file with your workflows and priority tags, and once checked, scores and ranks.', next: 'Step 3 ticks the activities your workflows need. Come back here with the Roles file to score. Step 4 then shows which capabilities your workflows depend on, and the Roadmap tab (step 7) uses your tags to put the work in priority order.' },
    { id: 'roles', name: 'AI Roles Assessment', level: 'Who, and how?', q: 'Where could AI apply?', url: 'ai-roles-assessment/',
      what: 'Load your Workflow file and the activities your selected workflows need are ticked for you, with the full list still available. Review the roles, add any work the roles still need, and classify each activity as full automation, augmentation or human only. Add your own roles and activities if the starter list does not fit.',
      needs: 'The Workflow file from step 2 (recommended, so the right activities are ticked).', gives: 'An Excel file with your roles and activities in scope, marking any that no workflow uses.', next: 'Go back to the AI Workflow Assessment (step 2) and load it. Work your roles need that no workflow covers is flagged, and scoring unlocks once the two agree.' },
    { id: 'capability', name: 'AI Capability Assessment', level: 'Can we? Organisation', q: 'Can the function support it?', url: 'ai-capability-assessment/',
      what: 'Score 35 capabilities across seven categories to find the critical gaps, such as policy, data readiness and human oversight.',
      needs: 'The Workflow file from step 2 (optional) to link capabilities to workflows.', gives: 'An Excel file with capability scores.', next: 'The Roadmap tab holds back workflows whose supporting capabilities are weak.' },
    { id: 'skills', name: 'AI Skills Assessment', level: 'Can we? People', q: 'Can the people deliver it?', url: 'ai-skills-assessment/',
      what: 'Each person rates themselves across six domains and sees their results and next steps. A manager or peer can rate the same person. The Team rollup tab compares files.',
      needs: 'Nothing. Each person completes it on their own.', gives: 'One Excel file per person.', next: 'The Roadmap tab (step 7) averages the files and flags weak domains.' },
    { id: 'map', name: 'Marketing Skills Map', level: 'Can we? Team', q: 'Which skills matter most?', url: 'ai-skills-map/',
      what: 'Rank the ten skills that matter most to your team and rate how well the team covers each one.',
      needs: 'Nothing. A team discussion works best.', gives: 'An Excel file with ranks and coverage.', next: 'The Roadmap tab flags skills that rank high but are poorly covered.' },
    { id: 'roadmap', name: 'Roadmap tab', level: 'In what order?', q: 'What do we do first, and what must be fixed before that?', tab: 'files', cta: 'Load my files',
      what: 'On the Files tab, drop in the Excel files you have. The Roadmap tab joins them with your strategy into one sequence: workflows to start now, foundations to fix first, and skills to build, in the order of your priorities. Change the rules on the Rules tab to test other thresholds.',
      needs: 'Any combination of the files from steps 1 to 6. Your strategy is read from the Strategy tab.', gives: 'An on-screen roadmap and an Excel download.', next: 'Use the sequence to plan. The Journey Map shows how to build each foundation.' }
  ];
  var KEY = 'workmatik-toolkit-progress-1', done = {};
  function load() { try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } }
  function save() { /* progress ticks are kept on the page only */ }
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function io(label, text) { var d = el('div'); d.appendChild(el('dt', null, label)); d.appendChild(el('dd', null, text)); return d; }
  function render() {
    var host = document.getElementById('steps'); host.textContent = '';
    STEPS.forEach(function (s, i) {
      var li = el('li', 'tk-step' + (done[s.id] ? ' done' : ''));
      li.appendChild(el('div', 'tk-num', done[s.id] ? '✓' : String(i + 1)));
      var c = el('div', 'tk-card');
      c.appendChild(el('span', 'tk-level', 'Step ' + (i + 1) + ' · ' + s.level));
      c.appendChild(el('h2', null, s.name));
      c.appendChild(el('p', 'tk-q', s.q));
      c.appendChild(el('p', null, s.what));
      var dl = el('dl', 'tk-io'); dl.appendChild(io('You need', s.needs)); dl.appendChild(io('You get', s.gives)); c.appendChild(dl);
      c.appendChild(el('p', null, 'What happens next: ' + s.next));
      var f = el('div', 'tk-foot');
      var a; if (s.tab) { a = el('button', 'btn primary', s.cta); a.type = 'button'; a.addEventListener('click', function () { if (window.__toolkitShowTab) window.__toolkitShowTab(s.tab); }); } else { a = el('a', 'btn primary', 'Open ' + s.name); a.href = BASE + s.url; a.target = '_blank'; a.rel = 'noopener'; }
      f.appendChild(a);
      var lab = el('label'); var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!done[s.id];
      cb.addEventListener('change', function () { if (cb.checked) done[s.id] = true; else delete done[s.id]; save(); render(); });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' I have done this and kept the file')); f.appendChild(lab);
      c.appendChild(f); li.appendChild(c); host.appendChild(li);
    });
    var n = STEPS.filter(function (s) { return done[s.id]; }).length;
    document.getElementById('progressText').textContent = n + ' of ' + STEPS.length + ' steps done';
    document.getElementById('progressBar').style.width = (n / STEPS.length * 100) + '%';
  }
  load(); render();
  document.getElementById('btnReset').addEventListener('click', function () { done = {}; save(); render(); });
})();
