// manage_assignments.js

document.addEventListener('DOMContentLoaded', () => {
  const quizSelect = document.getElementById('quizSelect');
  const classSelect = document.getElementById('classSelect');
  const studentsSelect = document.getElementById('studentsSelect');
  const startDateInput = document.getElementById('startDateInput');
  const dueDateInput = document.getElementById('dueDateInput');
  const assignQuizBtn = document.getElementById('assignQuizBtn');
  const assignmentsTableBody = document.querySelector('#assignmentsTable tbody');

    // Grab references to the edit modal elements
    const editModal = document.getElementById('editAssignmentModal');
    const editStartDate = document.getElementById('editStartDate');
    const editDueDate = document.getElementById('editDueDate');
    const editAssignedStudents = document.getElementById('editAssignedStudents');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');

  let quizzes = [];
  let classes = [];
  let currentEditAssignmentId = null;

  // STEP A: Fetch quizzes
  async function loadQuizzes() {
    try {
      const response = await fetch('/api/quizzes'); // existing endpoint to get all quizzes if teacher/admin, or filter if needed
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to load quizzes:', data.message);
        return;
      }
      quizzes = data.quizzes;
      populateQuizSelect();
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  }

  function populateQuizSelect() {
    quizSelect.innerHTML = '';
    quizzes.forEach(quiz => {
      const option = document.createElement('option');
      option.value = quiz._id;
      option.textContent = quiz.quizTitle;
      quizSelect.appendChild(option);
    });
  }

  // STEP B: Fetch classes for teacher/admin
  async function loadClasses() {
    try {
      // We'll reuse your existing route for /api/classes
      // Suppose it returns classes the teacher can manage
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (!data.success) {
        console.error('Failed to load classes:', data.message);
        return;
      }
      classes = data.classes;
      populateClassSelect();
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }

  function populateClassSelect() {
    classSelect.innerHTML = '';
    classes.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls._id;
      option.textContent = cls.className || cls.classCode || 'Unnamed Class';
      classSelect.appendChild(option);
    });
    // Optionally, trigger load of students and assignments for the first class
    if (classes.length > 0) {
      loadClassDetails(classes[0]._id);
    }
  }

  // STEP C: Load details (students + assignments) when a class is selected
  classSelect.addEventListener('change', () => {
    const selectedClassId = classSelect.value;
    loadClassDetails(selectedClassId);
  });

  async function loadClassDetails(classId) {
    // 1. Load the actual class doc to get students
    const selectedClass = classes.find(cls => cls._id === classId);
    if (!selectedClass) {
      // Clear the table and studentsSelect
      studentsSelect.innerHTML = '';
      assignmentsTableBody.innerHTML = '';
      return;
    }
    populateStudentsSelect(selectedClass.students);

    // 2. Load existing assignments for this class
    try {
      const res = await fetch(`/api/assignments/class/${classId}`);
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to load assignments:', data.message);
        assignmentsTableBody.innerHTML = '';
        return;
      }
      populateAssignmentsTable(data.assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      assignmentsTableBody.innerHTML = '';
    }
  }

  function populateStudentsSelect(studentsArray) {
    studentsSelect.innerHTML = '';
    studentsArray.forEach(studentID => {
      const option = document.createElement('option');
      option.value = studentID;
      option.textContent = `Student #${studentID}`;
      studentsSelect.appendChild(option);
    });
  }

  // Overwrite our existing populateAssignmentsTable to include the new columns
  function populateAssignmentsTable(assignments) {
    assignmentsTableBody.innerHTML = '';
    assignments.forEach(asn => {
      const row = document.createElement('tr');
      row.className = 'border-b';

      const assignedSubsetText =
        asn.assignedStudents && asn.assignedStudents.length > 0
          ? asn.assignedStudents.join(', ')
          : 'All Students';

      const startDateString = asn.startDate
        ? new Date(asn.startDate).toLocaleString()
        : 'None';
      const dueDateString = asn.dueDate
        ? new Date(asn.dueDate).toLocaleString()
        : 'None';

      // "Edit" and "Remove" buttons
      const actionsHTML = `
        <button class="bg-green-600 text-white px-2 py-1 mr-2 rounded edit-assignment-btn" data-id="${asn.assignmentId}">Edit</button>
        <button class="bg-red-600 text-white px-2 py-1 rounded remove-assignment-btn" data-id="${asn.assignmentId}">Remove</button>
      `;

      row.innerHTML = `
        <td class="p-2">${asn.quizTitle || '(No title)'}</td>
        <td class="p-2">${assignedSubsetText}</td>
        <td class="p-2">${startDateString}</td>
        <td class="p-2">${dueDateString}</td>
        <td class="p-2">${actionsHTML}</td>
      `;
      assignmentsTableBody.appendChild(row);
    });

    // Attach event listeners for edit & remove
    const editBtns = document.querySelectorAll('.edit-assignment-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', onEditClick);
    });

    const removeBtns = document.querySelectorAll('.remove-assignment-btn');
    removeBtns.forEach(btn => {
      btn.addEventListener('click', onRemoveClick);
    });
  }

  // Remove handler
  async function onRemoveClick(e) {
    const assignmentId = e.target.getAttribute('data-id');
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Assignment removed successfully.');
        // Reload table
        loadClassDetails(classSelect.value);
      } else {
        console.error('Remove assignment error:', data.message);
        alert('Failed to remove assignment: ' + data.message);
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('An error occurred while removing the assignment.');
    }
  }

  // Edit handler
  function onEditClick(e) {
    currentEditAssignmentId = e.target.getAttribute('data-id');

    // We can do a quick data fetch or, for brevity, just let the user type new values.
    // If you want to pre-fill the current values in the modal, you might store
    // them in memory or fetch the single assignment doc.
    editStartDate.value = '';
    editDueDate.value = '';
    editAssignedStudents.value = '';
    editModal.classList.remove('hidden');
  }

  // Cancel editing
  cancelEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
    currentEditAssignmentId = null;
  });

  // Save editing
  saveEditBtn.addEventListener('click', async () => {
    if (!currentEditAssignmentId) {
      alert('No assignment selected.');
      return;
    }

    const updates = {};

    // If user typed something into startDate or dueDate, convert to ISO
    if (editStartDate.value) {
      updates.startDate = new Date(editStartDate.value).toISOString();
    }
    if (editDueDate.value) {
      updates.dueDate = new Date(editDueDate.value).toISOString();
    }

    // If user typed something into assignedStudents
    const assignedStr = editAssignedStudents.value.trim();
    if (assignedStr) {
      const arr = assignedStr.split(',').map(s => s.trim());
      updates.assignedStudents = arr;
    }

    try {
      const res = await fetch(`/api/assignments/${currentEditAssignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('Assignment updated successfully.');
        editModal.classList.add('hidden');
        currentEditAssignmentId = null;
        // Reload table
        loadClassDetails(classSelect.value);
      } else {
        console.error('Update assignment error:', data.message);
        alert('Failed to update assignment: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('An error occurred while updating the assignment.');
    }
  });

// 2. When "Assign Quiz" is clicked
assignQuizBtn.addEventListener('click', async () => {
  const selectedQuizId = quizSelect.value;
  const selectedClassId = classSelect.value;

  // Gather selected students
  const selectedOptions = Array.from(studentsSelect.selectedOptions);
  const studentIDs = selectedOptions.map(opt => opt.value);

  // Convert datetime-local to ISO if provided
  const startDateValue = startDateInput.value
    ? new Date(startDateInput.value).toISOString()
    : null;
  const dueDateValue = dueDateInput.value
    ? new Date(dueDateInput.value).toISOString()
    : null;

  // Build the request body
  const bodyData = {
    quizId: selectedQuizId,
    classId: selectedClassId
  };

  // If any students were explicitly chosen, set assignedStudents
  // Otherwise, the server will interpret an empty array as "entire class"
  if (studentIDs.length > 0) {
    bodyData.assignedStudents = studentIDs;
  }
  if (startDateValue) {
    bodyData.startDate = startDateValue;
  }
  if (dueDateValue) {
    bodyData.dueDate = dueDateValue;
  }

  try {
    const res = await fetch('/api/quizzes/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert('Quiz assigned successfully!');
      // Reload the assignments table
      loadClassDetails(selectedClassId);
    } else {
      console.error('Assign quiz error:', data.message);
      alert('Failed to assign quiz: ' + data.message);
    }
  } catch (error) {
    console.error('Error assigning quiz:', error);
    alert('An error occurred while assigning the quiz.');
  }
});


// References to the new buttons
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');

// 1. Add event listeners for select/deselect all
selectAllBtn.addEventListener('click', () => {
  for (const option of studentsSelect.options) {
    option.selected = true;
  }
});

deselectAllBtn.addEventListener('click', () => {
  for (const option of studentsSelect.options) {
    option.selected = false;
  }
});

  // INITIAL LOAD
  loadQuizzes();
  loadClasses();
});



