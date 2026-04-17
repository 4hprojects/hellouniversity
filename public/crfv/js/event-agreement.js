(function () {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', function () {
      nav.classList.toggle('active');
    });
  }

  const acceptBtn = document.getElementById('acceptBtn');
  const agreementCheckbox = document.getElementById('agreementCheckbox');
  if (acceptBtn && agreementCheckbox) {
    acceptBtn.addEventListener('click', async function () {
      if (agreementCheckbox.checked) {
        await window.crfvDialog.alert('Thank you for accepting the Event Participation Agreement. Your response has been recorded.', { tone: 'success' });
      } else {
        await window.crfvDialog.alert('Please check the box to indicate your agreement before proceeding.', { tone: 'info' });
      }
    });
  }

  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', function () {
    if (!scrollToTopBtn) return;
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
      scrollToTopBtn.style.display = 'flex';
    } else {
      scrollToTopBtn.style.display = 'none';
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.agreement-card').forEach((card) => {
    observer.observe(card);
  });

  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();
})();
