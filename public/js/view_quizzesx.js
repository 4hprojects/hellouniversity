//view_quizzes.js
document.addEventListener('DOMContentLoaded', () => {
    const quizzesTableBody = document.querySelector('#quizzesTable tbody');
    const quizModal = document.getElementById('quizModal');
    const quizTitle = document.getElementById('quizTitle');
    const quizDescription = document.getElementById('quizDescription');
    const quizQuestions = document.getElementById('quizQuestions');
    const closeQuizModal = document.getElementById('closeQuizModal');


        // Ensure all required elements exist
        if (!quizzesTableBody || !quizModal || !quizTitle || !quizDescription || !quizQuestions || !closeQuizModal) {
            console.error('One or more required DOM elements are missing.');
            return;
        }

    // Fetch all quizzes from the API
    async function fetchQuizzes() {
        try {
            const res = await fetch('/api/quizzes');
            if (!res.ok) {
                throw new Error(`Error fetching quizzes: ${res.statusText}`);
            }
            const data = await res.json();
    
            if (data.success) {
                populateQuizzesTable(data.quizzes);
            } else {
                console.error('Error in API response:', data.message);
                quizzesTableBody.innerHTML = `<tr><td colspan="4">Failed to load quizzes: ${data.message}</td></tr>`;
            }
        } catch (error) {
            console.error('Error in fetchQuizzes:', error);
            quizzesTableBody.innerHTML = `<tr><td colspan="4">An error occurred while loading quizzes.</td></tr>`;
        }
    }
    

    // Populate the table with quizzes
    function populateQuizzesTable(quizzes) {
        quizzesTableBody.innerHTML = ''; // Clear the table body

        if (quizzes.length === 0) {
            quizzesTableBody.innerHTML = `<tr><td colspan="4">No quizzes available.</td></tr>`;
            return;
        }

        quizzes.forEach(quiz => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${quiz.quizTitle}</td>
                <td>${quiz.description}</td>
                <td>${quiz.questions.length}</td>
                <td>
                    <button class="btn-start" onclick="startQuiz('${quiz._id}')">Start Quiz</button>
                    <button class="btn-delete" onclick="deleteQuiz('${quiz._id}')">Delete</button>
                </td>
            `;

            quizzesTableBody.appendChild(row);
        });
    }

    // Start a quiz
    window.startQuiz = async function (quizId) {
        console.log('Start Quiz called for ID:', quizId);
        try {
            // Fetch the quiz data
            const res = await fetch(`/api/quizzes/${quizId}`);
            const data = await res.json();
    
            if (data.success) {
                console.log('Quiz Data:', data);
    
                // Access the modal and its elements
                const quizModal = document.getElementById('quizModal');
                const quizTitle = document.getElementById('quizTitle');
                const quizDescription = document.getElementById('quizDescription');
                const quizQuestions = document.getElementById('quizQuestions');
    
                // Check if all elements exist
                if (!quizModal || !quizTitle || !quizDescription || !quizQuestions) {
                    console.error('One or more modal elements are missing.');
                    return;
                }
    
                // Populate modal title and description
                quizTitle.textContent = data.quiz.quizTitle || 'Untitled Quiz';
                quizDescription.textContent = data.quiz.description || 'No description available';
    
                // Clear previous questions and add new ones
                quizQuestions.innerHTML = '';
                data.quiz.questions.forEach((q, index) => {
                    console.log(`Processing question ${index + 1}:`, q);
                    if (!q.questionText || !Array.isArray(q.options)) {
                        console.error(`Invalid question structure at index ${index}:`, q);
                        return; // Skip invalid questions
                    }
    
                    const questionItem = document.createElement('li');
                    questionItem.innerHTML = `
                        <p>${index + 1}. ${q.questionText}</p>
                        ${q.options
                            .map(
                                (option, idx) => `
                            <label>
                                <input type="radio" name="question${index}" value="${idx}"> ${option}
                            </label>
                        `
                            )
                            .join('<br>')}
                    `;
                    quizQuestions.appendChild(questionItem);
                });
    
                // Add a submit button to the modal
                const submitButton = document.createElement('button');
                submitButton.type = 'button';
                submitButton.textContent = 'Submit Answers';
                submitButton.classList.add('btn-submit');
                submitButton.onclick = () => submitQuiz(quizId);
                quizQuestions.appendChild(submitButton);
    
                // Display the modal
                quizModal.classList.remove('hidden');
            } else {
                alert(`Failed to fetch quiz details: ${data.message}`);
            }
        } catch (error) {
            console.error('Error fetching quiz details:', error.message || error);
            alert('An error occurred while fetching quiz details.');
        }
    };
    
    

    // Submit quiz answers
    async function submitQuiz(quizId) {
        const formData = new FormData();
        const answers = [];
        document.querySelectorAll('[name^="question"]').forEach(input => {
            if (input.checked) {
                answers.push(parseInt(input.value));
            }
        });

        if (answers.length === 0) {
            alert('Please answer at least one question.');
            return;
        }

        try {
            const res = await fetch(`/api/quizzes/${quizId}/attempts/${attemptId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            });
            
        
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Submission failed:', errorText);
                throw new Error(`Error: ${res.status} - ${errorText}`);
            }
        
            const data = await res.json();
            console.log('Submission response:', data);
        
            if (data.success) {
                alert('Quiz submitted successfully!');
                quizModal.classList.add('hidden');
            } else {
                alert(`Submission failed: ${data.message}`);
            }
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('An error occurred while submitting the quiz.');
        }
        
    }

    // Close modal functionality
    closeQuizModal.addEventListener('click', () => {
        quizModal.classList.add('hidden');
    });

    const startQuiz = async (quizId) => {
        try {
            const res = await fetch(`/api/quizzes/${quizId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
    
            const data = await res.json();
            if (data.success) {
                console.log('Attempt ID:', data.attemptId);
                // Save attemptId and use it during submission
                submitQuiz(quizId, data.attemptId);
            } else {
                alert(`Failed to start quiz: ${data.message}`);
            }
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('An error occurred while starting the quiz.');
        }
    };
    

    // Delete a quiz
    window.deleteQuiz = async function (quizId) {
        if (!confirm('Are you sure you want to delete this quiz?')) return;

        try {
            const res = await fetch(`/api/quizzes/${quizId}`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (data.success) {
                alert('Quiz deleted successfully!');
                fetchQuizzes(); // Refresh the quiz list
            } else {
                alert(`Failed to delete quiz: ${data.message}`);
            }
        } catch (error) {
            console.error('Error deleting quiz:', error);
            alert('An error occurred while deleting the quiz.');
        }
    };

    // Initial fetch call
    fetchQuizzes();
});

document.getElementById('closeQuizModal').addEventListener('click', () => {
    const quizModal = document.getElementById('quizModal');
    quizModal.classList.add('hidden'); // Add the "hidden" class to hide the modal
});
