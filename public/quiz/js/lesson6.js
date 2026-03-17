/*******************************************************
 * lesson6.js (ES module)
 *  1) Wait for partials to load,
 *  2) Gate: nextButton -> show #quizContainer,
 *  3) On quiz submit -> compute score using `computeLesson6Score(...)`,
 *  4) Reorder data to match your Google Sheets column sequence,
 *  5) Send to server route
 ******************************************************/
import { computeLesson6Score } from './scoreLesson6.js';

document.addEventListener("DOMContentLoaded", () => {
  // We don't have direct references yet, 
  // so set up an interval or a small timeout to ensure 
  // partials have been fetched. Alternatively, 
  // you can do your logic in a callback after partial load.

  // Let's do a short setTimeout approach to ensure 
  // the partials have time to load. 
  // (Or you can do something more robust.)
  setTimeout(() => initLesson6Quiz(), 300);
});

function initLesson6Quiz() {
  const nextButton = document.getElementById("nextButton");
  const studentInfoContainer = document.getElementById("studentInfoContainer");
  const quizContainer = document.getElementById("quizContainer");
  const quizForm = document.getElementById("quizForm");
  const resultArea = document.getElementById("resultArea");

  if (!nextButton || !quizForm) {
    console.warn("Student info partial or quiz partial not fully loaded yet.");
    return;
  }

  // 1) "Proceed to Quiz" gating
  nextButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Gather info
    const firstNameEl  = document.getElementById("firstName");
    const lastNameEl   = document.getElementById("lastName");
    const emailEl      = document.getElementById("emailAddress");
    const studentIdEl  = document.getElementById("studentId");

    // If using courseSelect, otherCourse, sectionSelect, otherSection, gather them too
    const courseSelect = document.getElementById("courseSelect");
    const otherCourse  = document.getElementById("otherCourse");
    const sectionSelect= document.getElementById("sectionSelect");
    const otherSection = document.getElementById("otherSection");

    if (!firstNameEl || !lastNameEl || !emailEl || !studentIdEl) {
      alert("Student Info not loaded, or partial not found.");
      return;
    }

    const firstName  = firstNameEl.value.trim();
    const lastName   = lastNameEl.value.trim();
    const emailAddr  = emailEl.value.trim();
    const studentId  = studentIdEl.value.trim();

    // Combine name
    const fullName = `${lastName}, ${firstName}`;

    // For course/section
    let finalCourse = "";
    if (courseSelect) {
      finalCourse = courseSelect.value;
      if (finalCourse === "others" && otherCourse) {
        finalCourse = otherCourse.value.trim();
      }
    }
    let finalSection = "";
    if (sectionSelect) {
      finalSection = sectionSelect.value;
      if (finalSection === "others" && otherSection) {
        finalSection = otherSection.value.trim();
      }
    }

    // Basic validation
    if (!firstName || !lastName || !emailAddr || !studentId) {
      alert("Please fill in all required fields.");
      return;
    }

    // Hide student info, show quiz
    studentInfoContainer.classList.add("hidden");
    quizContainer.classList.remove("hidden");

    // We'll store this data so we can submit it later
    // E.g. store in quizForm's dataset
    quizForm.dataset.emailAddress = emailAddr;
    quizForm.dataset.studentId    = studentId;
    quizForm.dataset.fullName     = fullName;
    quizForm.dataset.section      = finalSection;
    quizForm.dataset.course       = finalCourse;
  });

  // 2) On Quiz Submit -> compute score, reorder columns, send to server
  quizForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Gather quiz answers
    const formData   = new FormData(quizForm);
    const quizAnswers= Object.fromEntries(formData.entries());
    // e.g. quizAnswers.q12, quizAnswers.q10, ...

    // Compute score
    const quizScore = computeLesson6Score(quizAnswers);

    // Gather stored user data from dataset
    const emailAddress = quizForm.dataset.emailAddress || "";
    const studentId    = quizForm.dataset.studentId    || "";
    const fullName     = quizForm.dataset.fullName     || "";
    const section      = quizForm.dataset.section      || "";
    // course if needed, etc.

    // Build final object to pass to server
    // But first, let's reorder so that we can easily
    // append in the server route. 
    // You have a custom order for columns:
    // 1) Timestamp
    // 2) Email Address
    // 3) Score
    // 4) Student ID Number
    // 5) Section
    // 6) Full Name (Last, First)
    // 7) q12, q10, q7, q3, q13, q9, q6, q14, q5, q11, q4, q15, q1, q8, q2

    // We'll create an array in that order. 
    // Then the server route can just append it to Google Sheets
    const now = new Date().toISOString();

    // We'll also store them in an object if you prefer:
    const finalData = {
      timestamp: now,
      emailAddress,
      quizScore,
      studentId,
      section,
      fullName,
      // Then each question by name in the desired sequence
      q12: quizAnswers.q12 || "",
      q10: quizAnswers.q10 || "",
      q7:  quizAnswers.q7  || "",
      q3:  quizAnswers.q3  || "",
      q13: quizAnswers.q13 || "",
      q9:  quizAnswers.q9  || "",
      q6:  quizAnswers.q6  || "",
      q14: quizAnswers.q14 || "",
      q5:  quizAnswers.q5  || "",
      q11: quizAnswers.q11 || "",
      q4:  quizAnswers.q4  || "",
      q15: quizAnswers.q15 || "",
      q1:  quizAnswers.q1  || "",
      q8:  quizAnswers.q8  || "",
      q2:  quizAnswers.q2  || ""
    };

    try {
      // POST to your route, e.g. /api/mst24Lesson6
      const resp = await fetch("/api/mst24Lesson6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || "Failed to submit quiz");
      }

      const result = await resp.json();
      resultArea.textContent = result.message || "Quiz submitted successfully!";
      resultArea.classList.remove("text-red-700");
      resultArea.classList.add("text-green-700");

      // Hide the quiz form, optionally reset
      quizForm.reset();
      quizForm.classList.add("hidden");
    } catch (err) {
      console.error("Error submitting quiz:", err);
      resultArea.textContent = "Error submitting quiz. Please try again.";
      resultArea.classList.remove("text-green-700");
      resultArea.classList.add("text-red-700");
    }
  });
}
