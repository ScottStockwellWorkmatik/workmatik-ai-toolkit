(function () {
  'use strict';
  var BASE = 'https://scottstockwellworkmatik.github.io/';
  var STEPS = [
    { id: 'roles', name: 'AI Roles Assessment', level: 'Work', q: 'Where could AI apply?', url: 'ai-roles-assessment/',
      what: 'Choose the roles in your function and classify each activity as full automation, augmentation or human only. Add your own roles and activities if the starter list does not fit.',
      needs: 'Nothing. This is where you start.', gives: 'An Excel file with your roles and activities in scope.', next: 'Step 2 uses it to show only the workflows your roles touch.' },
    { id: 'workflow', name: 'AI Workflow Assessment', level: 'Work', q: 'Which workflows first?', url: 'ai-workflow-assessment/',
      what: 'Score each workflow on value, feasibility and risk. The tool adds an indicative EU AI Act tier and a priority score. Add your own workflows and steps if needed.',
      needs: 'The Roles file from step 1 (optional, but recommended).', gives: 'An Excel file with scored, ranked workflows.', next: 'Step 3 shows which capabilities your workflows depend on. Step 6 uses the priorities.' },
    { id: 'capability', name: 'AI Capability Assessment', level: 'Function level', q: 'Can the function support it?', url: 'ai-capability-assessment/',
      what: 'Score 35 capabilities across seven categories to find the critical gaps, such as policy, data readiness and human oversight.',
      needs: 'The Workflow file from step 2 (optional) to link capabilities to workflows.', gives: 'An Excel file with capability scores.', next: 'Step 6 holds back workflows whose supporting capabilities are weak.' },
    { id: 'skills', name: 'AI Skills Assessment', level: 'Individual level', q: 'Can the people deliver it?', url: 'ai-skills-assessment/',
      what: 'Each person rates themselves across six domains and sees their results and next steps. A manager or peer can rate the same person. The Team rollup tab compares files.',
      needs: 'Nothing. Each person completes it on their own.', gives: 'One Excel file per person.', next: 'Step 6 averages the files and flags weak domains.' },
    { id: 'map', name: 'Marketing Skills Map', level: 'Team level', q: 'Which skills matter most?', url: 'ai-skills-map/',
      what: 'Rank the ten skills that matter most to your team and rate how well the team covers each one.',
      needs: 'Nothing. A team discussion works best.', gives: 'An Excel file with ranks and coverage.', next: 'Step 6 flags skills that rank high but are poorly covered.' },
    { id: 'strategy', name: 'AI Strategy View', level: 'Strategy', q: 'What do we do first, and what must be fixed before that?', url: 'ai-strategy-view/',
      what: 'Drop in the Excel files you have. The page joins them into one sequence: workflows to start now, foundations to fix first, and skills to build. Change the rules on the Rules tab to test other thresholds.',
      needs: 'Any combination of the files from steps 1 to 5.', gives: 'An on-screen strategy and an Excel download.', next: 'Use the sequence to plan. The Journey Map shows how to build each foundation.' }
  ];
  var KEY = 'workmatik-toolkit-progress-1', done = {};
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (v && typeof v === 'object') done = v; } catch (e) { done = {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {} }
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
      var a = el('a', 'btn primary', 'Open ' + s.name); a.href = BASE + s.url; a.target = '_blank'; a.rel = 'noopener'; f.appendChild(a);
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
