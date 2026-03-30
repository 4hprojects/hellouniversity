(function attachTeacherGameBuilder(global) {
  'use strict';

  const SHAPES = ['&#9650;', '&#9670;', '&#9679;', '&#9632;'];
  const TYPE_LABELS = {
    multiple_choice: 'MC',
    true_false: 'T/F',
    poll: 'Poll',
    type_answer: 'Text'
  };

  const state = {
    gameId: '',
    mode: 'create',
    questions: [],
    activeIndex: -1,
    saving: false,
    availableClasses: [],
    activeClassesLoadFailed: false,
    linkedClassId: '',
    linkedClassNote: '',
    launchContext: {
      active: false,
      requestedLinkedClassId: '',
      backToClassHref: '/teacher/classes',
      note: ''
    }
  };

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function showToast(msg, isError) {
    const el = byId('lgToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  function updateLinkedClassNote(message) {
    state.linkedClassNote = message || 'Linked sessions require verified student login and class roster membership when hosted.';
    const note = byId('lgLinkedClassNote');
    if (note) note.textContent = state.linkedClassNote;
  }

  function getLaunchContextParams() {
    const params = new URLSearchParams(global.location?.search || '');
    const requestedLinkedClassId = String(params.get('linkedClassId') || '').trim();
    const requestedLaunchContext = String(params.get('launchContext') || '').trim();
    const active = state.mode === 'create' && requestedLaunchContext === 'class-workspace';

    return {
      active,
      requestedLinkedClassId: active ? requestedLinkedClassId : '',
      backToClassHref: active && requestedLinkedClassId
        ? `/teacher/classes/${encodeURIComponent(requestedLinkedClassId)}`
        : '/teacher/classes',
      note: ''
    };
  }

  function getLinkedClassLabel(classItem) {
    const labelParts = [classItem.className || 'Untitled class'];
    if (classItem.courseCode) labelParts.push(classItem.courseCode);
    if (classItem.classCode) labelParts.push(classItem.classCode);
    return labelParts.join(' / ');
  }

  function findAvailableClass(classId) {
    const normalizedClassId = String(classId || '').trim();
    if (!normalizedClassId) return null;
    return state.availableClasses.find((classItem) => String(classItem._id || '') === normalizedClassId) || null;
  }

  function setLaunchContextNote(message) {
    state.launchContext.note = message || '';
    renderLaunchContextStrip();
  }

  function renderLaunchContextStrip() {
    const strip = byId('lgLaunchContext');
    if (!strip) return;

    if (!state.launchContext.active) {
      strip.hidden = true;
      return;
    }

    strip.hidden = false;

    const title = byId('lgLaunchContextTitle');
    const meta = byId('lgLaunchContextMeta');
    const backLink = byId('lgBackToClassLink');
    const selectedClass = findAvailableClass(state.linkedClassId);

    if (backLink) {
      backLink.href = state.launchContext.backToClassHref || '/teacher/classes';
    }

    if (selectedClass) {
      if (title) title.textContent = 'Class workspace launch';
      if (meta) {
        meta.textContent = `${getLinkedClassLabel(selectedClass)} is selected for this new ClassRush game. You can change or clear it before saving.`;
      }
      return;
    }

    if (state.launchContext.note) {
      if (title) title.textContent = 'Class prefill unavailable';
      if (meta) meta.textContent = state.launchContext.note;
      return;
    }

    if (title) title.textContent = 'Class workspace launch';
    if (meta) {
      meta.textContent = 'This builder was opened from a class workspace. Choose an active class below or keep this game unlinked before saving.';
    }
  }

  function populateLinkedClassSelect(selectedClassId) {
    const select = byId('lgLinkedClass');
    if (!select) return false;

    const normalizedSelectedClassId = String(selectedClassId || '').trim();
    const currentOptions = ['<option value="">Not linked to a class</option>'];
    state.availableClasses.forEach((classItem) => {
      currentOptions.push(
        `<option value="${escapeHtml(String(classItem._id || ''))}">${escapeHtml(getLinkedClassLabel(classItem))}</option>`
      );
    });
    select.innerHTML = currentOptions.join('');

    const hasSelectedActiveClass = normalizedSelectedClassId
      && state.availableClasses.some((classItem) => String(classItem._id || '') === normalizedSelectedClassId);

    select.value = hasSelectedActiveClass ? normalizedSelectedClassId : '';
    state.linkedClassId = select.value;
    return hasSelectedActiveClass;
  }

  async function loadActiveClasses() {
    try {
      const res = await fetch('/api/teacher/classes?status=active', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load classes.');
      state.activeClassesLoadFailed = false;
      state.availableClasses = Array.isArray(data.classes) ? data.classes : [];
      const targetClassId = state.mode === 'create' && state.launchContext.active
        ? state.launchContext.requestedLinkedClassId
        : state.linkedClassId;
      const hasSelectedActiveClass = populateLinkedClassSelect(targetClassId);

      if (state.mode === 'create' && state.launchContext.active) {
        if (targetClassId && hasSelectedActiveClass) {
          updateLinkedClassNote('');
          setLaunchContextNote('');
        } else if (targetClassId) {
          updateLinkedClassNote('The class from this launch link is no longer active or accessible. Choose another class or leave this game unlinked.');
          setLaunchContextNote('The class from this launch link is no longer active or accessible. You can choose another active class or save this game unlinked.');
        } else {
          updateLinkedClassNote('');
          setLaunchContextNote('');
        }
      } else if (targetClassId && !hasSelectedActiveClass && !state.activeClassesLoadFailed) {
        updateLinkedClassNote('The previously linked class is no longer active or accessible. Choose another class or leave this game unlinked.');
      } else {
        updateLinkedClassNote('');
      }
    } catch (_err) {
      state.activeClassesLoadFailed = true;
      state.availableClasses = [];
      populateLinkedClassSelect('');
      updateLinkedClassNote('Active classes could not be loaded right now. You can still save an unlinked ClassRush game.');
      if (state.mode === 'create' && state.launchContext.active) {
        setLaunchContextNote('Active classes could not be loaded right now, so this class launch could not be prefilled. You can still save an unlinked game or try again later.');
      }
    }

    renderLaunchContextStrip();
  }

  function createDefaultOptions(type) {
    if (type === 'true_false') {
      return [
        { id: uuid(), text: 'True', isCorrect: true },
        { id: uuid(), text: 'False', isCorrect: false }
      ];
    }

    const baseOptions = [
      { id: uuid(), text: '', isCorrect: false },
      { id: uuid(), text: '', isCorrect: false },
      { id: uuid(), text: '', isCorrect: false },
      { id: uuid(), text: '', isCorrect: false }
    ];

    if (type === 'multiple_choice') {
      baseOptions[0].isCorrect = true;
    }

    return baseOptions;
  }

  function createEmptyQuestion(type) {
    const questionType = type || 'multiple_choice';
    return {
      id: uuid(),
      type: questionType,
      title: '',
      imageUrl: '',
      timeLimitSeconds: 20,
      points: questionType === 'poll' ? 0 : 1000,
      options: questionType === 'type_answer' ? [] : createDefaultOptions(questionType),
      acceptedAnswers: questionType === 'type_answer' ? [''] : []
    };
  }

  function ensureOneCorrectOption(options) {
    if (!Array.isArray(options) || options.length === 0) return createDefaultOptions('multiple_choice');
    const nextOptions = options.map((option) => ({
      id: option.id || uuid(),
      text: option.text || '',
      isCorrect: option.isCorrect === true
    }));
    if (!nextOptions.some((option) => option.isCorrect)) {
      nextOptions[0].isCorrect = true;
    }
    return nextOptions;
  }

  function normalizeQuestionForType(question, nextType) {
    const q = question;
    q.type = nextType;

    if (nextType === 'type_answer') {
      q.options = [];
      q.acceptedAnswers = Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length ? q.acceptedAnswers : [''];
      q.points = 1000;
      return;
    }

    q.acceptedAnswers = [];

    if (nextType === 'true_false') {
      q.options = createDefaultOptions('true_false');
      q.points = 1000;
      return;
    }

    if (nextType === 'poll') {
      const existingOptions = Array.isArray(q.options) && q.options.length >= 2
        ? q.options.slice(0, 4).map((option) => ({
            id: option.id || uuid(),
            text: option.text || '',
            isCorrect: false
          }))
        : createDefaultOptions('poll');
      q.options = existingOptions;
      q.points = 0;
      return;
    }

    q.options = ensureOneCorrectOption(
      Array.isArray(q.options) && q.options.length >= 2 ? q.options.slice(0, 4) : createDefaultOptions('multiple_choice')
    );
    q.points = 1000;
  }

  function renderSidebar() {
    const list = byId('lgQuestionList');
    if (!list) return;
    list.innerHTML = state.questions.map((q, index) => `
      <li class="lg-q-item ${index === state.activeIndex ? 'active' : ''}" data-index="${index}" draggable="true">
        <span class="lg-q-num">${index + 1}</span>
        <span>${escapeHtml(q.title || 'Untitled')}</span>
        <span class="lg-q-type">${TYPE_LABELS[q.type] || 'Q'}</span>
      </li>
    `).join('');
  }

  function renderAcceptedAnswers(question) {
    const container = byId('lgAcceptedAnswersContainer');
    if (!container) return;

    const acceptedAnswers = Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length
      ? question.acceptedAnswers
      : [''];

    container.innerHTML = acceptedAnswers.map((answer, index) => `
      <div class="lg-answer-variant" data-answer-index="${index}">
        <span class="lg-answer-variant-kind">${index === 0 ? 'Primary' : 'Alias'}</span>
        <input
          type="text"
          value="${escapeHtml(answer)}"
          placeholder="${index === 0 ? 'Correct answer' : 'Accepted variant'}"
          data-field="acceptedAnswerText"
          data-answer-index="${index}"
          maxlength="200"
        >
        ${acceptedAnswers.length > 1 ? `<button class="lg-option-remove" data-action="removeAcceptedAnswer" data-answer-index="${index}" title="Remove">&times;</button>` : ''}
      </div>
    `).join('');
  }

  function renderOptions(question) {
    const container = byId('lgOptionsContainer');
    if (!container) return;

    const isTrueFalse = question.type === 'true_false';
    const isPoll = question.type === 'poll';

    container.innerHTML = question.options.map((option, index) => `
      <div class="lg-option" data-oi="${index}">
        <span class="lg-option-shapes">${SHAPES[index] || ''}</span>
        ${isPoll
          ? '<span class="lg-option-kind-chip">Poll</span>'
          : `<input type="radio" name="lgCorrectOpt" value="${index}" ${option.isCorrect ? 'checked' : ''} title="Mark as correct">`
        }
        <input
          type="text"
          value="${escapeHtml(option.text)}"
          placeholder="Option ${index + 1}"
          data-field="optionText"
          data-oi="${index}"
          maxlength="200"
          ${isTrueFalse ? 'readonly' : ''}
        >
        ${!isTrueFalse && question.options.length > 2 ? `<button class="lg-option-remove" data-action="removeOption" data-oi="${index}" title="Remove">&times;</button>` : ''}
      </div>
    `).join('');
  }

  function renderEditor() {
    const empty = byId('lgEditorEmpty');
    const form = byId('lgEditorForm');
    if (state.activeIndex < 0 || state.activeIndex >= state.questions.length) {
      if (empty) empty.style.display = '';
      if (form) form.style.display = 'none';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (form) form.style.display = '';

    const question = state.questions[state.activeIndex];
    const isTypeAnswer = question.type === 'type_answer';
    const isTrueFalse = question.type === 'true_false';
    const isPoll = question.type === 'poll';

    byId('lgQType').value = question.type;
    byId('lgQTitle').value = question.title;
    byId('lgQTime').value = question.timeLimitSeconds;

    const optionEditor = byId('lgOptionEditor');
    const acceptedAnswersEditor = byId('lgAcceptedAnswersEditor');
    const addOptionBtn = byId('lgAddOptionBtn');
    const optionsLabel = byId('lgOptionsLabel');

    if (optionEditor) optionEditor.style.display = isTypeAnswer ? 'none' : '';
    if (acceptedAnswersEditor) acceptedAnswersEditor.style.display = isTypeAnswer ? '' : 'none';
    if (addOptionBtn) addOptionBtn.style.display = isTypeAnswer || isTrueFalse ? 'none' : '';
    if (optionsLabel) {
      optionsLabel.innerHTML = isPoll
        ? 'Response Options <small>(students choose one option)</small>'
        : 'Answer Options <small>(select the correct one)</small>';
    }

    if (isTypeAnswer) {
      renderAcceptedAnswers(question);
      return;
    }

    renderOptions(question);
  }

  function syncAcceptedAnswers(question) {
    const answerInputs = byId('lgAcceptedAnswersContainer')?.querySelectorAll('[data-field="acceptedAnswerText"]') || [];
    const answers = [];
    answerInputs.forEach((input) => {
      answers.push((input.value || '').trim());
    });
    question.acceptedAnswers = answers.length ? answers : [''];
    question.options = [];
    question.points = 1000;
  }

  function syncOptions(question) {
    const optionInputs = byId('lgOptionsContainer')?.querySelectorAll('[data-field="optionText"]') || [];
    optionInputs.forEach((input) => {
      const optionIndex = parseInt(input.dataset.oi, 10);
      if (question.options[optionIndex]) {
        question.options[optionIndex].text = input.value || '';
      }
    });

    if (question.type === 'poll') {
      question.options = question.options.map((option) => ({ ...option, isCorrect: false }));
      question.points = 0;
      return;
    }

    const radios = byId('lgOptionsContainer')?.querySelectorAll('input[name="lgCorrectOpt"]') || [];
    radios.forEach((radio) => {
      const optionIndex = parseInt(radio.value, 10);
      if (question.options[optionIndex]) {
        question.options[optionIndex].isCorrect = radio.checked;
      }
    });
    question.points = 1000;
  }

  function syncFromEditor() {
    if (state.activeIndex < 0) return;
    const question = state.questions[state.activeIndex];
    question.title = (byId('lgQTitle')?.value || '').trim();
    question.timeLimitSeconds = parseInt(byId('lgQTime')?.value, 10) || 20;

    if (question.type === 'type_answer') {
      syncAcceptedAnswers(question);
    } else {
      syncOptions(question);
      question.acceptedAnswers = [];
    }

    renderSidebar();
  }

  function onTypeChange() {
    if (state.activeIndex < 0) return;
    syncFromEditor();
    const question = state.questions[state.activeIndex];
    const nextType = byId('lgQType').value;
    if (nextType === question.type) return;
    normalizeQuestionForType(question, nextType);
    renderSidebar();
    renderEditor();
  }

  function onAddOption() {
    if (state.activeIndex < 0) return;
    const question = state.questions[state.activeIndex];
    if (question.type === 'type_answer' || question.type === 'true_false' || question.options.length >= 4) return;
    question.options.push({ id: uuid(), text: '', isCorrect: false });
    renderOptions(question);
  }

  function onRemoveOption(optionIndex) {
    if (state.activeIndex < 0) return;
    const question = state.questions[state.activeIndex];
    if (!Array.isArray(question.options) || question.options.length <= 2) return;
    const removedOption = question.options[optionIndex];
    question.options.splice(optionIndex, 1);
    if (question.type === 'multiple_choice' && removedOption?.isCorrect && question.options.length > 0) {
      question.options[0].isCorrect = true;
    }
    renderOptions(question);
  }

  function onAddAcceptedAnswer() {
    if (state.activeIndex < 0) return;
    const question = state.questions[state.activeIndex];
    if (question.type !== 'type_answer') return;
    const acceptedAnswers = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
    if (acceptedAnswers.length >= 10) {
      showToast('You can add up to 10 accepted answers.', true);
      return;
    }
    acceptedAnswers.push('');
    question.acceptedAnswers = acceptedAnswers;
    renderAcceptedAnswers(question);
  }

  function onRemoveAcceptedAnswer(answerIndex) {
    if (state.activeIndex < 0) return;
    const question = state.questions[state.activeIndex];
    if (question.type !== 'type_answer') return;
    if (!Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.length <= 1) return;
    question.acceptedAnswers.splice(answerIndex, 1);
    renderAcceptedAnswers(question);
  }

  function onAddQuestion() {
    syncFromEditor();
    state.questions.push(createEmptyQuestion('multiple_choice'));
    state.activeIndex = state.questions.length - 1;
    renderSidebar();
    renderEditor();
  }

  function onDeleteQuestion() {
    if (state.activeIndex < 0) return;
    state.questions.splice(state.activeIndex, 1);
    if (state.activeIndex >= state.questions.length) {
      state.activeIndex = state.questions.length - 1;
    }
    renderSidebar();
    renderEditor();
  }

  function onSelectQuestion(index) {
    syncFromEditor();
    state.activeIndex = index;
    renderSidebar();
    renderEditor();
  }

  async function onSave() {
    if (state.saving) return;
    syncFromEditor();

    const payload = {
      title: byId('lgGameTitle')?.value || '',
      description: byId('lgGameDesc')?.value || '',
      linkedClassId: byId('lgLinkedClass')?.value || '',
      questions: state.questions,
      settings: {
        requireLogin: byId('lgRequireLogin')?.checked || false,
        showLeaderboardAfterEach: byId('lgShowLeaderboard')?.checked !== false,
        maxPlayers: parseInt(byId('lgMaxPlayers')?.value, 10) || 50,
        randomizeQuestionOrder: byId('lgRandomizeQuestionOrder')?.checked || false,
        randomizeAnswerOrder: byId('lgRandomizeAnswerOrder')?.checked || false
      }
    };

    state.saving = true;
    byId('lgSaveBtn').disabled = true;

    try {
      const isEdit = state.mode === 'edit' && state.gameId;
      const url = isEdit ? `/api/live-games/${state.gameId}` : '/api/live-games';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Save failed.');

      showToast(isEdit ? 'Game saved!' : 'Game created!');

      if (!isEdit && data.game?._id) {
        state.gameId = data.game._id;
        state.mode = 'edit';
        history.replaceState(null, '', `/teacher/live-games/${state.gameId}/edit`);
        byId('lgBuilderTitle').textContent = 'Edit ClassRush Game';
      }

      const savedId = state.gameId || data.game?._id;
      if (savedId) {
        const pin = data.game?.gamePin || data.gamePin;
        const qrPanel = byId('lgQrPanel');
        const qrPin = byId('lgQrPin');
        const qrImg = byId('lgQrImg');
        const qrDownload = byId('lgQrDownload');
        if (qrPanel) {
          if (pin && qrPin) qrPin.textContent = pin;
          if (qrImg) qrImg.src = `/api/live-games/${savedId}/qr?t=${Date.now()}`;
          if (qrDownload && qrImg) qrImg.onload = () => { qrDownload.href = qrImg.src; };
          qrPanel.style.display = '';
        }
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      state.saving = false;
      byId('lgSaveBtn').disabled = false;
    }
  }

  async function loadGame(gameId) {
    try {
      const res = await fetch(`/api/live-games/${gameId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load game.');

      const game = data.game;
      byId('lgGameTitle').value = game.title || '';
      byId('lgGameDesc').value = game.description || '';
      byId('lgRequireLogin').checked = game.settings?.requireLogin || false;
      byId('lgShowLeaderboard').checked = game.settings?.showLeaderboardAfterEach !== false;
      byId('lgMaxPlayers').value = game.settings?.maxPlayers || 50;
      byId('lgRandomizeQuestionOrder').checked = game.settings?.randomizeQuestionOrder === true;
      byId('lgRandomizeAnswerOrder').checked = game.settings?.randomizeAnswerOrder === true;
      state.linkedClassId = game.linkedClass?.classId || '';
      const hasSelectedActiveClass = populateLinkedClassSelect(state.linkedClassId);
      if (!hasSelectedActiveClass && state.linkedClassId && !state.activeClassesLoadFailed) {
        updateLinkedClassNote('The previously linked class is no longer active or accessible. Choose another class or leave this game unlinked.');
      }

      state.questions = (game.questions || []).map((question) => ({
        id: question.id || uuid(),
        type: question.type || 'multiple_choice',
        title: question.title || '',
        imageUrl: question.imageUrl || '',
        timeLimitSeconds: question.timeLimitSeconds || 20,
        points: question.type === 'poll' ? 0 : (question.points || 1000),
        options: (question.options || []).map((option) => ({
          id: option.id || uuid(),
          text: option.text || '',
          isCorrect: option.isCorrect === true
        })),
        acceptedAnswers: Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.slice() : []
      }));

      if (state.questions.length > 0) state.activeIndex = 0;
      renderSidebar();
      renderEditor();
      renderLaunchContextStrip();

      if (game.gamePin) {
        const qrPanel = byId('lgQrPanel');
        const qrPin = byId('lgQrPin');
        const qrImg = byId('lgQrImg');
        const qrDownload = byId('lgQrDownload');
        if (qrPanel) {
          if (qrPin) qrPin.textContent = game.gamePin;
          if (qrImg) qrImg.src = `/api/live-games/${gameId}/qr`;
          if (qrDownload && qrImg) qrImg.onload = () => { qrDownload.href = qrImg.src; };
          qrPanel.style.display = '';
        }
      }
    } catch (err) {
      showToast(`Failed to load game: ${err.message}`, true);
    }
  }

  let dragFrom = -1;

  function onDragStart(event) {
    const item = event.target.closest('.lg-q-item');
    if (!item) return;
    dragFrom = parseInt(item.dataset.index, 10);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function onDrop(event) {
    event.preventDefault();
    const item = event.target.closest('.lg-q-item');
    if (!item || dragFrom < 0) return;
    const dragTo = parseInt(item.dataset.index, 10);
    if (dragFrom === dragTo) return;

    syncFromEditor();
    const moved = state.questions.splice(dragFrom, 1)[0];
    state.questions.splice(dragTo, 0, moved);

    if (state.activeIndex === dragFrom) {
      state.activeIndex = dragTo;
    } else if (dragFrom < state.activeIndex && dragTo >= state.activeIndex) {
      state.activeIndex -= 1;
    } else if (dragFrom > state.activeIndex && dragTo <= state.activeIndex) {
      state.activeIndex += 1;
    }

    dragFrom = -1;
    renderSidebar();
    renderEditor();
  }

  function init() {
    state.gameId = document.body.dataset.gameId || '';
    state.mode = document.body.dataset.gameMode || 'create';
    state.launchContext = getLaunchContextParams();

    if (state.mode === 'edit') {
      byId('lgBuilderTitle').textContent = 'Edit ClassRush Game';
    }

    renderLaunchContextStrip();

    byId('lgSaveBtn')?.addEventListener('click', onSave);
    byId('lgAddQuestionBtn')?.addEventListener('click', onAddQuestion);
    byId('lgDeleteQuestionBtn')?.addEventListener('click', onDeleteQuestion);
    byId('lgAddOptionBtn')?.addEventListener('click', onAddOption);
    byId('lgAddAcceptedAnswerBtn')?.addEventListener('click', onAddAcceptedAnswer);
    byId('lgQType')?.addEventListener('change', onTypeChange);
    byId('lgLinkedClass')?.addEventListener('change', (event) => {
      state.linkedClassId = event.target.value || '';
      updateLinkedClassNote('');
      if (state.launchContext.active) {
        if (state.linkedClassId) {
          setLaunchContextNote('');
        } else {
          setLaunchContextNote('The class prefill was cleared. You can keep this game unlinked or choose another active class before saving.');
        }
      } else {
        renderLaunchContextStrip();
      }
    });

    byId('lgQuestionList')?.addEventListener('click', (event) => {
      const item = event.target.closest('.lg-q-item');
      if (item) onSelectQuestion(parseInt(item.dataset.index, 10));
    });

    byId('lgOptionsContainer')?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="removeOption"]');
      if (btn) onRemoveOption(parseInt(btn.dataset.oi, 10));
    });

    byId('lgAcceptedAnswersContainer')?.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-action="removeAcceptedAnswer"]');
      if (btn) onRemoveAcceptedAnswer(parseInt(btn.dataset.answerIndex, 10));
    });

    ['lgQTitle', 'lgQTime'].forEach((id) => {
      byId(id)?.addEventListener('blur', syncFromEditor);
    });

    const list = byId('lgQuestionList');
    if (list) {
      list.addEventListener('dragstart', onDragStart);
      list.addEventListener('dragover', onDragOver);
      list.addEventListener('drop', onDrop);
    }

    loadActiveClasses().finally(() => {
      if (state.mode === 'edit' && state.gameId) {
        loadGame(state.gameId);
        return;
      }
      renderSidebar();
      renderEditor();
      renderLaunchContextStrip();
    });
  }

  global.teacherGameBuilder = { init };
})(window);
