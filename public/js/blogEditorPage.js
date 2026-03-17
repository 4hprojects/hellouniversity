document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('blogEditorPage');
  if (!root) {
    return;
  }

  const form = document.getElementById('blogEditorForm');
  const message = document.getElementById('blogEditorMessage');
  const heading = document.getElementById('blogEditorHeading');
  const statusBadge = document.getElementById('blogEditorStatus');
  const titleInput = document.getElementById('blogEditorTitle');
  const categoryInput = document.getElementById('blogEditorCategory');
  const slugInput = document.getElementById('blogEditorSlug');
  const heroImageInput = document.getElementById('blogEditorHeroImage');
  const descriptionInput = document.getElementById('blogEditorDescription');
  const keywordsInput = document.getElementById('blogEditorKeywords');
  const contentInput = document.getElementById('blogEditorContent');
  const saveButton = document.getElementById('blogSaveDraftButton');
  const submitButton = document.getElementById('blogSubmitReviewButton');

  const state = {
    currentPostId: (root.dataset.editBlogId || '').trim(),
    slugLocked: false,
    isBusy: false
  };

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/['"`]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  function setBusy(nextBusy) {
    state.isBusy = nextBusy;
    [saveButton, submitButton].forEach((button) => {
      if (!button) {
        return;
      }
      button.disabled = nextBusy;
      button.setAttribute('aria-busy', String(nextBusy));
    });
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

  function setStatusBadge(status) {
    if (!statusBadge) {
      return;
    }

    const normalized = status || { label: 'Draft', tone: 'soft' };
    statusBadge.textContent = normalized.label || 'Draft';
    statusBadge.className = `blog-workspace-status-pill blog-workspace-status-${normalized.tone || 'soft'}`;
  }

  function collectPayload() {
    return {
      title: titleInput.value,
      category: categoryInput.value,
      slug: slugInput.value,
      heroImage: heroImageInput.value,
      description: descriptionInput.value,
      keywords: keywordsInput.value,
      contentHtml: contentInput.value
    };
  }

  function populateForm(post) {
    titleInput.value = post.title || '';
    categoryInput.value = post.category || 'tech';
    slugInput.value = post.slug || '';
    heroImageInput.value = post.heroImage || '';
    descriptionInput.value = post.description || '';
    keywordsInput.value = post.keywords || '';
    contentInput.value = post.contentHtml || '';
    state.slugLocked = Boolean(post.slug);
    setStatusBadge(post.status);

    if (heading) {
      heading.textContent = post.title ? `Editing: ${post.title}` : 'Edit Blog Draft';
    }
  }

  async function parseResponse(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.message || 'Request failed.');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function saveDraft(options = {}) {
    const { silent = false } = options;
    setBusy(true);

    try {
      const payload = collectPayload();
      const response = await fetch(state.currentPostId ? `/api/blogs/${state.currentPostId}` : '/api/blogs', {
        method: state.currentPostId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const result = await parseResponse(response);
      state.currentPostId = result.post?.id || state.currentPostId;

      if (state.currentPostId) {
        window.history.replaceState({}, '', `/blogs/new?edit=${encodeURIComponent(state.currentPostId)}`);
      }

      populateForm(result.post || payload);
      if (!silent) {
        setMessage(result.message || 'Draft saved.', 'info');
      }
      return result;
    } catch (error) {
      if (!silent) {
        setMessage(error.message || 'Unable to save the draft right now.', 'error');
      }
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    setMessage('', 'info');

    try {
      if (!state.currentPostId) {
        await saveDraft({ silent: true });
      }

      setBusy(true);
      const response = await fetch(`/api/blogs/${state.currentPostId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const result = await parseResponse(response);
      populateForm(result.post || {});
      setMessage(result.message || 'Post submitted for review.', 'info');
    } catch (error) {
      setMessage(error.message || 'Unable to submit this post right now.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadExistingPost(postId) {
    if (!postId) {
      setStatusBadge({ label: 'Draft', tone: 'soft' });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/blogs/${postId}`);
      const result = await parseResponse(response);
      populateForm(result.post || {});
    } catch (error) {
      setMessage(error.message || 'Unable to load this draft.', 'error');
    } finally {
      setBusy(false);
    }
  }

  titleInput.addEventListener('input', () => {
    if (!state.slugLocked) {
      slugInput.value = slugify(titleInput.value);
    }
  });

  slugInput.addEventListener('input', () => {
    state.slugLocked = Boolean(slugInput.value.trim());
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  saveButton?.addEventListener('click', () => {
    saveDraft().catch(() => {});
  });

  submitButton?.addEventListener('click', () => {
    submitForReview();
  });

  loadExistingPost(state.currentPostId);
});
