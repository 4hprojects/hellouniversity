(function () {
  try {
    if (window.adsbygoogle) {
      window.adsbygoogle.push({});
    }
  } catch (_err) {
    // Ignore ad rendering errors.
  }

  document.addEventListener('DOMContentLoaded', function () {
    const policyCards = document.querySelectorAll('.policy-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    policyCards.forEach((card) => {
      card.style.animation = 'none';
      observer.observe(card);
    });
  });

  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (window.ScrollReveal) {
    window.ScrollReveal().reveal('.scroll-reveal', {
      duration: 1200,
      origin: 'bottom',
      distance: '30px'
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

  const footerYear = document.getElementById('footerYear');
  if (footerYear) footerYear.textContent = new Date().getFullYear();
})();
