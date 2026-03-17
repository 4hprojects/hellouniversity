//view_quizzes.js
let currentQuizId; // Store the current quiz ID globally
let currentAttemptId; // Store the attempt ID globally 
let currentQuizData;     // stores the full quiz object received from the server


document.addEventListener('DOMContentLoaded', () => {
    const quizzesTableBody = document.querySelector('#quizzesTable tbody');
    const quizModal = document.getElementById('quizModal');
    const quizTitle = document.getElementById('quizTitle');
    const quizDescription = document.getElementById('quizDescription');
    const quizQuestions = document.getElementById('quizQuestions');
    const closeQuizModal = document.getElementById('closeQuizModal');
    const quizForm = document.getElementById('quizForm');
    const userGreeting = document.getElementById('userGreeting'); // Add this to display the user greeting
    const quizSummary = document.getElementById('quizSummary');     // for displaying submission summary

    // Fetch quizzes from the API
    async function loadQuizzes() {
        try {
            const response = await fetch('/api/quizzes');
            const data = await response.json();
            if (data.success) {
                populateQuizzes(data.quizzes);
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
        }
    }

      /**
   * Populate the quizzes table with received quiz data.
   * @param {Array} quizzes - Array of quiz objects.
   */

    // Populate quizzes into the table
    function populateQuizzes(quizzes) {
        quizzesTableBody.innerHTML = '';
        quizzes.forEach((quiz) => {
            const row = document.createElement('tr');
            row.className = 'border-t';
            row.innerHTML = `
                <td class="py-2 px-4">${quiz.quizTitle}</td>
                <td class="py-2 px-4">${quiz.description || 'No description'}</td>
                <td class="py-2 px-4">${quiz.questions.length}</td>
                <td class="py-2 px-4">
                    <button class="bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700" data-id="${quiz._id}">
                        View
                    </button>
                </td>
            `;
            quizzesTableBody.appendChild(row);
        });

        // Add event listeners to "View" buttons
        document.querySelectorAll('button[data-id]').forEach((button) =>
            button.addEventListener('click', () => openQuizModal(button.dataset.id))
        );
    }

        // Fetch user details and display the name
        async function fetchUserDetails() {
            try {
                const response = await fetch('/user-details');
                const data = await response.json();
    
                if (data.success) {
                    const { firstName, lastName } = data.user;
                    userGreeting.textContent = `Welcome, ${firstName} ${lastName}!`;
                } else {
                    userGreeting.textContent = 'Welcome, Guest!';
                    console.error('Failed to fetch user details:', data.message);
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
                userGreeting.textContent = 'Welcome, Guest!';
            }
        }
/**
        * Opens the quiz modal, displays the quiz details and starts a new attempt.
        * @param {string} quizId - The ID of the quiz.
        */

    // Open modal with quiz details
    async function openQuizModal(quizId) {
        try {
          const response = await fetch(`/api/quizzes/${quizId}`);
          const data = await response.json();
          if (!data.success) {
            console.error(data.message);
            return;
          }
          const quiz = data.quiz;
          currentQuizId = quizId;
          currentQuizData = quiz;
          quizTitle.textContent = quiz.quizTitle;
          quizDescription.textContent = quiz.description || 'No description';
    
          // Render quiz questions
          quizQuestions.innerHTML = quiz.questions
            .map((q, index) => {
              return `
                <li>
                  <p>${index + 1}. ${q.questionText}</p>
                  <ul>
                    ${q.options
                      .map(
                        (opt, i) => `
                        <li>
                          <label>
                            <input type="radio" name="q${index}" value="${i}" />
                            ${opt}
                          </label>
                        </li>
                      `
                      )
                      .join('')}
                  </ul>
                </li>
              `;
            })
            .join('');
    
          quizModal.classList.remove('hidden');
                console.log('Quiz ID:', currentQuizId);
                
            // Start a new attempt and get the attempt ID
            const attemptResponse = await fetch(`/api/quizzes/${quizId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const attemptData = await attemptResponse.json();
            console.log('Attempt Response:', attemptData);
            if (attemptData.success && attemptData.attemptId) {
                currentAttemptId = attemptData.attemptId; // Store attempt ID globally
            } else {
                console.error('Failed to start attempt:', attemptData.message);
                alert('Failed to start the quiz attempt.');
            }
    } catch (error) {
        console.error('Error fetching quiz details:', error);
    }
}

    // Close modal
    closeQuizModal.addEventListener('click', () => {
        quizModal.classList.add('hidden');
            // Reset the summary and form visibility.
    quizForm.classList.remove('hidden');
    if (quizSummary) quizSummary.classList.add('hidden');
    });

      /**
   * Single unified submit handler
   */
  // Consolidated submission handler with client-side score calculation
quizForm.addEventListener('submit', async (event) => {
    event.preventDefault();
  
    // 1. Collect the selected answers from the form.
    // (Assumes one radio per question)
    const selectedAnswers = Array.from(
      quizQuestions.querySelectorAll('input[type="radio"]:checked')
    ).map(input => parseInt(input.value));
  
    // Check if at least one answer is selected.
    if (!selectedAnswers.length) {
      alert('Please answer at least one question before submitting.');
      return;
    }
  
    // 2. Compute the score on the client side
    // (This is for preview/feedback only; the server’s own computation remains authoritative.)
    let computedRawScore = 0;
    // We assume quizData (obtained when opening the modal) is stored in a global variable.
    // For this example, we assume quizData is assigned in openQuizModal().
    if (window.quizData && window.quizData.questions) {
      window.quizData.questions.forEach((question, index) => {
        // Compare the selected answer with the correct answer.
        if (selectedAnswers[index] === question.correctAnswer) {
          computedRawScore++;
        }
      });
    } 
    
        const totalQuestions = currentQuizData && currentQuizData.questions ? currentQuizData.questions.length : selectedAnswers.length;
    
    // Compute total points. In this example, each question is 1 point.
    const totalPoints = window.quizData && window.quizData.questions ? window.quizData.questions.length : selectedAnswers.length;
    
    // 3. Compute late penalty (if any) based on dueDate
    // Note: We assume quizData.dueDate is available as an ISO date string.
    let computedFinalScore = computedRawScore;
    if (window.quizData && window.quizData.dueDate) {
      const dueDate = new Date(window.quizData.dueDate);
      const submittedAt = new Date(); // current server time approximation on client
      if (submittedAt > dueDate) {
        // Apply penalty percentage; default is 40% of total points, if not specified.
        const penaltyPercent = window.quizData.latePenaltyPercent || 40;
        const penalty = (penaltyPercent / 100) * totalPoints;
        computedFinalScore = computedRawScore - penalty;
      }
    }
    // Clamp the final score to a minimum of 0.
    computedFinalScore = Math.max(0, computedFinalScore);
  
    // 4. Display the computed scores to the student (this is immediate feedback).
    console.log(`Client-side computed raw score: ${computedRawScore} / ${totalPoints}`);
    console.log(`Client-side computed final score (after penalties): ${computedFinalScore}`);
  
    // 5. Submit to server (the server will compute and validate the scores)
    try {
      const response = await fetch(`/api/quizzes/${currentQuizId}/attempts/${currentAttemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        // Check if the error indicates that the attempt is already submitted.
        if (errorData.message && errorData.message.toLowerCase().includes('already submitted')) {
            displaySubmissionSummary(
                'This quiz attempt has already been submitted.',
                null,
                null,
                null,
                null
              );
        } else {
          alert(`Error submitting quiz: ${errorData.message}`);
        }
        return;
      }
  
      const data = await response.json();
      if (data.success) {
        // Display a more detailed summary that includes both server (official) and client-side computed scores.
        displaySubmissionSummary(
            'Quiz submitted successfully!',
            data.rawScore,
            data.totalQuizPoints,
            data.finalScore,
            { clientRaw: computedRawScore, clientFinal: computedFinalScore }
          );
      } else {
        alert(`Submission failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('An error occurred while submitting the quiz.');
    }
  });

  /**
 * Helper function to display the submission summary.
 * This function hides the quiz form and displays the results in a container element.
 *
 * @param {string} heading - The heading message.
 * @param {number|null} serverRaw - The raw score computed on the server.
 * @param {number|null} totalPoints - The total number of questions.
 * @param {number|null} serverFinal - The final score computed on the server.
 * @param {Object|null} clientScores - An object with clientRaw and clientFinal properties.
 */

  function displaySubmissionSummary(heading, serverRaw, totalPoints, serverFinal, clientScores) {
    // Assuming there is an element with ID "quizSummary" in your HTML.
    const summaryContainer = document.getElementById('quizSummary');
  
    // Build the content.
    let content = `<h2>${heading}</h2>`;
    if (serverRaw !== null && totalPoints !== null && serverFinal !== null) {
      content += `
        <p><strong>Server Raw Score:</strong> ${serverRaw} / ${totalPoints}</p>
        <p><strong>Server Final Score:</strong> ${serverFinal}</p>`;
    }
    if (clientScores) {
      content += `
        <p><em>(Client-side preview: Raw Score ${clientScores.clientRaw}, Final Score ${clientScores.clientFinal})</em></p>`;
    }
    
    // Update the summary container.
    if (summaryContainer) {
      summaryContainer.innerHTML = content;
      // Hide the quiz form and show the summary.
      quizForm.classList.add('hidden');
      summaryContainer.classList.remove('hidden');
    } else {
      // Fallback: if summary container not found, use an alert.
      alert(heading + '\n' +
        (serverRaw !== null ? `Server Raw Score: ${serverRaw} / ${totalPoints}\n` : '') +
        (serverFinal !== null ? `Server Final Score: ${serverFinal}\n` : '') +
        (clientScores ? `(Client-side preview: Raw Score ${clientScores.clientRaw}, Final Score ${clientScores.clientFinal})` : ''));
    }
  }

    // Load quizzes on page load
    fetchUserDetails();
    loadQuizzes();
});

