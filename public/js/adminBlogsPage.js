document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('adminBlogReviewPage');
  if (!root) {
    return;
  }

  const message = document.getElementById('adminBlogReviewMessage');
  const list = document.getElementById('adminBlogQueueList');
  const detail = document.getElementById('adminBlogReviewDetail');
  const statusFilter = document.getElementById('adminBlogStatusFilter');

  const state = {
    posts: [],
    activePostId: ''
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setMessage(text, tone = 'info') {
    if (!message) {
      return;
    }

    if (!text) {
      message.hidden = true;
      message.textContent = '';
      message.removeAttribute('data-tone');
      return;
    }

    message.hidden = false;
    message.textContent = text;
    message.dataset.tone = tone;
  }

  function statusClass(status) {
    return `blog-workspace-post-status blog-workspace-status-${status?.tone || 'soft'}`;
  }

  function renderList() {
    if (!list) {
      return;
    }

    if (!state.posts.length) {
      list.innerHTML = '<p class="blog-workspace-empty-state">No blog posts match the current filter.</p>';
      renderDetail(null);
      return;
    }

    list.innerHTML = state.posts.map((post) => `
      <article class="blog-workspace-post-card">
        <div class="blog-workspace-post-header">
          <div>
            <h3>${escapeHtml(post.title)}</h3>
            <div class="blog-workspace-post-meta">
              <span>${escapeHtml(post.authorName)}</span>
              <span>${escapeHtml(post.categoryLabel)}</span>
              <span>${escapeHtml(post.updatedLabel || post.createdLabel || 'No timestamp')}</span>
            </div>
          </div>
          <span class="${statusClass(post.status)}">${escapeHtml(post.status?.label || 'Draft')}</span>
        </div>
        <p class="blog-workspace-copy">${escapeHtml(post.description || 'No description yet.')}</p>
        <div class="blog-workspace-post-actions">
          <button type="button" class="blog-workspace-btn blog-workspace-btn-primary" data-open-review="${escapeHtml(post.id)}">Open Review</button>
          ${post.publicHref ? `<a href="${escapeHtml(post.publicHref)}" class="blog-workspace-btn blog-workspace-btn-secondary">Open Public Post</a>` : ''}
        </div>
      </article>
    `).join('');
  }

  function renderDetail(post) {
    if (!detail) {
      return;
    }

    if (!post) {
      detail.innerHTML = `
        <p class="blog-workspace-eyebrow">Review Detail</p>
        <h2>Select a post</h2>
        <p class="blog-workspace-copy">Choose a blog from the queue to inspect the body and complete the review action.</p>
      `;
      return;
    }

    const rejectControls = post.status?.value === 'submitted'
      ? `
        <label class="blog-workspace-field">
          <span>Rejection notes</span>
          <textarea id="adminBlogRejectNotes" class="blog-workspace-textarea" rows="4" placeholder="Explain what needs revision."></textarea>
        </label>
        <div class="blog-workspace-review-actions">
          <button type="button" id="adminBlogApproveButton" class="blog-workspace-btn blog-workspace-btn-primary">Approve and Publish</button>
          <button type="button" id="adminBlogRejectButton" class="blog-workspace-btn blog-workspace-btn-secondary">Reject with Notes</button>
        </div>
      `
      : `
        <div class="blog-workspace-message" data-tone="info">
          ${escapeHtml(post.status?.label || 'Draft')} posts cannot be reviewed from this state.
        </div>
      `;

    detail.innerHTML = `
      <div class="blog-workspace-review-detail">
        <p class="blog-workspace-eyebrow">Review Detail</p>
        <h2>${escapeHtml(post.title)}</h2>
        <div class="blog-workspace-post-meta">
          <span>${escapeHtml(post.authorName)}</span>
          <span>${escapeHtml(post.categoryLabel)}</span>
          <span>${escapeHtml(post.status?.label || 'Draft')}</span>
        </div>
        <p class="blog-workspace-copy">${escapeHtml(post.description || 'No description yet.')}</p>
        <div class="blog-workspace-html-preview">${post.contentHtml || '<p>No content provided.</p>'}</div>
        ${post.reviewNotes ? `<p class="blog-workspace-post-notes"><strong>Existing notes:</strong> ${escapeHtml(post.reviewNotes)}</p>` : ''}
        ${rejectControls}
      </div>
    `;

    document.getElementById('adminBlogApproveButton')?.addEventListener('click', () => {
      reviewPost(post.id, 'approve');
    });

    document.getElementById('adminBlogRejectButton')?.addEventListener('click', () => {
      const notes = document.getElementById('adminBlogRejectNotes')?.value || '';
      reviewPost(post.id, 'reject', notes);
    });
  }

  async function fetchQueue() {
    setMessage('', 'info');

    try {
      const response = await fetch(`/api/admin/blogs?status=${encodeURIComponent(statusFilter.value || 'submitted')}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Unable to load the review queue right now.');
      }

      state.posts = Array.isArray(result.posts) ? result.posts : [];
      const current = state.posts.find((post) => post.id === state.activePostId) || state.posts[0] || null;
      state.activePostId = current?.id || '';
      renderList();
      renderDetail(current);
    } catch (error) {
      state.posts = [];
      state.activePostId = '';
      renderList();
      renderDetail(null);
      setMessage(error.message || 'Unable to load the review queue right now.', 'error');
    }
  }

  async function reviewPost(postId, action, reviewNotes = '') {
    setMessage('', 'info');

    try {
      const response = await fetch(`/api/admin/blogs/${postId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reviewNotes })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Review action failed.');
      }

      setMessage(result.message || 'Review updated.', 'info');
      await fetchQueue();
    } catch (error) {
      setMessage(error.message || 'Review action failed.', 'error');
    }
  }

  list?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-review]');
    if (!button) {
      return;
    }

    const postId = button.getAttribute('data-open-review') || '';
    const post = state.posts.find((entry) => entry.id === postId) || null;
    state.activePostId = postId;
    renderDetail(post);
  });

  statusFilter?.addEventListener('change', fetchQueue);
  fetchQueue();
});
