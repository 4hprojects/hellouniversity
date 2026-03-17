document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  if (tabButtons.length && tabContents.length) {
    tabButtons.forEach((btn) => {
      btn.setAttribute("aria-selected", btn.classList.contains("active") ? "true" : "false");
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-tab");
        if (!target) return;

        tabButtons.forEach((otherBtn) => {
          otherBtn.classList.remove("active");
          otherBtn.setAttribute("aria-selected", "false");
        });

        tabContents.forEach((content) => content.classList.remove("active"));

        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const targetContent = document.getElementById(`${target}-tab`);
        if (targetContent) targetContent.classList.add("active");
      });
    });
  }
});
