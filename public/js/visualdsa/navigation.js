(() => {
  const layout = document.querySelector('[data-visualdsa-layout]');
  const toggle = layout?.querySelector('[data-visualdsa-sidebar-toggle]');
  const content = layout?.querySelector('[data-visualdsa-sidebar-content]');
  const label = toggle?.querySelector('[data-visualdsa-sidebar-toggle-label]');
  if (!layout || !toggle || !content || !label) return;
  const storageKey = 'visualdsa-sidebar-collapsed';
  function apply(collapsed) {
    layout.classList.toggle('is-sidebar-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Show VisualDSA menu' : 'Hide VisualDSA menu');
    label.textContent = collapsed ? 'Show' : 'Hide menu';
    content.setAttribute('aria-hidden', String(collapsed));
  }
  let collapsed = false;
  try { collapsed = localStorage.getItem(storageKey) === 'true'; } catch (_error) { collapsed = false; }
  apply(collapsed);
  toggle.addEventListener('click', () => {
    collapsed = !layout.classList.contains('is-sidebar-collapsed');
    apply(collapsed);
    try { localStorage.setItem(storageKey, String(collapsed)); } catch (_error) { /* Preference persistence is optional. */ }
  });
})();
