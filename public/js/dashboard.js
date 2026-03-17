//<!-- Scripts -->

   document.getElementById('classesSelect').addEventListener('change', function () {
       const selectedCourseID = this.value;
       fetchGradesForCourse(selectedCourseID);
   });

   // Fetch Courses and Populate Dropdown
   async function fetchCourses(studentIDNumber) {
       try {
           const response = await fetch(`/get-grades/${studentIDNumber}`, { credentials: 'include' });
           const data = await response.json();

           if (data.success) {
               populateCourses(data.gradeDataArray);
           } else {
               console.error('Failed to fetch courses:', data.message);
           }
       } catch (error) {
           console.error('Error fetching courses:', error);
       }
   }


   async function fetchStudentDetails() {
       try {
           const response = await fetch('/user-details', {
               method: 'GET',
               credentials: 'include',
           });

           if (!response.ok) {
               throw new Error(`Failed to fetch user details. Status: ${response.status}`);
           }

           const data = await response.json();

           if (data.success) {
               document.getElementById('studentName').textContent = `${data.user.firstName} ${data.user.lastName}`;
               document.getElementById('studentID').textContent = data.user.studentIDNumber;

               // Fetch and display courses
               await fetchCourses(data.user.studentIDNumber);
           } else {
               console.error('Failed to fetch user details:', data.message);
           }
       } catch (error) {
           console.error('Error fetching user details:', error);
       }
   }

   // Fetch Courses and Populate Dropdown
   async function fetchCourses(studentIDNumber) {
       try {
           const response = await fetch(`/get-grades/${studentIDNumber}`, { credentials: 'include' });
           const data = await response.json();

           if (data.success) {
               populateCourses(data.gradeDataArray);
           } else {
               console.error('Failed to fetch courses:', data.message);
           }
       } catch (error) {
           console.error('Error fetching courses:', error);
       }
   }

   function populateCourses(courseArray) {
       const classesSelect = document.getElementById('classesSelect');
       classesSelect.innerHTML = ''; // Clear options

       courseArray.forEach(course => {
           const option = document.createElement('option');
           option.value = course.courseID;
           option.textContent = `${course.courseID} - ${course.courseDescription}`;
           classesSelect.appendChild(option);
       });

       // Display grades for the first course by default
       if (courseArray.length > 0) {
           fetchGradesForCourse(courseArray[0].courseID);
       }
   }

   // Fetch Grades for Selected Course
   async function fetchGradesForCourse(courseID) {
       const studentIDNumber = document.getElementById('studentID').textContent;

       try {
           const response = await fetch(`/get-grades/${studentIDNumber}`, { credentials: 'include' });
           const data = await response.json();

           if (data.success) {
               const courseData = data.gradeDataArray.find(course => course.courseID === courseID);
               if (courseData) displayGrades(courseData);
           } else {
               console.error('Failed to fetch grades:', data.message);
           }
       } catch (error) {
           console.error('Error fetching grades:', error);
       }
   }

   // Display Grades in Table and Accordion
   function displayGrades(courseData) {
       const gradeTableContainer = document.getElementById('gradeTableContainer');
       const accordionContainer = document.getElementById('accordionContainer');

       // Display Grades in Table View
       gradeTableContainer.innerHTML = `
       <div class="content-inner mb-6">
           <h3 class="text-lg font-semibold text-green-600 mb-4">${courseData.courseID} - ${courseData.courseDescription}</h3>
           <table class="w-full bg-white border border-gray-200 text-center">
               <thead class="bg-green-600 text-white font-semibold">
                   <tr>
                       <th class="py-2">Category</th>
                       <th class="py-2">Midterm</th>
                       <th class="py-2">Finals</th>
                   </tr>
               </thead>
               <tbody>
                   <tr><td>Attendance</td><td>${courseData.midtermAttendance || 'No entry'}</td><td>${courseData.finalsAttendance || 'No entry'}</td></tr>
                   <tr><td>Class Standing</td><td>${courseData.midtermClassStanding || 'No entry'}</td><td>${courseData.finalsClassStanding || 'No entry'}</td></tr>
                   <tr><td>Exams</td><td>${courseData.midtermExam || 'No entry'}</td><td>${courseData.finalExam || 'No entry'}</td></tr>
                   <tr class="bg-gray-100 font-semibold"><td>Computed Grade</td><td>${courseData.midtermGrade || 'No entry'}</td><td>${courseData.finalGrade || 'No entry'}</td></tr>
                   <tr class="bg-gray-200 font-bold"><td>Transmuted Grade</td><td>${courseData.transmutedMidtermGrade || 'No entry'}</td><td>${courseData.transmutedFinalGrade || 'No entry'}</td></tr>
                   <tr class="bg-green-100 font-bold"><td colspan="3">Final Grade: ${courseData.totalFinalGrade || 'No entry'}</td></tr>
               </tbody>
           </table>
       </div>
       `;

       // Populate Accordion View for Mobile
       accordionContainer.innerHTML = `
           ${['Attendance', 'Class Standing', 'Exams', 'Grades'].map(category => `
               <div class="accordion">
                   <div class="accordion-header">${category}</div>
                   <div class="accordion-body">
                       <p>Details for ${category}</p>
                   </div>
               </div>
           `).join('')}
       `;

       // Accordion Toggle
       document.querySelectorAll('.accordion-header').forEach(header => {
           header.addEventListener('click', () => {
               const body = header.nextElementSibling;
               body.classList.toggle('visible');
           });
       });
   }

   // Event Listener for Dropdown Change
   document.getElementById('classesSelect').addEventListener('change', function () {
       fetchGradesForCourse(this.value);
   });

   document.addEventListener('DOMContentLoaded', fetchStudentDetails);

   // Logout function
   async function logout() {
       try {
           await fetch('/api/logout', { method: 'POST', credentials: 'include' });
           window.location.href = '/'; // canonical home redirect
       } catch (error) {
           console.error('Error during logout:', error);
       }
   }
