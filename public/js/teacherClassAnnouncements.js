(function attachTeacherClassAnnouncements(global) {
    const state = {
        classItem: null,
        permissions: null,
        announcements: [],
        editingAnnouncementId: '',
        isSubmitting: false
    };

    const selectors = {
        title: 'teacherClassAnnouncementsTitle',
        subcopy: 'teacherClassAnnouncementsSubcopy',
        status: 'teacherClassAnnouncementsStatus',
        code: 'teacherClassAnnouncementsCode',
        access: 'teacherClassAnnouncementsAccess',
        composerPanel: 'teacherAnnouncementComposerPanel',
        composerForm: 'teacherAnnouncementComposerForm',
        composerTitleInput: 'teacherAnnouncementTitleInput',
        composerBodyInput: 'teacherAnnouncementBodyInput',
        composerSubmitButton: 'teacherAnnouncementSubmitButton',
        composerStatus: 'teacherAnnouncementComposerStatus',
        feedMeta: 'teacherAnnouncementsFeedMeta',
        list: 'teacherAnnouncementsList'
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    function setText(id, value) {
        const element = byId(id);
        if (element) {
            element.textContent = value;
        }
    }

    function setHtml(id, value) {
        const element = byId(id);
        if (element) {
            element.innerHTML = value;
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function trustedText(value) {
        return String(value ?? '');
    }

    function formatRole(role) {
        switch (String(role || '').toLowerCase()) {
        case 'teacher':
            return 'Teacher';
        case 'owner':
            return 'Owner';
        case 'co_teacher':
            return 'Co-Teacher';
        case 'teaching_assistant':
            return 'Teaching Assistant';
        case 'viewer':
            return 'Viewer';
        case 'student':
            return 'Student';
        case 'admin':
            return 'Admin';
        default:
            return 'Participant';
        }
    }

    function normalizeClassStatus(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['draft', 'active', 'archived'].includes(normalized)) {
            return normalized;
        }
        return 'active';
    }

    function formatClassStatus(value) {
        const normalized = normalizeClassStatus(value);
        if (normalized === 'draft') return 'Draft';
        if (normalized === 'archived') return 'Archived';
        return 'Active';
    }

    function classStatusBadgeClass(status) {
        const normalized = normalizeClassStatus(status);
        if (normalized === 'draft') return 'teacher-badge-draft';
        if (normalized === 'archived') return 'teacher-badge-muted';
        return 'teacher-badge-live';
    }

    function formatDateTime(value) {
        const timestamp = new Date(value || '').getTime();
        if (Number.isNaN(timestamp)) {
            return 'Unknown time';
        }

        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date(timestamp));
    }

    async function readJson(response) {
        try {
            return await response.json();
        } catch (_error) {
            return {};
        }
    }

    function buildTeacherLine(classItem) {
        const parts = [
            classItem.courseCode || 'Course code not set',
            classItem.section || '',
            classItem.academicTerm || ''
        ].filter(Boolean);
        return parts.join(' | ') || 'Class communication updates and student discussion.';
    }

    function renderHeader() {
        const classItem = state.classItem || {};
        const permissions = state.permissions || {};
        const normalizedStatus = normalizeClassStatus(classItem.status);
        const composerPanel = byId(selectors.composerPanel);

        setText(selectors.title, classItem.className || 'Announcements');
        setText(selectors.subcopy, buildTeacherLine(classItem));
        setText(selectors.status, formatClassStatus(normalizedStatus));
        setText(selectors.code, classItem.classCode || 'Class code unavailable');

        const statusBadge = byId(selectors.status);
        if (statusBadge) {
            statusBadge.className = `teacher-badge ${classStatusBadgeClass(normalizedStatus)}`;
        }

        const accessText = permissions.isReadOnly
            ? 'Read-only feed'
            : permissions.canPostAnnouncement
                ? permissions.currentRole === 'co_teacher'
                    ? 'Co-teacher posting enabled'
                    : 'Posting enabled'
                : 'View-only access';
        setText(selectors.access, accessText);

        const accessBadge = byId(selectors.access);
        if (accessBadge) {
            accessBadge.className = `teacher-badge ${
                permissions.canPostAnnouncement && !permissions.isReadOnly
                    ? 'teacher-badge-soft'
                    : 'teacher-badge-muted'
            }`;
        }

        if (composerPanel) {
            composerPanel.hidden = !permissions.canPostAnnouncement;
        }

        setText(
            selectors.composerStatus,
            permissions.canPostAnnouncement
                ? 'Post a plain-text announcement for students in this class.'
                : permissions.isReadOnly
                    ? 'This class is archived. The feed stays visible, but new posts are disabled.'
                    : 'You can view announcements here, but your class role does not allow new announcement posts.'
        );
    }

    function getCommentComposerMarkup(announcementId) {
        if (!state.permissions?.canComment) {
            return state.permissions?.isReadOnly
                ? '<p class="teacher-meta">Comments are locked because this class is archived.</p>'
                : '<p class="teacher-meta">Commenting is not available for your current class role.</p>';
        }

        return `
            <form class="teacher-announcement-comment-form" data-announcement-id="${escapeHtml(announcementId)}">
                <label class="teacher-announcement-comment-field">
                    <span class="teacher-field-label teacher-field-label-tight">Add a comment</span>
                    <textarea name="body" class="teacher-textarea teacher-announcement-comment-input" rows="2" maxlength="2500" required></textarea>
                </label>
                <div class="teacher-card-actions">
                    <button type="submit" class="teacher-btn teacher-btn-secondary teacher-btn-small">Post Comment</button>
                </div>
            </form>
        `;
    }

    function getCommentsMarkup(announcement) {
        if (!announcement.comments.length) {
            return '<p class="teacher-empty-state">No comments yet. Start the discussion with the first response.</p>';
        }

        return announcement.comments.map((comment) => `
            <article class="teacher-announcement-comment-card">
                <div class="teacher-announcement-comment-header">
                    <div>
                        <strong>${trustedText(comment.author.name)}</strong>
                        <span class="teacher-badge teacher-badge-soft">${escapeHtml(formatRole(comment.author.role))}</span>
                    </div>
                    <div class="teacher-announcement-comment-actions">
                        <span class="teacher-meta">${escapeHtml(formatDateTime(comment.createdAt))}</span>
                        ${comment.canDelete ? `
                            <button
                                type="button"
                                class="teacher-btn teacher-btn-secondary teacher-btn-small"
                                data-action="delete-comment"
                                data-announcement-id="${escapeHtml(announcement.id)}"
                                data-comment-id="${escapeHtml(comment.id)}">Delete</button>
                        ` : ''}
                    </div>
                </div>
                <p class="teacher-announcement-comment-body">${trustedText(comment.body)}</p>
            </article>
        `).join('');
    }

    function getAnnouncementCardMarkup(announcement) {
        const isEditing = state.editingAnnouncementId === announcement.id;
        const likeLabel = announcement.viewerHasLiked ? 'Unlike' : 'Like';
        const roleLabel = formatRole(announcement.author.role);

        if (isEditing) {
            return `
                <article class="teacher-announcement-card teacher-announcement-card-editing">
                    <form class="teacher-announcement-edit-form" data-announcement-id="${escapeHtml(announcement.id)}">
                        <label>
                            <span class="teacher-field-label">Title</span>
                            <input name="title" class="teacher-input" type="text" maxlength="160" value="${trustedText(announcement.title)}" required>
                        </label>
                        <label>
                            <span class="teacher-field-label">Message</span>
                            <textarea name="body" class="teacher-textarea" rows="4" maxlength="5000" required>${trustedText(announcement.body)}</textarea>
                        </label>
                        <div class="teacher-card-actions">
                            <button type="submit" class="teacher-btn teacher-btn-primary teacher-btn-small">Save</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="cancel-edit">Cancel</button>
                        </div>
                    </form>
                </article>
            `;
        }

        return `
            <article class="teacher-announcement-card">
                <div class="teacher-announcement-card-header">
                    <div>
                        <p class="teacher-announcement-title">${trustedText(announcement.title)}</p>
                        <div class="teacher-announcement-meta">
                            <span class="teacher-badge teacher-badge-soft">${escapeHtml(roleLabel)}</span>
                            <span class="teacher-meta">${trustedText(announcement.author.name)}</span>
                            <span class="teacher-meta">${escapeHtml(formatDateTime(announcement.createdAt))}</span>
                            ${announcement.updatedAt && announcement.updatedAt !== announcement.createdAt
                                ? `<span class="teacher-meta">Edited ${escapeHtml(formatDateTime(announcement.updatedAt))}</span>`
                                : ''}
                        </div>
                    </div>
                    ${(announcement.canEdit || announcement.canDelete) ? `
                        <div class="teacher-announcement-toolbar">
                            ${announcement.canEdit ? `
                                <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="edit-announcement" data-announcement-id="${escapeHtml(announcement.id)}">Edit</button>
                            ` : ''}
                            ${announcement.canDelete ? `
                                <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-action="delete-announcement" data-announcement-id="${escapeHtml(announcement.id)}">Delete</button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>

                <p class="teacher-announcement-body">${trustedText(announcement.body)}</p>

                <div class="teacher-announcement-engagement">
                    <button
                        type="button"
                        class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-announcement-like-button ${announcement.viewerHasLiked ? 'teacher-announcement-like-button-active' : ''}"
                        data-action="toggle-like"
                        data-announcement-id="${escapeHtml(announcement.id)}"
                        aria-pressed="${announcement.viewerHasLiked ? 'true' : 'false'}"
                        ${state.permissions?.canReact ? '' : 'disabled'}>
                        ${likeLabel} (${escapeHtml(String(announcement.likeCount || 0))})
                    </button>
                    <span class="teacher-meta">${escapeHtml(String(announcement.commentCount || 0))} comment(s)</span>
                </div>

                <div class="teacher-announcement-comments">
                    <div class="teacher-announcement-comments-list">
                        ${getCommentsMarkup(announcement)}
                    </div>
                    ${getCommentComposerMarkup(announcement.id)}
                </div>
            </article>
        `;
    }

    function renderFeed() {
        const list = byId(selectors.list);
        if (!list) {
            return;
        }

        setText(
            selectors.feedMeta,
            state.announcements.length
                ? `Showing ${state.announcements.length} announcement(s) for this class.`
                : 'No announcements have been posted for this class yet.'
        );

        if (!state.announcements.length) {
            list.innerHTML = '<p class="teacher-empty-state">No announcements have been posted yet.</p>';
            return;
        }

        list.innerHTML = state.announcements.map((announcement) => getAnnouncementCardMarkup(announcement)).join('');
    }

    async function loadClassItem() {
        const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}`, {
            credentials: 'include',
            cache: 'no-store'
        });
        const data = await readJson(response);
        if (!response.ok || !data.success || !data.classItem) {
            throw new Error(data.message || 'Unable to load class details.');
        }
        state.classItem = data.classItem;
    }

    async function loadFeed() {
        const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements`, {
            credentials: 'include',
            cache: 'no-store'
        });
        const data = await readJson(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to load announcements.');
        }

        state.permissions = data.permissions || {};
        state.announcements = Array.isArray(data.announcements) ? data.announcements : [];
        renderHeader();
        renderFeed();
    }

    async function loadPage() {
        try {
            await loadClassItem();
            await loadFeed();
            renderHeader();
        } catch (error) {
            console.error('Teacher class announcements failed to load:', error);
            setText(selectors.title, 'Announcements');
            setText(selectors.subcopy, error.message || 'Unable to load this class feed right now.');
            setText(selectors.feedMeta, error.message || 'Unable to load this class feed right now.');
            setHtml(selectors.list, `<p class="teacher-empty-state">${escapeHtml(error.message || 'Unable to load this class feed right now.')}</p>`);
            const composerPanel = byId(selectors.composerPanel);
            if (composerPanel) {
                composerPanel.hidden = true;
            }
        }
    }

    function setSubmitting(isSubmitting) {
        state.isSubmitting = isSubmitting;
        const submitButton = byId(selectors.composerSubmitButton);
        if (submitButton) {
            submitButton.disabled = isSubmitting;
            submitButton.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
        }
    }

    async function submitAnnouncement(event) {
        event.preventDefault();
        if (state.isSubmitting) {
            return;
        }

        const titleInput = byId(selectors.composerTitleInput);
        const bodyInput = byId(selectors.composerBodyInput);
        const title = titleInput?.value.trim() || '';
        const body = bodyInput?.value.trim() || '';

        if (!title || !body) {
            setText(selectors.composerStatus, 'Announcement title and message are required.');
            return;
        }

        setSubmitting(true);
        setText(selectors.composerStatus, 'Posting announcement...');

        try {
            const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ title, body })
            });
            const data = await readJson(response);
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to post announcement.');
            }

            if (titleInput) titleInput.value = '';
            if (bodyInput) bodyInput.value = '';
            setText(selectors.composerStatus, data.message || 'Announcement posted successfully.');
            await loadFeed();
        } catch (error) {
            console.error('Unable to post teacher announcement:', error);
            setText(selectors.composerStatus, error.message || 'Unable to post announcement.');
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteAnnouncement(announcementId) {
        const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements/${encodeURIComponent(announcementId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await readJson(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to delete announcement.');
        }
    }

    async function saveAnnouncementEdit(form) {
        const announcementId = form.dataset.announcementId || '';
        const title = form.elements.title?.value.trim() || '';
        const body = form.elements.body?.value.trim() || '';
        if (!title || !body) {
            throw new Error('Announcement title and message are required.');
        }

        const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements/${encodeURIComponent(announcementId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, body })
        });
        const data = await readJson(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to update announcement.');
        }
    }

    async function submitComment(form) {
        const announcementId = form.dataset.announcementId || '';
        const body = form.elements.body?.value.trim() || '';
        if (!body) {
            throw new Error('Comment body is required.');
        }

        const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements/${encodeURIComponent(announcementId)}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ body })
        });
        const data = await readJson(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to post comment.');
        }
    }

    async function deleteComment(announcementId, commentId) {
        const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements/${encodeURIComponent(announcementId)}/comments/${encodeURIComponent(commentId)}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await readJson(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to delete comment.');
        }
    }

    async function toggleLike(announcementId) {
        const response = await fetch(`/api/classes/${encodeURIComponent(getClassId())}/announcements/${encodeURIComponent(announcementId)}/reactions/like`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await readJson(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to update like.');
        }
    }

    async function handleListClick(event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.action;
        const announcementId = actionButton.dataset.announcementId || '';
        const commentId = actionButton.dataset.commentId || '';

        try {
            if (action === 'edit-announcement') {
                state.editingAnnouncementId = announcementId;
                renderFeed();
                return;
            }

            if (action === 'cancel-edit') {
                state.editingAnnouncementId = '';
                renderFeed();
                return;
            }

            if (action === 'delete-announcement') {
                await deleteAnnouncement(announcementId);
                state.editingAnnouncementId = '';
                await loadFeed();
                return;
            }

            if (action === 'delete-comment') {
                await deleteComment(announcementId, commentId);
                await loadFeed();
                return;
            }

            if (action === 'toggle-like') {
                await toggleLike(announcementId);
                await loadFeed();
            }
        } catch (error) {
            console.error('Teacher announcement action failed:', error);
            setText(selectors.feedMeta, error.message || 'Unable to update the announcement feed right now.');
        }
    }

    async function handleListSubmit(event) {
        const editForm = event.target.closest('.teacher-announcement-edit-form');
        const commentForm = event.target.closest('.teacher-announcement-comment-form');
        if (!editForm && !commentForm) {
            return;
        }

        event.preventDefault();

        try {
            if (editForm) {
                await saveAnnouncementEdit(editForm);
                state.editingAnnouncementId = '';
                await loadFeed();
                return;
            }

            if (commentForm) {
                await submitComment(commentForm);
                commentForm.reset();
                await loadFeed();
            }
        } catch (error) {
            console.error('Teacher announcement form failed:', error);
            setText(selectors.feedMeta, error.message || 'Unable to submit this update right now.');
        }
    }

    function bindEvents() {
        const composerForm = byId(selectors.composerForm);
        const list = byId(selectors.list);

        if (composerForm) {
            composerForm.addEventListener('submit', submitAnnouncement);
        }

        if (list) {
            list.addEventListener('click', (event) => {
                handleListClick(event);
            });
            list.addEventListener('submit', (event) => {
                handleListSubmit(event);
            });
        }
    }

    function init() {
        bindEvents();
        loadPage();
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherClassAnnouncements = { init };
})(window);
