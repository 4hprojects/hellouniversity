document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('blogMyPostsPage');
  if (!root) {
    return;
  }

  const list = document.getElementById('blogMyPostsList');
  const message = document.getElementById('blogMyPostsMessage');
  const refreshButton = document.getElementById('blogMyPostsRefreshButton');

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

  function createStatusClass(status) {
    return `blog-workspace-post-status blog-workspace-status-${status?.tone || 'soft'}`;
  }

  function renderPosts(posts) {
    if (!list) {
      return;
    }

    if (!posts.length) {
      list.innerHTML = `<p class="blog-workspace-empty-state">${root.dataset.emptyText || 'No blog posts found.'}</p>`;
      return;
    }

    list.innerHTML = posts.map((post) => {
      const publishedAction = post.status?.value === 'published' && post.publicHref
        ? `<a href="${post.publicHref}" class="blog-workspace-btn blog-workspace-btn-secondary">View Public Post</a>`
        : '';
      const notes = post.reviewNotes
        ? `<p class="blog-workspace-post-notes"><strong>Review notes:</strong> ${post.reviewNotes}</p>`
        : '';

      return `
        <article class="blog-workspace-post-card">
          <div class="blog-workspace-post-header">
            <div>
              <h3>${post.title}</h3>
              <div class="blog-workspace-post-meta">
                <span>${post.categoryLabel}</span>
                <span>${post.updatedLabel || post.createdLabel || 'No timestamp yet'}</span>
                <span>${post.slug}</span>
              </div>
            </div>
            <span class="${createStatusClass(post.status)}">${post.status?.label || 'Draft'}</span>
          </div>
          <p class="blog-workspace-copy">${post.description || 'No description yet.'}</p>
          ${notes}
          <div class="blog-workspace-post-actions">
            <a href="/blogs/new?edit=${encodeURIComponent(post.id)}" class="blog-workspace-btn blog-workspace-btn-primary">Edit Draft</a>
            ${publishedAction}
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadPosts() {
    refreshButton.disabled = true;
    setMessage('', 'info');

    try {
      const response = await fetch('/api/blogs/mine');
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Unable to load your posts right now.');
      }
      renderPosts(Array.isArray(result.posts) ? result.posts : []);
    } catch (error) {
      setMessage(error.message || 'Unable to load your posts right now.', 'error');
      renderPosts([]);
    } finally {
      refreshButton.disabled = false;
    }
  }

  refreshButton?.addEventListener('click', loadPosts);
  loadPosts();
});
