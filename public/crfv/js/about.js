(function () {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const headerNav = document.getElementById('headerNav');
  if (mobileMenuBtn && headerNav) {
    mobileMenuBtn.addEventListener('click', () => {
      headerNav.classList.toggle('active');
    });
  }

  window.toggleAnswer = function toggleAnswer(element) {
    const answer = element && element.nextElementSibling;
    const icon = element ? element.querySelector('.material-icons') : null;
    if (!answer || !icon) return;
    answer.classList.toggle('active');
    icon.textContent = answer.classList.contains('active') ? 'expand_less' : 'expand_more';
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fade-in').forEach((el) => {
      el.style.animation = 'fadeInUp 0.5s forwards';
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId.length < 2) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();
})();
