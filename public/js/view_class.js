document.addEventListener('DOMContentLoaded', () => {
    const classesContainer = document.getElementById('classesContainer');
    const quizzesContainer = document.getElementById('quizzesContainer');
    const studentModal = document.getElementById('studentManagementModal');
    const studentsContainer = document.getElementById('studentsContainer');
    const saveAssignmentsButton = document.getElementById('saveAssignments');
    const closeModalButton = document.getElementById('closeModal');

    let selectedClassId = null;

    // Fetch all classes
    async function fetchClasses() {
        try {
            const res = await fetch('/api/classes');
            const data = await res.json();
            if (data.success) {
                populateClasses(data.classes);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    }

    // Fetch all quizzes
    async function fetchQuizzes() {
        try {
            const res = await fetch('/api/quizzes');
            const data = await res.json();
            if (data.success) {
                populateQuizzes(data.quizzes);
            }
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        }
    }

    // Populate classes in the UI
    function populateClasses(classes) {
        classesContainer.innerHTML = '';
        classes.forEach(cls => {
            const classCard = document.createElement('div');
            classCard.className = 'card';
            classCard.setAttribute('data-class-id', cls._id); // Add class ID
            classCard.innerHTML = `
                <h3>${cls.className}</h3>
                <button onclick="openStudentModal('${cls._id}')">Assign Students</button>
            `;
            classCard.addEventListener('click', () => {
                // Deselect all other cards
                document.querySelectorAll('.card').forEach(card => card.classList.remove('selected'));
                // Select this card
                classCard.classList.add('selected');
            });
            classesContainer.appendChild(classCard);
        });
    }
    

    // Populate quizzes in the UI
    function populateQuizzes(quizzes) {
        quizzesContainer.innerHTML = '';
        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'card';
            quizCard.innerHTML = `
                <h3>${quiz.quizTitle}</h3>
                <button onclick="assignQuizToClass('${quiz._id}')">Assign to Class</button>
            `;
            quizzesContainer.appendChild(quizCard);
        });
    }

    // Open the modal to assign students
    async function openStudentModal(classId) {
        selectedClassId = classId;
        studentModal.classList.remove('hidden');
        try {
            const res = await fetch(`/api/class-students/${classId}`);
            const data = await res.json();
            if (data.success) {
                populateStudents(data.students);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    }

    // Populate students in the modal
    function populateStudents(students) {
        studentsContainer.innerHTML = '';
        students.forEach(student => {
            const studentItem = document.createElement('div');
            studentItem.innerHTML = `
                <label>
                    <input type="checkbox" value="${student._id}">
                    ${student.name}
                </label>
            `;
            studentsContainer.appendChild(studentItem);
        });
    }

    // Assign quizzes to classes
    async function assignQuizToClass(quizId) {
            // Prompt the user to select a class if not already selected
    const selectedClassElement = document.querySelector('.card[data-class-id].selected'); 
    if (!selectedClassElement) {
        alert('Please select a class before assigning a quiz.');
        return;
    }

    const classId = selectedClassElement.getAttribute('data-class-id'); // Get selected class ID

        try {
            const res = await fetch('/api/class-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quizId, classId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Quiz assigned successfully!');
                // Disable button to prevent reassignment
                const button = document.querySelector(`button[onclick="assignQuizToClass('${quizId}')"]`);
                if (button) {
                    button.disabled = true;
                    button.textContent = 'Assigned';
                }
            } else {
                alert(`Failed to assign quiz: ${data.message}`);
            }
        } catch (error) {
            console.error('Error assigning quiz:', error);
            alert('An error occurred while assigning the quiz.');
        }
    }

    // Save student assignments
    async function saveAssignments() {
        const selectedStudents = Array.from(
            studentsContainer.querySelectorAll('input:checked')
        ).map(input => input.value);

        try {
            const res = await fetch('/api/class-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: selectedClassId, students: selectedStudents })
            });
            const data = await res.json();
            if (data.success) {
                alert('Students assigned successfully!');
                studentModal.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error saving assignments:', error);
        }
    }

    closeModalButton.addEventListener('click', () => {
        studentModal.classList.add('hidden');
    });

    saveAssignmentsButton.addEventListener('click', saveAssignments);

    // Initial fetch calls
    fetchClasses();
    fetchQuizzes();
});
window.assignQuizToClass = assignQuizToClass;
window.openStudentModal = openStudentModal;
