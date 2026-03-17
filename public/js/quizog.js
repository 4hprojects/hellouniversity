//quiz.js 
document.addEventListener('DOMContentLoaded', () => {
    const quizListContainer = document.getElementById('quiz-list');
    const quizViewContainer = document.getElementById('quiz-view');
    const resultContainer = document.getElementById('result-container');
    const backButton = document.getElementById('back-to-assessments');
    const quizId = new URLSearchParams(window.location.search).get('quizId');

    // Show or hide sections based on quiz state
    if (!quizId) {
        quizListContainer.style.display = 'block';
        quizViewContainer.style.display = 'none';
        resultContainer.style.display = 'none';
        fetchQuizzes();
    } else {
        quizListContainer.style.display = 'none';
        quizViewContainer.style.display = 'block';
        loadQuiz(quizId);
    }

    function fetchQuizzes() {
        const apiUrl = '/api/quizzes';

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.quizzes.length > 0) {
                    const quizListContent = document.getElementById('quiz-list-content');
                    quizListContent.innerHTML = '';
                    data.quizzes.forEach(quiz => {
                        const quizItem = document.createElement('div');
                        quizItem.classList.add('quiz-item');
                        quizItem.innerHTML = `
                            <h3>${quiz.quizTitle}</h3>
                            <p>${quiz.description || 'No description available.'}</p>
                            <button data-quiz-id="${quiz._id}">Start Quiz</button>
                        `;
                        quizListContent.appendChild(quizItem);
                    });

                    document.querySelectorAll('.quiz-item button').forEach(button => {
                        button.addEventListener('click', event => {
                            const quizId = event.target.getAttribute('data-quiz-id');
                            window.location.href = `/quiz.html?quizId=${quizId}`;
                        });
                    });
                } else {
                    quizListContainer.innerHTML = '<p>No quizzes available at this time.</p>';
                }
            })
            .catch(err => {
                console.error('Error fetching quizzes:', err);
                quizListContainer.innerHTML = '<p>An error occurred while fetching quizzes.</p>';
            });
    }

    function loadQuiz(quizId) {
        const apiUrl = `/api/quizzes/${quizId}`;
        const quizTitle = document.getElementById('quiz-title');
        const quizDescription = document.getElementById('quiz-description');
        const questionContainer = document.getElementById('question-container');
        const questionElement = document.getElementById('question');
        const optionsElement = document.getElementById('options');
        const nextButton = document.getElementById('next-btn');
        const prevButton = document.getElementById('prev-btn');
        const submitButton = document.getElementById('submit-btn');
        const scoreElement = document.getElementById('score');
        const totalQuestionsElement = document.getElementById('total-questions');

        let currentQuestionIndex = 0;
        let score = 0;
        let quizData = [];
        const responses = []; // Track user responses

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    quizData = shuffleArray(data.quiz.questions);
                    quizData.forEach(q => (q.options = shuffleArray(q.options))); // Shuffle options
                    quizTitle.textContent = data.quiz.quizTitle;
                    quizDescription.textContent = data.quiz.description || '';
                    loadQuestion();
                } else {
                    quizTitle.textContent = 'Error';
                    quizDescription.textContent = data.message || 'Failed to load quiz.';
                }
            })
            .catch(err => {
                console.error('Error fetching quiz:', err);
                quizTitle.textContent = 'Error';
                quizDescription.textContent = 'An unexpected error occurred.';
            });

        function loadQuestion() {
            if (currentQuestionIndex < quizData.length) {
                const question = quizData[currentQuestionIndex];
                questionElement.textContent = question.questionText;
                optionsElement.innerHTML = '';
                question.options.forEach((option, index) => {
                    const li = document.createElement('li');
                    li.textContent = option;
                    li.setAttribute('data-index', index);
                    li.addEventListener('click', () => {
                        document.querySelectorAll('#options li').forEach(li => li.classList.remove('selected'));
                        li.classList.add('selected');
                        nextButton.disabled = false;
                    });
                    optionsElement.appendChild(li);
                });
                questionContainer.style.display = 'block';
                prevButton.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
                nextButton.style.display = currentQuestionIndex < quizData.length - 1 ? 'inline-block' : 'none';
                submitButton.style.display = currentQuestionIndex === quizData.length - 1 ? 'inline-block' : 'none';
                //nextButton.disabled = true;
            } else {
                submitQuiz();
            }
        }

        nextButton.addEventListener('click', () => {
            const selectedOption = document.querySelector('#options li.selected');

            if (!selectedOption) {
                showNotification('Please select an answer before proceeding.');
                return;
            }
        
            saveResponse();
            currentQuestionIndex++;
            loadQuestion();
        });
        
        // Function to show notification
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.classList.add('notification');
            notification.textContent = message;
        
            document.body.appendChild(notification);
        
            setTimeout(() => {
                notification.remove();
            }, 3000); // Remove after 3 seconds
        }
        

        prevButton.addEventListener('click', () => {
            saveResponse();
            currentQuestionIndex--;
            loadQuestion();
        });

        submitButton.addEventListener('click', submitQuiz);

        function saveResponse() {
            const selectedOption = document.querySelector('#options li.selected');
            if (selectedOption) {
                const selectedIndex = parseInt(selectedOption.getAttribute('data-index'), 10);
                const correctIndex = quizData[currentQuestionIndex].correctAnswer;

                responses[currentQuestionIndex] = {
                    questionId: quizData[currentQuestionIndex]._id,
                    selectedAnswer: selectedIndex,
                    isCorrect: selectedIndex === correctIndex,
                };

                if (selectedIndex === correctIndex) {
                    score++;
                }
            }
        }

        function submitQuiz() {
            const selectedOption = document.querySelector('#options li.selected');
            if (!selectedOption) {
                showNotification('Please select an answer before proceeding.');
                return;
            }
        
            questionContainer.style.display = 'none';
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
            submitButton.style.display = 'none';
            resultContainer.style.display = 'block';
            scoreElement.textContent = score;
            totalQuestionsElement.textContent = quizData.length;

            // Save responses to the database
            const apiUrl = `/api/quiz-responses`;
            const payload = {
                quizId,
                responses,
                score,
                totalQuestions: quizData.length,
            };

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        console.error('Failed to save responses:', data.message);
                    }
                })
                .catch(err => {
                    console.error('Error saving responses:', err);
                });
        }
    }

    backButton.addEventListener('click', () => {
        window.location.href = '/quiz.html';
    });

    // Utility function to shuffle an array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});
