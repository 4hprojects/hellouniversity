(function () {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const headerNav = document.getElementById('headerNav');
  if (mobileMenuBtn && headerNav) {
    mobileMenuBtn.addEventListener('click', () => {
      headerNav.classList.toggle('active');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.role-card').forEach((card) => {
      card.style.animation = 'fadeInUp 0.5s forwards';
    });
  });

  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();
})();
