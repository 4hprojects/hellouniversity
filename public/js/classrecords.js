/*******************************************************
 * classrecords.js
 *******************************************************/

// Utility function to show notification
function showNotification(message, type = 'error') {
  const notification = document.getElementById('notification');

  notification.textContent = message;
  notification.className = `p-4 mb-4 rounded ${
    type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
  }`;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Fetch user details
async function fetchStudentDetails() {
  try {
    const response = await fetch("/user-details", { method: "GET", credentials: "include" });
    if (!response.ok) throw new Error(`Failed to fetch user details. Status: ${response.status}`);

    const data = await response.json();
    if (data.success) {
      const studentName = `${data.user.firstName} ${data.user.lastName}`;
      const studentID = data.user.studentIDNumber;

      // Populate Student Info
      document.getElementById("studentFullName").textContent = studentName || '--';
      document.getElementById("studentIDNumber").textContent = studentID || '--';

      return { studentID, studentName };
    } else {
      throw new Error(data.message || 'Failed to fetch user details.');
    }
  } catch (error) {
    console.error("Error fetching user details:", error);
    showNotification(error.message || 'Failed to load user details. Please try again later.', 'error');
    return null;
  }
}

/**
 * Fetch Midterm data from "MST24-MidCS"
 */
async function fetchMidtermRecords(studentID) {
  try {
    // Endpoint that fetches from sheetName = "MST24-MidCS"
    const response = await fetch(`/api/getClassRecordFromSheet?studentID=${studentID}&sheetName=MST24-MidCS`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch midterm record.');
    }

    // The server response should look like:
    // {
    //   success: true,
    //   data: {
    //     totalScore: "...",
    //     totalScoreWithBonus: "...",
    //     percentage: "...",
    //     lessonScores: { lesson1: 10, lesson2: 9, ... },
    //     bonusScores: { preclassSurvey: 2, activity1: 3, activity2: 1 },
    //     midtermScores: { exam: 45, examWithBonus: 48, total: 100 }
    //   }
    // }

    const {
      totalScore,
      totalScoreWithBonus,
      percentage,
      lessonScores,
      bonusScores,
      midtermScores
    } = data.data;

    // Populate Overall Scores (from midterm)
    document.getElementById('totalScore').textContent          = totalScore            || '--';
    document.getElementById('totalScoreWithBonus').textContent = totalScoreWithBonus   || '--';
    document.getElementById('percentage').textContent          = percentage            || '--';

    // Populate Lessons 1-12
    for (let i = 1; i <= 12; i++) {
      const score = lessonScores[`lesson${i}`] || '--';
      document.getElementById(`lesson${i}Score`).textContent = score;
    }

    // Populate Midterm Bonus Points
    document.getElementById('preclassSurvey').textContent = bonusScores.preclassSurvey || '--';
    document.getElementById('activity1Bonus').textContent = bonusScores.activity1      || '--';
    document.getElementById('activity2Bonus').textContent = bonusScores.activity2      || '--';

    // Populate Midterm Exam
    document.getElementById('midtermExam').textContent      = midtermScores.exam          || '--';
    document.getElementById('midtermWithBonus').textContent = midtermScores.examWithBonus || '--';
    document.getElementById('midtermTotal').textContent     = midtermScores.total         || '--';

  } catch (error) {
    console.error('Error fetching midterm records:', error);
    showNotification(error.message || 'Failed to load midterm records.', 'error');
  }
}

/**
 * Fetch Final data from "MST24-FinCS"
 */
async function fetchFinalRecords(studentID) {
  try {
    // Endpoint that fetches from sheetName = "MST24-FinCS"
    const response = await fetch(`/api/getClassRecordFromSheet?studentID=${studentID}&sheetName=MST24-FinCS`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch final record.');
    }

    // The server response for MST24-FinCS should look like:
    // {
    //   success: true,
    //   data: {
    //     lesson13Scores: {
    //       '13.1': 10, '13.2': 12, ..., '13.9': 8
    //     },
    //     kt1: "someValue",
    //     bonus: "someValue",
    //     finalExam: { raw: 50, withBonus: 55, total: 100 }
    //   }
    // }

    const {
      lesson13Scores,
      kt1,
      bonus,
      finalExam
    } = data.data;

    // Populate Lesson 13 sub-scores
    for (let i = 1; i <= 9; i++) {
      const cellKey = `13.${i}`;
      const cellValue = (lesson13Scores && lesson13Scores[cellKey]) ? lesson13Scores[cellKey] : '--';
      document.getElementById(`lesson13_${i}Score`).textContent = cellValue;
    }

    // Populate Kt1 & Final Bonus
    document.getElementById('finalKt1').textContent   = kt1   || '--';
    document.getElementById('finalBonus').textContent = bonus || '--';

    // Populate Final Exam
    if (finalExam) {
      document.getElementById('finalExamRaw').textContent       = finalExam.raw        || '--';
      document.getElementById('finalExamWithBonus').textContent = finalExam.withBonus  || '--';
      document.getElementById('finalTotal').textContent         = finalExam.total      || '--';
    }

  } catch (error) {
    console.error('Error fetching final records:', error);
    showNotification(error.message || 'Failed to load final records.', 'error');
  }
}

// Main DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  const userDetails = await fetchStudentDetails();
  if (!userDetails) return;

  // 1) Fetch midterm data from MST24-MidCS
  await fetchMidtermRecords(userDetails.studentID);

  // 2) Fetch final data from MST24-FinCS
  await fetchFinalRecords(userDetails.studentID);

  // Show a success notification (optional)
  showNotification('Class records loaded successfully!', 'success');
});
