// quiz.js
// Complete code for fetching quizzes, filtering, and rendering the quiz table in quiz.html

let userRole = '';
let allQuizzes = [];       // Will hold all quizzes fetched from /api/quizzes
let assignedQuizzes = [];  // Will hold only the quizzes specifically assigned to the student

/**
 * On DOMContentLoaded:
 * 1) Check user session/role
 * 2) Load all quizzes
 * 3) If user is a student, load assigned quizzes
 * 4) Render the table (default filter: "all")
 * 5) Attach filter dropdown event
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // (1) Check session
    const sessionRes = await fetch('/session-check', { credentials: 'include' });
    const sessionData = await sessionRes.json();

    if (!sessionData.authenticated) {
      // If not logged in, redirect or show a message
      console.warn('User not authenticated. Redirecting to login...');
      window.location.href = '/login';
      return;
    }
    userRole = sessionData.role; // e.g., 'student', 'teacher', 'admin'

    // (2) Load all quizzes
    await loadAllQuizzes();

    // (3) If user is a student, fetch assigned quizzes
    if (userRole === 'student') {
      await loadAssignedQuizzes();
    }

    // (4) Render the table with the default filter = 'all'
    const filterSelect = document.getElementById('quizFilter');
    filterSelect.value = 'all';
    renderQuizTable('all');

    // (5) Add event listener for the filter dropdown
    filterSelect.addEventListener('change', (e) => {
      renderQuizTable(e.target.value);
    });

  } catch (error) {
    console.error('Error initializing quiz page:', error);
  }
});

/**
 * loadAllQuizzes()
 * Fetches "all quizzes" from /api/quizzes and populates allQuizzes.
 */
async function loadAllQuizzes() {
  try {
    const resp = await fetch('/api/quizzes', { credentials: 'include' });
    const data = await resp.json();
    console.log("loadAllQuizzes() response:", data); // <--- Debug
    if (data.success) {
      allQuizzes = data.quizzes;
    } else {
      console.error('Failed to load all quizzes:', data.message);
    }
  } catch (error) {
    console.error('Error loading all quizzes:', error);
  }
}

/**
 * loadAssignedQuizzes()
 * If the user is a student, fetches quizzes assigned specifically to them.
 * The response is stored in assignedQuizzes.
 */
async function loadAssignedQuizzes() {
  try {
    const resp = await fetch('/api/assignments/student', { credentials: 'include' });
    const data = await resp.json();
    if (data.success) {
      assignedQuizzes = data.assignments;
    } else {
      console.error('Failed to load assigned quizzes:', data.message);
    }
  } catch (error) {
    console.error('Error loading assigned quizzes:', error);
  }
}

/**
 * renderQuizTable(filterType)
 * @param {string} filterType - "all" or "assigned"
 * 
 * Populates the table (#quizTableBody) with either all quizzes or only assigned ones,
 * depending on the selected filter.
 */
function renderQuizTable(filterType) {
  const quizTableBody = document.getElementById('quizTableBody');
  quizTableBody.innerHTML = ''; // Clear existing rows

  // Build a map of quizId -> assignment info (from assignedQuizzes)
  // e.g.: assignedMap.set(quizId, { assignmentId, startDate, dueDate, etc. });
  const assignedMap = new Map();
  assignedQuizzes.forEach(asn => {
    assignedMap.set(asn.quizId.toString(), asn);
  });

  // Decide which quizzes to display
  let displayQuizzes = [];
  if (filterType === 'all') {
    displayQuizzes = allQuizzes;
  } else {
    // Show only those quizzes that are in assignedMap
    displayQuizzes = allQuizzes.filter(q => assignedMap.has(q._id.toString()));
  }

  // Build the table rows
  displayQuizzes.forEach(q => {
    const quizIdStr = q._id.toString();
    const asnInfo   = assignedMap.get(quizIdStr) || null;

    // Assigned Date & Due Date
    let assignedDateStr = 'N/A';
    let dueDateStr      = 'N/A';
    if (asnInfo && asnInfo.startDate) {
      assignedDateStr = new Date(asnInfo.startDate).toLocaleString();
    }
    if (asnInfo && asnInfo.dueDate) {
      dueDateStr = new Date(asnInfo.dueDate).toLocaleString();
    }

    // Determine quiz status (very simplified logic—customize as needed)
    let statusLabel = 'Not Started';
    let statusClass = 'status-not-started';
    let scoreLabel  = '--';

    // If the user’s data or assignment info includes progress or completion:
    //  e.g., asnInfo.isCompleted, asnInfo.finalScore, etc.
    if (asnInfo && asnInfo.isCompleted) {
      statusLabel = 'Completed';
      statusClass = 'status-completed';
      scoreLabel  = asnInfo.finalScore != null ? asnInfo.finalScore : '--';
    } else if (asnInfo && asnInfo.dueDate && new Date(asnInfo.dueDate) < new Date()) {
      statusLabel = 'Past Due';
      statusClass = 'status-past-due';
    }

    // Create the row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-2">${q.quizTitle || '(No Title)'}</td>
      <td class="px-4 py-2">${assignedDateStr}</td>
      <td class="px-4 py-2">${dueDateStr}</td>
      <td class="px-4 py-2">
        <span class="status-badge ${statusClass}">${statusLabel}</span>
      </td>
      <td class="px-4 py-2">${scoreLabel}</td>
      <td class="px-4 py-2">
        ${renderActionButton(q._id.toString(), asnInfo)}
      </td>
    `;
    quizTableBody.appendChild(tr);
  });
}

/**
 * renderActionButton(quizId, assignmentInfo)
 * Returns HTML for the Action column (e.g. "Start" button).
 */
function renderActionButton(quizId, assignmentInfo) {
  // If user is student and the quiz is assigned
  if (userRole === 'student') {
    if (!assignmentInfo) {
      return `<span class="text-gray-400 italic">Not Assigned</span>`;
    } else {
      return `
        <button
          class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          onclick="openQuizInNewTab('${quizId}')"
        >
          Start
        </button>
      `;
    }
  }

  // If user is teacher/admin, we can adapt in the future
  return `<span class="text-gray-400 italic">N/A</span>`;
}

/**
 * openQuizInNewTab(quizId)
 * Opens the separate quiz-taking interface in a new tab.
 */
function openQuizInNewTab(quizId) {
  // e.g. /take_quiz.html?quizId=XXXX
  window.open(`/take_quiz.html?quizId=${quizId}`, '_blank');
}
