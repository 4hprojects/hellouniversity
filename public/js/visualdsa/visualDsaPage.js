(function initializeVisualDsaShell(root) {
  'use strict';

  const shell = root.document?.querySelector('[data-visualdsa-shell]');
  const runtimeApi = root.VisualDsaModuleRuntime;
  if (!shell || !runtimeApi) return;

  const elements = {
    svg: shell.querySelector('.visualdsa-canvas'),
    status: shell.querySelector('[data-visualdsa-status]'),
    currentMode: shell.querySelector('[data-visualdsa-current-mode]'),
    step: shell.querySelector('[data-visualdsa-step]'),
    liveState: shell.querySelector('[data-visualdsa-live-state]'),
    feedback: shell.querySelector('[data-visualdsa-feedback]'),
    explanation: shell.querySelector('[data-visualdsa-explanation]'),
    pseudocode: shell.querySelector('[data-visualdsa-pseudocode]'),
    previous: shell.querySelector('[data-visualdsa-control="previous"]'),
    play: shell.querySelector('[data-visualdsa-control="play"]'),
    pause: shell.querySelector('[data-visualdsa-control="pause"]'),
    next: shell.querySelector('[data-visualdsa-control="next"]'),
    reset: shell.querySelector('[data-visualdsa-control="reset"]'),
    speed: shell.querySelector('[data-visualdsa-speed]'),
    inputError: shell.querySelector('[data-visualdsa-input-error]'),
    counters: Object.fromEntries(Array.from(shell.querySelectorAll('[data-visualdsa-counter]'))
      .map((node) => [node.dataset.visualdsaCounter, node]))
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const activityClient = root.VisualDsaActivityClient;
  const practicePanel = shell.querySelector('[data-recorded-practice]');
  const practiceStart = shell.querySelector('[data-practice-start]');
  const practiceForm = shell.querySelector('[data-practice-response]');
  const practicePrompt = shell.querySelector('[data-practice-prompt]');
  const practiceComplete = shell.querySelector('[data-practice-complete]');
  const practiceHint = shell.querySelector('[data-practice-hint]');
  const practiceContinue = shell.querySelector('[data-practice-continue]');
  const prediction = shell.querySelector('[data-guided-prediction]');
  const predictionReady = shell.querySelector('[data-guided-prediction-ready]');
  let practice;
  let csrfTokenPromise;

  async function emitEvent(eventType, metadata = {}) {
    if (shell.dataset.recordEvents !== 'true' || !root.crypto?.randomUUID || !root.fetch) return;
    try {
      csrfTokenPromise ||= root.fetch('/api/csrf-token', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok || !payload.csrfToken) throw new Error('CSRF unavailable');
          return payload.csrfToken;
        });
      const csrfToken = await csrfTokenPromise;
      await root.fetch('/api/visualdsa/events', {
        method: 'POST', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({
          eventId: root.crypto.randomUUID(), eventType, clientTimestamp: new Date().toISOString(), metadata,
          context: { lessonSlug: shell.dataset.lessonSlug, moduleKey: shell.dataset.moduleKey, moduleVersion: shell.dataset.moduleVersion, mode: elements.currentMode.textContent.toLowerCase(), classId:shell.dataset.practiceClassId||undefined }
        })
      });
    } catch (_error) {
      csrfTokenPromise = undefined;
    }
  }

  function createPreviewStates(label) {
    return [
      { step: 0, label, phase: 'Input ready', explanation: 'Validate the input before the algorithm begins.', activeLine: 0, values: ['Input', 'Ready', 'Start'] },
      { step: 1, label, phase: 'Initial state', explanation: 'Create a deterministic initial state from the validated input.', activeLine: 1, values: ['Input', 'Current', 'Next'] },
      { step: 2, label, phase: 'Transition', explanation: 'Apply one reproducible transition and preserve the previous snapshot.', activeLine: 2, values: ['Previous', 'Current', 'Next'] },
      { step: 3, label, phase: 'Rendered state', explanation: 'Synchronize the visual state, pseudocode, variables, and explanation.', activeLine: 3, values: ['Previous', 'Final', 'Complete'] }
    ];
  }

  function svgElement(name, attributes, text) {
    const node = root.document.createElementNS(SVG_NS, name);
    Object.entries(attributes || {}).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function updateSharedState(state, snapshot) {
    elements.explanation.textContent = state.explanation;
    elements.step.textContent = `${snapshot.index} of ${snapshot.length - 1}`;
    elements.previous.disabled = !snapshot.canPrevious;
    elements.next.disabled = !snapshot.canNext;
    elements.play.disabled = !snapshot.canNext;
    const resolved = root.VisualDsaPseudocode?.resolve(shell.dataset.moduleKey, state, shell.dataset.defaultSortingAlgorithm);
    if (resolved && elements.pseudocode) {
      elements.pseudocode.dataset.pseudocodeVersion = resolved.version;
      elements.pseudocode.replaceChildren(...resolved.lines.map((text, index) => {
        const line = root.document.createElement('li');
        line.textContent = text;
        if (index === resolved.activeLine) { line.classList.add('is-current'); line.setAttribute('aria-current', 'step'); }
        return line;
      }));
    }
    const applicable = { arrays:['reads','writes','shifts'],stacks:['pushes','pops','peeks'],queues:['enqueues','dequeues','wraparounds'], 'binary-search':['comparisons','iterations','remaining'],sorting:['comparisons','swaps','writes','passes'],bst:['comparisons','nodesVisited','currentDepth'] }[shell.dataset.moduleKey] || [];
    Object.entries(elements.counters).forEach(([key, node]) => { node.closest('div').hidden = !applicable.includes(key); });
    Object.entries(state.counters || {}).forEach(([key, value]) => {
      if (elements.counters[key]) elements.counters[key].textContent = value;
    });
  }

  const previewAdapter = {
    createStates: () => createPreviewStates(shell.dataset.moduleKey),
    describeState: (state, snapshot) => `${state.phase}. Step ${snapshot.index + 1} of ${snapshot.length}. ${state.explanation}`,
    renderState: (state, context) => {
      const { snapshot } = context;
      elements.svg.replaceChildren(
        svgElement('title', { id: 'visualDsaSvgTitle' }, `${state.label} preview: ${state.phase}`),
        svgElement('desc', { id: 'visualDsaSvgDescription' }, state.explanation),
        svgElement('rect', { x: 20, y: 20, width: 680, height: 260, rx: 16, class: 'visualdsa-canvas-boundary' })
      );

      state.values.forEach((value, index) => {
        const x = 130 + (index * 180);
        const group = svgElement('g', {
          class: index === 1 ? 'visualdsa-preview-cell is-current' : 'visualdsa-preview-cell',
          role: 'group',
          'aria-label': `Preview item ${index + 1}: ${value}${index === 1 ? ', current' : ''}`
        });
        group.append(
          svgElement('rect', { x, y: 105, width: 140, height: 80, rx: 12 }),
          svgElement('text', { x: x + 70, y: 153, 'text-anchor': 'middle' }, value)
        );
        elements.svg.append(group);
      });

      updateSharedState(state, snapshot);
    }
  };

  function readArrayInput() {
    const form = shell.querySelector('[data-visualdsa-array-input]');
    if (!form) return null;
    const data = new root.FormData(form);
    return {
      operation: data.get('operation'),
      values: data.get('values'),
      index: data.get('index'),
      newValue: data.get('newValue'),
      capacity: data.get('capacity')
    };
  }

  const arrayApi = root.VisualDsaArrayModule;
  const arrayAdapter = arrayApi ? {
    createStates: (input) => arrayApi.generateSteps(input || readArrayInput()),
    describeState: (state, snapshot) => `${state.phase}. Step ${snapshot.index + 1} of ${snapshot.length}. ${state.explanation}`,
    renderState: (state, context) => {
      const { snapshot } = context;
      const cells = Math.max(state.capacity, state.values.length, 1);
      const cellWidth = Math.min(74, Math.floor(620 / cells));
      const totalWidth = cellWidth * cells;
      const startX = (720 - totalWidth) / 2;
      elements.svg.replaceChildren(
        svgElement('title', { id: 'visualDsaSvgTitle' }, `Array ${state.operation}: ${state.phase}`),
        svgElement('desc', { id: 'visualDsaSvgDescription' }, state.explanation),
        svgElement('rect', { x: 20, y: 20, width: 680, height: 260, rx: 16, class: 'visualdsa-canvas-boundary' })
      );

      for (let index = 0; index < cells; index += 1) {
        const value = state.values[index] ?? null;
        const states = [];
        if (index === state.currentIndex) states.push('is-current');
        if (index === state.sourceIndex) states.push('is-source');
        if (index === state.destinationIndex) states.push('is-destination');
        if (index === state.insertedIndex) states.push('is-inserted');
        const stateLabel = states.map((item) => item.replace('is-', '')).join(', ');
        const x = startX + (index * cellWidth);
        const group = svgElement('g', {
          class: `visualdsa-array-cell ${states.join(' ')}`.trim(),
          role: 'group',
          'aria-label': `Array index ${index}, ${value == null ? 'unused capacity' : `value ${value}`}${stateLabel ? `, ${stateLabel}` : ''}`
        });
        group.append(
          svgElement('rect', { x, y: 105, width: cellWidth - 4, height: 70, rx: 7 }),
          svgElement('text', { x: x + ((cellWidth - 4) / 2), y: 147, 'text-anchor': 'middle' }, value == null ? '—' : String(value)),
          svgElement('text', { x: x + ((cellWidth - 4) / 2), y: 198, 'text-anchor': 'middle', class: 'visualdsa-array-index' }, String(index))
        );
        elements.svg.append(group);
      }
      elements.svg.append(
        svgElement('text', { x: 360, y: 65, 'text-anchor': 'middle', class: 'visualdsa-canvas-copy' }, `Size ${state.size} · Capacity ${state.capacity}`)
      );
      updateSharedState(state, snapshot);
    }
  } : null;

  function readStackInput() {
    const form = shell.querySelector('[data-visualdsa-stack-input]');
    if (!form) return null;
    const data = new root.FormData(form);
    return { operation: data.get('operation'), values: data.get('values'), newValue: data.get('newValue'), capacity: data.get('capacity') };
  }

  const stackApi = root.VisualDsaStackModule;
  const stackAdapter = stackApi ? {
    createStates: (input) => stackApi.generateSteps(input || readStackInput()),
    describeState: (state, snapshot) => `${state.phase}. Step ${snapshot.index + 1} of ${snapshot.length}. ${state.explanation}`,
    renderState: (state, context) => {
      const { snapshot } = context;
      elements.svg.replaceChildren(
        svgElement('title', { id: 'visualDsaSvgTitle' }, `Stack: ${state.phase}`),
        svgElement('desc', { id: 'visualDsaSvgDescription' }, state.explanation),
        svgElement('rect', { x: 20, y: 20, width: 680, height: 260, rx: 16, class: 'visualdsa-canvas-boundary' })
      );
      const cellHeight = Math.min(42, Math.floor(210 / Math.max(state.capacity, 1)));
      for (let index = 0; index < state.capacity; index += 1) {
        const value = state.values[index] ?? null;
        const y = 245 - ((index + 1) * cellHeight);
        const current = index === state.currentIndex || index === state.top;
        const group = svgElement('g', { class: `visualdsa-stack-cell${current ? ' is-current' : ''}`, role: 'group', 'aria-label': `Stack position ${index}, ${value == null ? 'empty' : `value ${value}`}${index === state.top ? ', top' : ''}` });
        group.append(svgElement('rect', { x: 270, y, width: 180, height: cellHeight - 3, rx: 5 }), svgElement('text', { x: 360, y: y + (cellHeight / 2) + 5, 'text-anchor': 'middle' }, value == null ? '—' : value));
        elements.svg.append(group);
      }
      elements.svg.append(svgElement('text', { x: 470, y: 55, class: 'visualdsa-canvas-copy' }, `TOP = ${state.top}`));
      updateSharedState(state, snapshot);
    }
  } : null;

  function readQueueInput() {
    const form = shell.querySelector('[data-visualdsa-queue-input]');
    if (!form) return null;
    const data = new root.FormData(form);
    return { operation: data.get('operation'), values: data.get('values'), newValue: data.get('newValue'), capacity: data.get('capacity'), front: data.get('front') };
  }
  const queueApi = root.VisualDsaQueueModule;
  const queueAdapter = queueApi ? {
    createStates: (input) => queueApi.generateSteps(input || readQueueInput()),
    describeState: (state, snapshot) => `${state.phase}. Step ${snapshot.index + 1} of ${snapshot.length}. ${state.explanation}`,
    renderState: (state, context) => {
      const { snapshot } = context;
      elements.svg.replaceChildren(svgElement('title', { id: 'visualDsaSvgTitle' }, `Queue: ${state.phase}`), svgElement('desc', { id: 'visualDsaSvgDescription' }, state.explanation), svgElement('rect', { x: 20, y: 20, width: 680, height: 260, rx: 16, class: 'visualdsa-canvas-boundary' }));
      const width = Math.min(74, Math.floor(620 / state.capacity));
      const startX = (720 - (width * state.capacity)) / 2;
      state.slots.forEach((value, index) => {
        const classes = ['visualdsa-queue-cell'];
        if (index === state.front) classes.push('is-front');
        if (index === state.rear) classes.push('is-rear');
        const x = startX + (index * width);
        const group = svgElement('g', { class: classes.join(' '), role: 'group', 'aria-label': `Queue index ${index}, ${value == null ? 'empty' : `value ${value}`}${index === state.front ? ', front' : ''}${index === state.rear ? ', rear' : ''}` });
        group.append(svgElement('rect', { x, y: 110, width: width - 4, height: 70, rx: 6 }), svgElement('text', { x: x + ((width - 4) / 2), y: 151, 'text-anchor': 'middle' }, value == null ? '—' : value), svgElement('text', { x: x + ((width - 4) / 2), y: 202, 'text-anchor': 'middle' }, String(index)));
        elements.svg.append(group);
      });
      elements.svg.append(svgElement('text', { x: 360, y: 65, 'text-anchor': 'middle', class: 'visualdsa-canvas-copy' }, `Front ${state.front} · Rear ${state.rear} · Size ${state.size}`));
      updateSharedState(state, snapshot);
    }
  } : null;

  function readBinarySearchInput(){const form=shell.querySelector('[data-visualdsa-binary-search-input]');if(!form)return null;const data=new root.FormData(form);return{values:data.get('values'),target:data.get('target')};}
  const binarySearchApi=root.VisualDsaBinarySearchModule;
  const binarySearchAdapter=binarySearchApi?{
    createStates:(input)=>binarySearchApi.generateSteps(input||readBinarySearchInput()),
    describeState:(state,snapshot)=>`${state.phase}. Step ${snapshot.index+1} of ${snapshot.length}. Active range ${state.low} to ${state.high}. ${state.explanation}`,
    renderState:(state,context)=>{const{snapshot}=context;elements.svg.replaceChildren(svgElement('title',{id:'visualDsaSvgTitle'},`Binary Search: ${state.phase}`),svgElement('desc',{id:'visualDsaSvgDescription'},state.explanation),svgElement('rect',{x:20,y:20,width:680,height:260,rx:16,class:'visualdsa-canvas-boundary'}));const width=Math.min(80,Math.floor(620/state.values.length));const start=(720-width*state.values.length)/2;state.values.forEach((value,index)=>{const classes=['visualdsa-search-cell'];if(index===state.mid)classes.push('is-mid');if(index===state.low||index===state.high)classes.push('is-boundary');if(index<state.low||index>state.high)classes.push('is-discarded');const x=start+index*width;const label=[`index ${index}, value ${value}`,index===state.low?'low boundary':'',index===state.high?'high boundary':'',index===state.mid?'midpoint':'',(index<state.low||index>state.high)?'discarded':''].filter(Boolean).join(', ');const g=svgElement('g',{class:classes.join(' '),role:'group','aria-label':label});g.append(svgElement('rect',{x,y:110,width:width-4,height:70,rx:6}),svgElement('text',{x:x+(width-4)/2,y:151,'text-anchor':'middle'},String(value)),svgElement('text',{x:x+(width-4)/2,y:202,'text-anchor':'middle'},String(index)));elements.svg.append(g);});elements.svg.append(svgElement('text',{x:360,y:65,'text-anchor':'middle',class:'visualdsa-canvas-copy'},`low ${state.low} · high ${state.high} · mid ${state.mid??'—'} · target ${state.target}`));updateSharedState(state,snapshot);}
  }:null;

  function readSortingInput(){const form=shell.querySelector('[data-visualdsa-sorting-input]');if(!form)return null;const data=new root.FormData(form);return{algorithm:data.get('algorithm'),values:data.get('values')};}
  const sortingApi=root.VisualDsaSortingModule;
  const sortingAdapter=sortingApi?{
    createStates:(input)=>sortingApi.generateSteps(input||readSortingInput()),
    describeState:(state,snapshot)=>`${state.algorithm} sort. ${state.phase}. Step ${snapshot.index+1} of ${snapshot.length}. ${state.explanation}`,
    renderState:(state,context)=>{const{snapshot}=context;elements.svg.replaceChildren(svgElement('title',{id:'visualDsaSvgTitle'},`${state.algorithm} sort: ${state.phase}`),svgElement('desc',{id:'visualDsaSvgDescription'},state.explanation),svgElement('rect',{x:20,y:20,width:680,height:260,rx:16,class:'visualdsa-canvas-boundary'}));const width=Math.min(80,Math.floor(620/state.values.length));const start=(720-width*state.values.length)/2;state.values.forEach((value,index)=>{const classes=['visualdsa-sort-cell'];if(state.compared?.includes(index))classes.push('is-compared');if(state.sorted?.includes(index))classes.push('is-sorted');if(index===state.keyIndex)classes.push('is-key');if(index===state.minIndex)classes.push('is-minimum');const labels=[`index ${index}, value ${value}`,state.compared?.includes(index)?'compared':'',state.sorted?.includes(index)?'sorted region':'',index===state.keyIndex?'current key':'',index===state.minIndex?'current minimum':''].filter(Boolean).join(', ');const x=start+index*width;const g=svgElement('g',{class:classes.join(' '),role:'group','aria-label':labels});g.append(svgElement('rect',{x,y:110,width:width-4,height:70,rx:6}),svgElement('text',{x:x+(width-4)/2,y:151,'text-anchor':'middle'},String(value)),svgElement('text',{x:x+(width-4)/2,y:202,'text-anchor':'middle'},String(index)));elements.svg.append(g);});elements.svg.append(svgElement('text',{x:360,y:65,'text-anchor':'middle',class:'visualdsa-canvas-copy'},`${state.algorithm} · comparisons ${state.counters.comparisons} · swaps ${state.counters.swaps} · writes ${state.counters.writes}`));updateSharedState(state,snapshot);}
  }:null;

  function readBstInput(){const form=shell.querySelector('[data-visualdsa-bst-input]');if(!form)return null;const data=new root.FormData(form);return{operation:data.get('operation'),values:data.get('values'),target:data.get('target'),traversal:data.get('traversal')};}
  function treeText(node,prefix='',label='root'){if(!node)return`${prefix}${label}: empty`;return[`${prefix}${label}: ${node.value}`,node.left?treeText(node.left,`${prefix}  `,'left'):`${prefix}  left: empty`,node.right?treeText(node.right,`${prefix}  `,'right'):`${prefix}  right: empty`].join('\n');}
  const bstApi=root.VisualDsaBstModule;
  const bstAdapter=bstApi?{
    createStates:(input)=>bstApi.generateSteps(input||readBstInput()),
    describeState:(state,snapshot)=>`${state.phase}. Step ${snapshot.index+1} of ${snapshot.length}. ${state.explanation}`,
    renderState:(state,context)=>{const{snapshot}=context;elements.svg.replaceChildren(svgElement('title',{id:'visualDsaSvgTitle'},`Binary Search Tree: ${state.phase}`),svgElement('desc',{id:'visualDsaSvgDescription'},`${state.explanation} Path: ${state.path.join(', ')||'none'}.`),svgElement('rect',{x:20,y:20,width:680,height:260,rx:16,class:'visualdsa-canvas-boundary'}));const positions=new Map();function place(node,x,y,gap,depth=0){if(!node)return;positions.set(node.id,{x,y,depth});place(node.left,x-gap,y+65,Math.max(28,gap/2),depth+1);place(node.right,x+gap,y+65,Math.max(28,gap/2),depth+1);}place(state.tree,360,55,150);function edges(node){if(!node)return;const p=positions.get(node.id);for(const child of[node.left,node.right])if(child){const c=positions.get(child.id);elements.svg.append(svgElement('line',{x1:p.x,y1:p.y+20,x2:c.x,y2:c.y-20,class:'visualdsa-tree-edge','aria-hidden':'true'}));edges(child);}}edges(state.tree);function nodes(node){if(!node)return;const p=positions.get(node.id);const classes=['visualdsa-tree-node'];if(node.id===state.currentId)classes.push('is-current');if(state.path.includes(node.value))classes.push('is-path');const g=svgElement('g',{class:classes.join(' '),role:'group','aria-label':`Node ${node.value}, depth ${p.depth}${node.id===state.currentId?', current':''}`});g.append(svgElement('circle',{cx:p.x,cy:p.y,r:22}),svgElement('text',{x:p.x,y:p.y+6,'text-anchor':'middle'},String(node.value)));elements.svg.append(g);nodes(node.left);nodes(node.right);}nodes(state.tree);const alt=shell.querySelector('[data-visualdsa-bst-text]');if(alt)alt.textContent=`${treeText(state.tree)}\nPath: ${state.path.join(' → ')||'none'}\nOutput: ${state.output.join(', ')||'none'}`;updateSharedState(state,snapshot);}
  }:null;

  const adapter = shell.dataset.moduleKey === 'arrays' && arrayAdapter
    ? arrayAdapter
    : (shell.dataset.moduleKey === 'stacks' && stackAdapter
      ? stackAdapter
      : (shell.dataset.moduleKey === 'queues'&&queueAdapter?queueAdapter:(shell.dataset.moduleKey==='binary-search'&&binarySearchAdapter?binarySearchAdapter:(shell.dataset.moduleKey==='sorting'&&sortingAdapter?sortingAdapter:(shell.dataset.moduleKey==='bst'&&bstAdapter?bstAdapter:previewAdapter)))));

  const runtime = runtimeApi.createModuleRuntime({
    adapter,
    renderContext: elements,
    onAnnouncement: (message) => { elements.liveState.textContent = message; },
    onPlaybackStatusChange: ({ playing }) => {
      elements.play.disabled = playing || !runtime?.getState().canNext;
      elements.pause.disabled = !playing;
      elements.status.textContent = playing ? 'Playing visualization steps.' : 'Visualization paused.';
    }
  });

  function selectMode(button) {
    const mode = button.dataset.visualdsaMode;
    shell.querySelectorAll('[data-visualdsa-mode]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    elements.currentMode.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    elements.status.textContent = `${elements.currentMode.textContent} mode selected.`;
    elements.feedback.textContent = mode === 'practice'
      ? 'Start a recorded server-validated practice session. Incorrect responses stay available for retry.'
      : mode === 'exploration' ? 'Change inputs and move freely through the states. Exploration is not recorded as practice.' : 'Predict the next state before advancing; you may skip the checkpoint when reviewing.';
    runtime.reset();
    if (practicePanel) practicePanel.hidden = mode !== 'practice';
    if (prediction) prediction.hidden = mode !== 'guided';
    if (predictionReady) predictionReady.checked = false;
    emitEvent('mode_selected', { selectedMode: mode });
  }

  shell.querySelectorAll('[data-visualdsa-mode]').forEach((button) => button.addEventListener('click', () => selectMode(button)));
  elements.previous.addEventListener('click', () => { runtime.previous(); emitEvent('step_reversed'); });
  function predictionPermitsAdvance() { if (elements.currentMode.textContent !== 'Guided' || !predictionReady || predictionReady.checked) return true; elements.feedback.textContent='Make a prediction and check the box before advancing. Choose Exploration to step without checkpoints.';predictionReady.focus();return false; }
  elements.next.addEventListener('click', () => { if(!predictionPermitsAdvance())return; runtime.next();if(predictionReady)predictionReady.checked=false;emitEvent('step_advanced'); });
  elements.play.addEventListener('click', () => { if(!predictionPermitsAdvance())return;runtime.play(); emitEvent('play_pressed'); });
  elements.pause.addEventListener('click', () => { runtime.pause(); emitEvent('pause_pressed'); });
  elements.reset.addEventListener('click', () => {
    runtime.reset();
    elements.status.textContent = `${elements.currentMode.textContent} mode reset.`;
    emitEvent('reset_pressed');
  });
  elements.speed.addEventListener('change', () => { runtime.setSpeed(elements.speed.value); emitEvent('speed_changed', { speed: elements.speed.value }); });
  shell.querySelector('[data-visualdsa-example]')?.addEventListener('click', () => {
    if (shell.dataset.moduleKey === 'arrays') {
      runtime.replaceStates(arrayApi.generateSteps({ operation: 'insert', values: [4, 8, 12, 18], index: 2, newValue: 9, capacity: 5 }));
      if (elements.inputError) elements.inputError.textContent = '';
    } else if (shell.dataset.moduleKey === 'stacks') {
      runtime.replaceStates(stackApi.generateSteps({ operation: 'push', values: ['7', '18'], newValue: '24', capacity: 6 }));
      if (elements.inputError) elements.inputError.textContent = '';
    } else if (shell.dataset.moduleKey === 'queues') {
      runtime.replaceStates(queueApi.generateSteps({ operation: 'enqueue', values: ['11', '18'], newValue: '24', capacity: 6, front: 0 }));
      if (elements.inputError) elements.inputError.textContent = '';
    } else if(shell.dataset.moduleKey==='binary-search'){
      runtime.replaceStates(binarySearchApi.generateSteps({values:[4,9,13,18,24,31,42],target:31}));if(elements.inputError)elements.inputError.textContent='';
    }else if(shell.dataset.moduleKey==='sorting'){
      runtime.replaceStates(sortingApi.generateSteps({algorithm:shell.dataset.defaultSortingAlgorithm||'bubble',values:[5,2,4,1]}));if(elements.inputError)elements.inputError.textContent='';
    }else if(shell.dataset.moduleKey==='bst'){
      runtime.replaceStates(bstApi.generateSteps({values:[20,10,30,5,15],operation:'insert',target:12}));if(elements.inputError)elements.inputError.textContent='';
    } else {
      runtime.replaceStates(createPreviewStates(shell.dataset.moduleKey));
    }
    elements.status.textContent = 'A deterministic example was generated.';
    emitEvent('example_generated');
  });

  shell.querySelector('[data-visualdsa-array-input]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = arrayApi.validateInput(readArrayInput());
    if (!validation.valid) {
      elements.inputError.textContent = validation.errors.join(' ');
      elements.status.textContent = 'Fix the array input before starting.';
      return;
    }
    elements.inputError.textContent = '';
    runtime.replaceStates(arrayApi.generateSteps(validation));
    elements.status.textContent = `${validation.value.operation} operation ready with ${runtime.getState().length - 1} teaching steps.`;
    if (elements.currentMode.textContent === 'Practice') {
      elements.feedback.textContent = validation.value.operation === 'insert'
        ? 'Predict each source index from right to left before selecting Next.'
        : 'Predict the next state before selecting Next.';
    }
  });

  shell.querySelector('[data-visualdsa-stack-input]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = stackApi.validateInput(readStackInput());
    if (!validation.valid) {
      elements.inputError.textContent = validation.errors.join(' ');
      elements.status.textContent = 'Fix the stack input before starting.';
      return;
    }
    elements.inputError.textContent = '';
    runtime.replaceStates(stackApi.generateSteps(validation));
    elements.status.textContent = `${validation.value.operation} operation ready.`;
    if (elements.currentMode.textContent === 'Practice') elements.feedback.textContent = 'Predict the top value before advancing.';
  });
  shell.querySelector('[data-visualdsa-queue-input]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const validation = queueApi.validateInput(readQueueInput());
    if (!validation.valid) { elements.inputError.textContent = validation.errors.join(' '); elements.status.textContent = 'Fix the queue input before starting.'; return; }
    elements.inputError.textContent = '';
    runtime.replaceStates(queueApi.generateSteps(validation));
    elements.status.textContent = `${validation.value.operation} operation ready.`;
    if (elements.currentMode.textContent === 'Practice') elements.feedback.textContent = 'Predict the front value or next pointer before advancing.';
  });
  shell.querySelector('[data-visualdsa-binary-search-input]')?.addEventListener('submit',(event)=>{event.preventDefault();const validation=binarySearchApi.validateInput(readBinarySearchInput());if(!validation.valid){elements.inputError.textContent=validation.errors.join(' ');elements.status.textContent='Fix the sorted input before searching.';return;}elements.inputError.textContent='';runtime.replaceStates(binarySearchApi.generateSteps(validation));elements.status.textContent='Binary Search ready.';if(elements.currentMode.textContent==='Practice')elements.feedback.textContent='Predict mid, then update the correct boundary before advancing.';});
  shell.querySelector('[data-visualdsa-sorting-input]')?.addEventListener('submit',(event)=>{event.preventDefault();const validation=sortingApi.validateInput(readSortingInput());if(!validation.valid){elements.inputError.textContent=validation.errors.join(' ');elements.status.textContent='Fix the sorting input before starting.';return;}elements.inputError.textContent='';runtime.replaceStates(sortingApi.generateSteps(validation));elements.status.textContent=`${validation.value.algorithm} sort ready.`;if(elements.currentMode.textContent==='Practice')elements.feedback.textContent='Predict the next algorithm-specific comparison, swap, minimum, or shift.';});
  shell.querySelector('[data-visualdsa-bst-input]')?.addEventListener('submit',(event)=>{event.preventDefault();const validation=bstApi.validateInput(readBstInput());if(!validation.valid){elements.inputError.textContent=validation.errors.join(' ');elements.status.textContent='Fix the tree input before starting.';return;}elements.inputError.textContent='';runtime.replaceStates(bstApi.generateSteps(validation));elements.status.textContent=`BST ${validation.value.operation} ready.`;if(elements.currentMode.textContent==='Practice')elements.feedback.textContent='Predict the next direction, parent, or traversal node before advancing.';});

  shell.querySelectorAll('.visualdsa-input-form').forEach((form) => form.addEventListener('submit', () => {
    root.queueMicrotask(() => emitEvent(elements.inputError?.textContent ? 'validation_error' : 'custom_input_submitted'));
  }));

  function showPracticeStep() {
    const item = practice?.steps[practice.cursor];
    if (!item) { practiceForm.hidden = true; practiceComplete.hidden = false; elements.feedback.textContent = 'All practice prompts are answered. Complete the session when ready.'; return; }
    runtime.restore(item.index); practicePrompt.textContent = activityClient.prompt(shell.dataset.moduleKey, item.state); practiceForm.hidden = false; practiceComplete.hidden = true; practiceForm.elements.response.value = ''; practiceForm.elements.response.focus();
  }
  practiceStart?.addEventListener('click', async () => {
    practiceStart.disabled = true; elements.feedback.textContent = 'Starting recorded practice…';
    try {
      const session = await activityClient.request('/api/visualdsa/practice-sessions', { method:'POST', body:JSON.stringify({ moduleKey:shell.dataset.moduleKey, templateKey:activityClient.templateKey(shell.dataset.moduleKey,shell.dataset.defaultSortingAlgorithm), difficulty:'introductory', classId:shell.dataset.practiceClassId||undefined }) });
      const generatedStates = activityClient.states(shell.dataset.moduleKey, session.problem.input); runtime.replaceStates(generatedStates);
      practice = { sessionId:session.sessionId, steps:activityClient.actionSteps(shell.dataset.moduleKey,session.problem.input), cursor:0 };
      practiceStart.hidden = true; elements.feedback.textContent = 'Recorded practice started. Responses are validated by the server.'; showPracticeStep();
    } catch(error) { elements.feedback.textContent = error.message; practiceStart.disabled = false; }
  });
  practiceForm?.addEventListener('submit', async (event) => {
    event.preventDefault(); const item=practice?.steps[practice.cursor]; if(!item)return;
    const submit=practiceForm.querySelector('button[type="submit"]'); submit.disabled=true;
    try {
      const result=await activityClient.request(`/api/visualdsa/practice-sessions/${practice.sessionId}/actions`,{method:'POST',body:JSON.stringify({clientEventId:root.crypto.randomUUID(),stepNumber:item.index,actionType:'predict',payload:activityClient.payload(shell.dataset.moduleKey,item.state,practiceForm.elements.response.value),clientTimestamp:new Date().toISOString()})});
      if(result.isCorrect){elements.feedback.textContent='Correct. Continue to the next prompt.';practice.cursor+=1;showPracticeStep();}
      else { const detail=result.misconception;elements.feedback.textContent=detail?`${detail.title}: ${detail.explanation}`:'Review the algorithm rule and try this prompt again.';practiceHint.hidden=false;practiceContinue.hidden=false;practiceForm.elements.response.select(); }
    } catch(error){elements.feedback.textContent=error.message;} finally{submit.disabled=false;}
  });
  practiceHint?.addEventListener('click',async()=>{const item=practice?.steps[practice.cursor];if(!item)return;practiceHint.disabled=true;try{const result=await activityClient.request(`/api/visualdsa/practice-sessions/${practice.sessionId}/steps/${item.index}/hint`,{method:'POST'});elements.feedback.textContent=`Hint ${result.hintLevel}: ${result.hint}`;practice.hintLevel=result.hintLevel;}catch(error){elements.feedback.textContent=error.message;}finally{practiceHint.disabled=false;}});
  practiceContinue?.addEventListener('click',()=>{practice.cursor+=1;practiceHint.hidden=true;practiceContinue.hidden=true;showPracticeStep();});
  practiceComplete?.addEventListener('click',async()=>{practiceComplete.disabled=true;try{await activityClient.request(`/api/visualdsa/practice-sessions/${practice.sessionId}/complete`,{method:'POST'});elements.feedback.textContent='Recorded practice completed. Your progress will update shortly.';practiceComplete.hidden=true;}catch(error){elements.feedback.textContent=error.message;practiceComplete.disabled=false;}});

  root.addEventListener?.('pagehide', runtime.destroy, { once: true });
  emitEvent('module_opened');
}(typeof globalThis !== 'undefined' ? globalThis : this));
