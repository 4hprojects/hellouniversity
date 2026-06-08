(function initScrollTopButton() {
  function ensureButton() {
    const existing = document.querySelector('.js-scroll-top-button');
    if (existing) return existing;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scroll-top-btn js-scroll-top-button';
    button.setAttribute('aria-label', 'Scroll back to top');
    button.setAttribute('aria-hidden', 'true');
    button.title = 'Back to top';

    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'arrow_upward';
    button.appendChild(icon);
    document.body.appendChild(button);
    return button;
  }

  function bind() {
    const button = ensureButton();

    function update() {
      const shouldShow = document.documentElement.scrollTop > 120 || document.body.scrollTop > 120;
      button.classList.toggle('is-visible', shouldShow);
      button.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    }

    window.addEventListener('scroll', update, { passive: true });
    button.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
