// studentInfoSection.js

function initStudentInfoSection() {
    const courseSelect         = document.getElementById('courseSelect');
    const otherCourseContainer = document.getElementById('otherCourseContainer');
    const otherCourse          = document.getElementById('otherCourse');
  
    // Show/hide "Other Course"
    courseSelect.addEventListener('change', () => {
      if (courseSelect.value === 'others') {
        otherCourseContainer.classList.remove('hidden');
        otherCourse.required = true;
      } else {
        otherCourseContainer.classList.add('hidden');
        otherCourse.required = false;
        otherCourse.value = ""; // Clear it if user changes their mind
      }
    });
  
    const sectionSelect         = document.getElementById('sectionSelect');
    const otherSectionContainer = document.getElementById('otherSectionContainer');
    const otherSection          = document.getElementById('otherSection');
  
    // Show/hide "Other Section"
    sectionSelect.addEventListener('change', () => {
      if (sectionSelect.value === 'others') {
        otherSectionContainer.classList.remove('hidden');
        otherSection.required = true;
      } else {
        otherSectionContainer.classList.add('hidden');
        otherSection.required = false;
        otherSection.value = "";
      }
    });
  
    // You might also add a click handler for #nextButton here, 
    // or handle it in your quiz code. 
    // Example:
    const nextButton = document.getElementById('nextButton');
    if (nextButton) {
      nextButton.addEventListener('click', (ev) => {
        // Basic validation or gating logic can go here
        // e.g., check if fields are filled. 
        // If validated, hide this section and show your quiz section, etc.
        console.log("Proceed to Quiz clicked");
      });
    }
  }
  