//create_activity.js
document.addEventListener('DOMContentLoaded', async () => {
    // Verify admin session
    try {
      const sessionRes = await fetch('/session-check', { credentials: 'include' });
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated || sessionData.role !== 'admin') {
        alert('You are not authorized to view this page.');
        window.location.href = '/login'; 
        return;
      }

      await loadClassesForQuiz();

    } catch (err) {
      console.error('Session check error:', err);
      window.location.href = '/login';
      return;
    }

    // If admin, load existing quizzes
    loadAllQuizzes();

    // Listen for "Add Question" button
    document.getElementById('addQuestionBtn').addEventListener('click', addQuestionBlock);
  });

  /* 1. Add More Questions */
  function addQuestionBlock() {
    const container = document.getElementById('questionsContainer');
    const div = document.createElement('div');
    div.classList.add('question-item');
    div.innerHTML = `
      <label class="block mb-1">
        <span class="font-semibold">Question Text:</span>
        <input
          type="text"
          data-q="questionText"
          class="border border-gray-300 p-2 w-full"
          placeholder="e.g. What is 2+2?"
        />
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label class="block">
          <span class="font-semibold">Option A:</span>
          <input type="text" data-q="opt0" class="border border-gray-300 p-2 w-full" />
        </label>
        <label class="block">
          <span class="font-semibold">Option B:</span>
          <input type="text" data-q="opt1" class="border border-gray-300 p-2 w-full" />
        </label>
        <label class="block">
          <span class="font-semibold">Option C:</span>
          <input type="text" data-q="opt2" class="border border-gray-300 p-2 w-full" />
        </label>
        <label class="block">
          <span class="font-semibold">Option D:</span>
          <input type="text" data-q="opt3" class="border border-gray-300 p-2 w-full" />
        </label>
      </div>

      <label class="block mt-2">
        <span class="font-semibold">Correct Answer:</span>
        <select data-q="correctAnswer" class="border border-gray-300 p-2 w-full sm:w-40">
          <option value="0">Option A</option>
          <option value="1">Option B</option>
          <option value="2">Option C</option>
          <option value="3">Option D</option>
        </select>
      </label>
    `;
    container.appendChild(div);
  }

  /* 2. Create a New Quiz (POST /api/quizzes) */
  async function createQuiz() {
    const quizTitle = document.getElementById('quizTitle').value.trim();
    const quizDesc = document.getElementById('quizDesc').value.trim();
    const dueDateVal = document.getElementById('dueDate').value;
    const latePenalty = document.getElementById('latePenalty').value;
    const maxAttempts = document.getElementById('maxAttempts').value;
    const duration = document.getElementById('duration').value;
  
    let dueDate = null;
    if (dueDateVal) {
      dueDate = new Date(dueDateVal).toISOString();
    }
  
    // ----------- NEW: gather classIds from checkboxes -----------
    const classCheckboxes = document.querySelectorAll('#classesContainer input[type="checkbox"]');
    const classIds = [];
    classCheckboxes.forEach(cb => {
      if (cb.checked) {
        classIds.push(cb.value);
      }
    });
  
    // Gather questions
    const questionEls = document.querySelectorAll('.question-item');
    const questions = [];
    questionEls.forEach(qEl => {
      const questionText = qEl.querySelector('[data-q="questionText"]').value.trim();
      if (!questionText) return;
  
      const opt0 = qEl.querySelector('[data-q="opt0"]').value.trim();
      const opt1 = qEl.querySelector('[data-q="opt1"]').value.trim();
      const opt2 = qEl.querySelector('[data-q="opt2"]').value.trim();
      const opt3 = qEl.querySelector('[data-q="opt3"]').value.trim();
      const correctAnswerStr = qEl.querySelector('[data-q="correctAnswer"]').value;
      const correctAnswer = parseInt(correctAnswerStr, 10);
  
      questions.push({
        questionText,
        options: [opt0, opt1, opt2, opt3],
        correctAnswer
      });
    });
  
    // Final payload with classIds
    const payload = {
      quizTitle,
      description: quizDesc,
      questions,
      dueDate,
      latePenaltyPercent: parseInt(latePenalty, 10),
      maxAttempts: parseInt(maxAttempts, 10),
      duration: parseInt(duration, 10),
      classIds // <---- Include this array
    };
  
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
  
      if (data.success) {
        alert('Quiz created successfully! ID: ' + data.quizId);
        loadAllQuizzes(); // refresh the quiz list
        // Optionally clear form fields here...
      } else {
        alert('Error creating quiz: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Create quiz error:', err);
      alert('An error occurred while creating the quiz.');
    }
  }

  /* 3. Load All Quizzes (GET /api/quizzes) */
  async function loadAllQuizzes() {
    try {
      const res = await fetch('/api/quizzes', { credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        console.error('Error fetching quizzes:', data.message);
        return;
      }

      const container = document.getElementById('allQuizzes');
      container.innerHTML = '';

      if (!data.quizzes.length) {
        container.innerHTML = '<p>No quizzes found.</p>';
        return;
      }

      data.quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.classList.add('border', 'p-4', 'mb-4', 'bg-white');

        const dueDateDisplay = quiz.dueDate
          ? new Date(quiz.dueDate).toLocaleString()
          : 'None';

        card.innerHTML = `
          <h3 class="text-lg font-bold">${quiz.quizTitle} <span class="text-sm text-gray-500">(${quiz._id})</span></h3>
          <p class="text-gray-700">${quiz.description || ''}</p>
          <p><strong>Questions:</strong> ${quiz.questions?.length || 0}</p>
          <p><strong>Due Date:</strong> ${dueDateDisplay}</p>
          <p><strong>Active:</strong> ${quiz.isActive ? 'Yes' : 'No'}</p>
          <p><strong>Late Penalty:</strong> ${quiz.latePenaltyPercent || 40}%</p>
          <p><strong>Max Attempts:</strong> ${quiz.maxAttempts || 1}</p>
          <p><strong>Duration:</strong> ${quiz.duration || 0} min</p>
        `;
      // Button
      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = quiz.isActive ? 'Close Quiz' : 'Open Quiz';
      toggleBtn.className = 'mt-3 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition';
      toggleBtn.onclick = () => toggleQuizActive(quiz._id, !quiz.isActive);
      card.appendChild(toggleBtn);


        container.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading quizzes:', err);
    }
  }

  /* 4. Toggle Quiz isActive (PUT /api/quizzes/:quizId/active) */
  async function toggleQuizActive(quizId, shouldBeActive) {
    try {
      const res = await fetch(`/api/quizzes/${quizId}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: shouldBeActive })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Failed to toggle quiz: ' + data.message);
        return;
      }
      loadAllQuizzes(); // refresh
    } catch (err) {
      console.error('Error toggling quiz active:', err);
    }
  }

  async function loadClassesForQuiz() {
    try {
      const res = await fetch('/api/classes', { credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to load classes:', data.message);
        return;
      }
  
      const container = document.getElementById('classesContainer');
      container.innerHTML = '';
  
      if (!data.classes || data.classes.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No classes found. Create one first.</p>';
        return;
      }
  
      // For each class returned, build a checkbox
      data.classes.forEach(cls => {
        const label = document.createElement('label');
        label.classList.add('block', 'cursor-pointer', 'mb-2');
        label.innerHTML = `
          <input
            type="checkbox"
            value="${cls._id}"
            class="mr-2"
          />
          <span class="font-semibold">${cls.className} (${cls.classCode})</span>
        `;
        container.appendChild(label);
      });
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }