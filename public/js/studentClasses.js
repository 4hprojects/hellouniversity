(function attachStudentClasses(global) {
    const state = {
        detailClassItem: null,
        detailAnnouncementPermissions: null,
        detailAnnouncements: []
    };

    const selectors = {
        indexPage: 'studentClassesPage',
        detailPage: 'studentClassDetailPage',
        indexName: 'studentClassesName',
        indexRolePill: 'studentClassesRolePill',
        indexIdLine: 'studentClassesIdLine',
        indexHeroStatus: 'studentClassesHeroStatus',
        indexJoinedCount: 'studentClassesJoinedCount',
        indexActiveCount: 'studentClassesActiveCount',
        indexWithActivitiesCount: 'studentClassesWithActivitiesCount',
        indexOverdueCount: 'studentClassesOverdueCount',
        indexResultsMeta: 'studentClassesResultsMeta',
        indexGrid: 'studentClassesGrid',
        joinForm: 'studentClassesJoinForm',
        joinInput: 'studentClassesJoinCode',
        joinButton: 'studentClassesJoinButton',
        joinStatus: 'studentClassesJoinStatus',
        detailTitle: 'studentClassTitle',
        detailDescription: 'studentClassDescription',
        detailStatusPill: 'studentClassStatusPill',
        detailTeacherLine: 'studentClassTeacherLine',
        detailScheduleLine: 'studentClassScheduleLine',
        detailActivityCount: 'studentClassActivityCount',
        detailSubmittedCount: 'studentClassSubmittedCount',
        detailOverdueCount: 'studentClassOverdueCount',
        detailNextDue: 'studentClassNextDue',
        detailNextDueMeta: 'studentClassNextDueMeta',
        detailResultsMeta: 'studentClassResultsMeta',
        detailActivitiesList: 'studentClassActivitiesList',
        detailFacts: 'studentClassFacts',
        detailNote: 'studentClassNote',
        detailAnnouncementsMeta: 'studentClassAnnouncementsMeta',
        detailAnnouncementsList: 'studentClassAnnouncementsList'
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = byId(id);
        if (element) {
            element.textContent = value;
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

    function toTimestamp(value) {
        const timestamp = new Date(value || '').getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function formatDateTime(value, fallback) {
        const timestamp = toTimestamp(value);
        if (!timestamp) {
            return fallback || 'N/A';
        }

        return new Intl.DateTimeFormat('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date(timestamp));
    }

    function formatScore(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return 'N/A';
        }

        return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
    }

    function formatClassStatus(value) {
        const normalized = normalizeClassStatus(value);
        if (normalized === 'archived') {
            return 'Archived';
        }
        if (normalized === 'draft') {
            return 'Draft';
        }
        return 'Active';
    }

    function normalizeClassStatus(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (['draft', 'active', 'archived'].includes(normalized)) {
            return normalized;
        }
        return 'active';
    }

    function trustedText(value) {
        return String(value ?? '');
    }

    function formatRole(value) {
        switch (String(value || '').trim().toLowerCase()) {
        case 'teacher':
            return 'Teacher';
        case 'student':
            return 'Student';
        case 'admin':
            return 'Admin';
        default:
            return 'Participant';
        }
    }

    function readPageData(id) {
        const page = byId(id);
        if (!page) {
            return null;
        }

        return {
            element: page,
            studentName: page.dataset.studentName || 'Student',
            studentId: page.dataset.studentId || '',
            studentRole: page.dataset.studentRole || 'student',
            classId: page.dataset.classId || ''
        };
    }

    async function readJsonResponse(response) {
        try {
            return await response.json();
        } catch (_error) {
            return {};
        }
    }

    function getClassStatusBadgeMarkup(status) {
        const normalized = normalizeClassStatus(status);
        return `
            <span class="student-badge classes-class-status classes-class-status-${escapeHtml(normalized)}">
                ${escapeHtml(formatClassStatus(normalized))}
            </span>
        `;
    }

    function getIndexClassCardMarkup(classItem) {
        const scheduleText = [classItem.schedule, classItem.time].filter(Boolean).join(' | ');
        const nextDueText = classItem.nextDueAt
            ? `Next due ${formatDateTime(classItem.nextDueAt, 'No due activity')}`
            : 'No due activity yet';

        return `
            <a href="/classes/${encodeURIComponent(classItem.classId)}" class="classes-class-card">
                <div class="classes-class-card-header">
                    <div class="classes-class-card-title">
                        <h3>${escapeHtml(classItem.classCode)} - ${escapeHtml(classItem.className)}</h3>
                        <p class="student-meta">${escapeHtml(classItem.courseCode || 'Joined class workspace')}</p>
                    </div>
                    ${getClassStatusBadgeMarkup(classItem.status)}
                </div>

                <div class="classes-class-card-meta">
                    <div class="classes-meta-line">
                        <span class="material-icons" aria-hidden="true">co_present</span>
                        <p class="student-meta">${escapeHtml(classItem.instructorName || 'Instructor unavailable')}</p>
                    </div>
                    <div class="classes-meta-line">
                        <span class="material-icons" aria-hidden="true">schedule</span>
                        <p class="student-meta">${escapeHtml(scheduleText || 'Schedule not available')}</p>
                    </div>
                </div>

                <div class="classes-card-summary">
                    <div class="classes-summary-item">
                        <strong>${escapeHtml(String(classItem.activityCount || 0))}</strong>
                        <span>Activities</span>
                    </div>
                    <div class="classes-summary-item">
                        <strong>${escapeHtml(String(classItem.submittedCount || 0))}</strong>
                        <span>Submitted</span>
                    </div>
                    <div class="classes-summary-item">
                        <strong>${escapeHtml(String(classItem.overdueCount || 0))}</strong>
                        <span>Overdue</span>
                    </div>
                </div>

                <div class="classes-class-card-footer">
                    <p class="classes-card-next-due">${escapeHtml(nextDueText)}</p>
                    <span class="classes-card-open">
                        <span>Open class</span>
                        <span class="material-icons" aria-hidden="true">arrow_forward</span>
                    </span>
                </div>
            </a>
        `;
    }

    function renderIndexEmptyState(message) {
        const container = byId(selectors.indexGrid);
        if (!container) {
            return;
        }

        container.innerHTML = `<p class="student-empty-state">${escapeHtml(message)}</p>`;
    }

    function renderIndexSummary(summary) {
        setText(selectors.indexJoinedCount, String(summary?.joinedClassCount || 0));
        setText(selectors.indexActiveCount, String(summary?.activeClassCount || 0));
        setText(selectors.indexWithActivitiesCount, String(summary?.classesWithActivitiesCount || 0));
        setText(selectors.indexOverdueCount, String(summary?.overdueActivityCount || 0));
    }

    function renderJoinStatus(message, tone) {
        const container = byId(selectors.joinStatus);
        if (!container) {
            return;
        }

        const resolvedTone = ['success', 'error', 'info'].includes(tone) ? tone : 'info';
        container.hidden = !message;
        container.className = `student-status student-status-${resolvedTone}`;
        container.textContent = message || '';
    }

    function setJoinPending(isPending) {
        const button = byId(selectors.joinButton);
        const input = byId(selectors.joinInput);

        if (button) {
            button.disabled = isPending;
            button.setAttribute('aria-busy', isPending ? 'true' : 'false');
        }

        if (input) {
            input.disabled = isPending;
        }
    }

    async function loadClassesIndex() {
        const page = readPageData(selectors.indexPage);
        if (!page) {
            return;
        }

        try {
            const response = await fetch('/api/student/classes', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to load classes right now.');
            }

            setText(selectors.indexName, page.studentName);
            setText(selectors.indexRolePill, page.studentRole);
            setText(selectors.indexIdLine, `Student ID: ${page.studentId || 'N/A'}`);
            setText(selectors.indexHeroStatus, `${data.summary.joinedClassCount} class(es) currently loaded.`);
            setText(
                selectors.indexResultsMeta,
                data.classes.length
                    ? `Showing ${data.classes.length} joined class workspace(s).`
                    : 'No joined classes were found for your account.'
            );
            renderIndexSummary(data.summary);

            const container = byId(selectors.indexGrid);
            if (!container) {
                return;
            }

            if (!Array.isArray(data.classes) || !data.classes.length) {
                renderIndexEmptyState('You have not joined any classes yet. Use the join form above when you receive a class code.');
                return;
            }

            container.innerHTML = data.classes.map((classItem) => getIndexClassCardMarkup(classItem)).join('');
        } catch (error) {
            console.error('Student classes page failed to load:', error);
            setText(selectors.indexHeroStatus, error.message || 'Unable to load classes right now.');
            setText(selectors.indexResultsMeta, error.message || 'Unable to load classes right now.');
            renderIndexSummary({});
            renderIndexEmptyState(error.message || 'Unable to load classes right now.');
        }
    }

    async function handleIndexJoinSubmit(event) {
        event.preventDefault();

        const input = byId(selectors.joinInput);
        if (!input) {
            return;
        }

        const classCode = input.value.trim().toUpperCase();
        if (!classCode) {
            renderJoinStatus('Enter a class code to join.', 'error');
            input.focus();
            return;
        }

        setJoinPending(true);
        renderJoinStatus('Joining class...', 'info');

        try {
            const response = await fetch('/api/classes/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ classCode })
            });
            const data = await readJsonResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Unable to join class.');
            }

            input.value = '';
            renderJoinStatus(
                data.message || 'Class joined successfully.',
                data.alreadyJoined ? 'info' : 'success'
            );
            await loadClassesIndex();
        } catch (error) {
            console.error('Unable to join class from classes page:', error);
            renderJoinStatus(error.message || 'Unable to join class right now.', 'error');
        } finally {
            setJoinPending(false);
        }
    }

    function getActivityStatusPillMarkup(row) {
        return `<span class="classes-status-pill classes-status-pill-${escapeHtml(row.category || 'available')}">${escapeHtml(row.status || 'Not Started')}</span>`;
    }

    function getActivityActionMarkup(row) {
        if (row.category === 'scheduled' || !row.actionUrl) {
            return '<span class="student-btn student-btn-secondary classes-action-btn classes-action-btn-disabled" aria-disabled="true">Not Open Yet</span>';
        }

        return `
            <a href="${escapeHtml(row.actionUrl)}" class="student-btn student-btn-secondary classes-action-btn">
                <span class="material-icons" aria-hidden="true">launch</span>
                <span>Open Quiz</span>
            </a>
        `;
    }

    function getDetailActivityCardMarkup(row) {
        const attemptLabel = row.maxAttempts
            ? `${row.completedAttemptCount} of ${row.maxAttempts} completed`
            : `${row.attemptCount} attempt${row.attemptCount === 1 ? '' : 's'}`;

        return `
            <article class="classes-activity-card">
                <div class="classes-activity-header">
                    <div>
                        <strong>${escapeHtml(row.quizTitle || 'Untitled Quiz')}</strong>
                        <p class="student-meta">${escapeHtml(row.quizDescription || 'No description provided.')}</p>
                    </div>
                    ${getActivityStatusPillMarkup(row)}
                </div>

                <dl class="classes-activity-grid">
                    <div>
                        <dt>Due</dt>
                        <dd>${escapeHtml(formatDateTime(row.dueDate, 'No due date'))}</dd>
                    </div>
                    <div>
                        <dt>Start</dt>
                        <dd>${escapeHtml(formatDateTime(row.startDate, 'Available now'))}</dd>
                    </div>
                    <div>
                        <dt>Questions</dt>
                        <dd>${escapeHtml(String(row.questionCount || 0))}</dd>
                    </div>
                    <div>
                        <dt>Score</dt>
                        <dd>${escapeHtml(formatScore(row.finalScore))}</dd>
                    </div>
                </dl>

                <div class="classes-activity-footer">
                    ${getActivityActionMarkup(row)}
                    <p class="student-meta">
                        ${escapeHtml(attemptLabel)}
                        ${row.latestAttemptAt ? ` | Last activity ${escapeHtml(formatDateTime(row.latestAttemptAt, ''))}` : ''}
                    </p>
                </div>
            </article>
        `;
    }

    function renderDetailFacts(classItem) {
        const container = byId(selectors.detailFacts);
        if (!container) {
            return;
        }

        const facts = [
            { label: 'Teacher', value: classItem.instructorName || 'Instructor unavailable' },
            { label: 'Class Code', value: classItem.classCode || 'Class' },
            { label: 'Status', value: formatClassStatus(classItem.status) },
            { label: 'Schedule', value: [classItem.schedule, classItem.time].filter(Boolean).join(' | ') || 'Schedule not available' }
        ];

        if (classItem.courseCode) {
            facts.push({ label: 'Course Code', value: classItem.courseCode });
        }
        if (classItem.section) {
            facts.push({ label: 'Section', value: classItem.section });
        }
        if (classItem.academicTerm) {
            facts.push({ label: 'Academic Term', value: classItem.academicTerm });
        }
        if (classItem.room) {
            facts.push({ label: 'Room', value: classItem.room });
        }

        container.innerHTML = facts.map((fact) => `
            <article class="classes-fact-item">
                <strong>${escapeHtml(fact.label)}</strong>
                <span>${escapeHtml(fact.value)}</span>
            </article>
        `).join('');
    }

    function renderDetailActivities(activities) {
        const container = byId(selectors.detailActivitiesList);
        if (!container) {
            return;
        }

        if (!Array.isArray(activities) || !activities.length) {
            container.innerHTML = '<p class="student-empty-state">No visible activities are assigned to this class yet.</p>';
            return;
        }

        container.innerHTML = activities.map((activity) => getDetailActivityCardMarkup(activity)).join('');
    }

    function getAnnouncementCommentsMarkup(announcement) {
        if (!announcement.comments.length) {
            return '<p class="student-empty-state">No comments yet. Be the first to respond.</p>';
        }

        return announcement.comments.map((comment) => `
            <article class="classes-announcement-comment-card">
                <div class="classes-announcement-comment-header">
                    <div>
                        <strong>${trustedText(comment.author.name)}</strong>
                        <span class="student-badge classes-announcement-role">${escapeHtml(formatRole(comment.author.role))}</span>
                    </div>
                    <div class="classes-announcement-comment-actions">
                        <span class="student-meta">${escapeHtml(formatDateTime(comment.createdAt, 'Unknown time'))}</span>
                        ${comment.canDelete ? `
                            <button
                                type="button"
                                class="student-btn student-btn-secondary classes-announcement-inline-btn"
                                data-action="delete-comment"
                                data-announcement-id="${escapeHtml(announcement.id)}"
                                data-comment-id="${escapeHtml(comment.id)}">Delete</button>
                        ` : ''}
                    </div>
                </div>
                <p class="classes-announcement-comment-body">${trustedText(comment.body)}</p>
            </article>
        `).join('');
    }

    function getAnnouncementCommentFormMarkup(announcementId) {
        if (!state.detailAnnouncementPermissions?.canComment) {
            return state.detailAnnouncementPermissions?.isReadOnly
                ? '<p class="student-meta">This class is archived. New comments are disabled.</p>'
                : '<p class="student-meta">Only enrolled students and the class owner can comment here.</p>';
        }

        return `
            <form class="classes-announcement-comment-form" data-announcement-id="${escapeHtml(announcementId)}">
                <label class="classes-announcement-comment-field">
                    <span class="student-kpi-label">Add a comment</span>
                    <textarea name="body" rows="2" maxlength="2500" class="classes-announcement-comment-input" required></textarea>
                </label>
                <div class="classes-announcement-actions">
                    <button type="submit" class="student-btn student-btn-secondary classes-announcement-inline-btn">Post Comment</button>
                </div>
            </form>
        `;
    }

    function getAnnouncementCardMarkup(announcement) {
        const likeLabel = announcement.viewerHasLiked ? 'Unlike' : 'Like';

        return `
            <article class="classes-announcement-card">
                <div class="classes-announcement-header">
                    <div>
                        <h3>${trustedText(announcement.title)}</h3>
                        <div class="classes-announcement-meta">
                            <span class="student-badge classes-announcement-role">${escapeHtml(formatRole(announcement.author.role))}</span>
                            <span class="student-meta">${trustedText(announcement.author.name)}</span>
                            <span class="student-meta">${escapeHtml(formatDateTime(announcement.createdAt, 'Unknown time'))}</span>
                            ${announcement.updatedAt && announcement.updatedAt !== announcement.createdAt
                                ? `<span class="student-meta">Edited ${escapeHtml(formatDateTime(announcement.updatedAt, 'Unknown time'))}</span>`
                                : ''}
                        </div>
                    </div>
                </div>

                <p class="classes-announcement-body">${trustedText(announcement.body)}</p>

                <div class="classes-announcement-engagement">
                    <button
                        type="button"
                        class="student-btn student-btn-secondary classes-announcement-inline-btn ${announcement.viewerHasLiked ? 'classes-announcement-like-active' : ''}"
                        data-action="toggle-like"
                        data-announcement-id="${escapeHtml(announcement.id)}"
                        aria-pressed="${announcement.viewerHasLiked ? 'true' : 'false'}"
                        ${state.detailAnnouncementPermissions?.canReact ? '' : 'disabled'}>
                        ${likeLabel} (${escapeHtml(String(announcement.likeCount || 0))})
                    </button>
                    <span class="student-meta">${escapeHtml(String(announcement.commentCount || 0))} comment(s)</span>
                </div>

                <div class="classes-announcement-comments">
                    <div class="classes-announcement-comments-list">
                        ${getAnnouncementCommentsMarkup(announcement)}
                    </div>
                    ${getAnnouncementCommentFormMarkup(announcement.id)}
                </div>
            </article>
        `;
    }

    function renderDetailAnnouncements() {
        const container = byId(selectors.detailAnnouncementsList);
        if (!container) {
            return;
        }

        if (!state.detailAnnouncements.length) {
            container.innerHTML = '<p class="student-empty-state">No announcements have been posted for this class yet.</p>';
            return;
        }

        container.innerHTML = state.detailAnnouncements.map((announcement) => getAnnouncementCardMarkup(announcement)).join('');
    }

    async function loadAnnouncementFeed(classId) {
        const response = await fetch(`/api/classes/${encodeURIComponent(classId)}/announcements`, {
            credentials: 'include',
            cache: 'no-store'
        });
        const data = await readJsonResponse(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to load announcements right now.');
        }

        state.detailAnnouncementPermissions = data.permissions || {};
        state.detailAnnouncements = Array.isArray(data.announcements) ? data.announcements : [];
        setText(
            selectors.detailAnnouncementsMeta,
            state.detailAnnouncements.length
                ? `Showing ${state.detailAnnouncements.length} announcement(s) for this class.`
                : 'No announcements have been posted for this class yet.'
        );
        renderDetailAnnouncements();
    }

    function applyStatusPill(status) {
        const element = byId(selectors.detailStatusPill);
        if (!element) {
            return;
        }

        const normalized = normalizeClassStatus(status);
        element.className = `student-badge classes-class-status classes-class-status-${normalized}`;
        element.textContent = formatClassStatus(normalized);
    }

    function renderDetail(data) {
        const classItem = data.classItem || {};
        const summary = data.summary || {};
        const activities = Array.isArray(data.activities) ? data.activities : [];
        const scheduleText = [classItem.schedule, classItem.time].filter(Boolean).join(' | ') || 'Schedule not available';
        const description = classItem.description || 'Use this class workspace to review assigned activities and class details in one place.';
        state.detailClassItem = classItem;

        setText(selectors.detailTitle, `${classItem.classCode || 'Class'} - ${classItem.className || 'Class name unavailable'}`);
        setText(selectors.detailDescription, description);
        setText(selectors.detailTeacherLine, `Teacher: ${classItem.instructorName || 'Instructor unavailable'}`);
        setText(selectors.detailScheduleLine, scheduleText);
        applyStatusPill(classItem.status);

        setText(selectors.detailActivityCount, String(summary.activityCount || 0));
        setText(selectors.detailSubmittedCount, String(summary.submittedCount || 0));
        setText(selectors.detailOverdueCount, String(summary.overdueCount || 0));
        setText(
            selectors.detailNextDue,
            summary.nextDue ? formatDateTime(summary.nextDue.dueDate, 'No upcoming due activity') : 'No upcoming due activity'
        );
        setText(
            selectors.detailNextDueMeta,
            summary.nextDue ? summary.nextDue.quizTitle || 'Upcoming activity' : 'This class currently has no upcoming due activity.'
        );
        setText(
            selectors.detailResultsMeta,
            activities.length
                ? `Showing ${activities.length} visible activity item(s) for this class.`
                : 'No activities are assigned to this class yet.'
        );

        renderDetailFacts(classItem);
        renderDetailActivities(activities);

        const note = activities.length
            ? normalizeClassStatus(classItem.status) === 'archived'
                ? 'This class is archived. Existing activity history is still available here.'
                : 'Use this page as your focused class hub for assigned work and quick student links.'
            : 'No visible activities are assigned to this class yet. Check back later or review the rest of your student workspace.';
        setText(selectors.detailNote, note);
    }

    function renderDetailError(message) {
        setText(selectors.detailTitle, 'Class not found');
        setText(selectors.detailDescription, message || 'This class is not available in your student workspace.');
        setText(selectors.detailTeacherLine, 'Teacher: Unavailable');
        setText(selectors.detailScheduleLine, 'Schedule not available');
        applyStatusPill('archived');
        setText(selectors.detailActivityCount, '0');
        setText(selectors.detailSubmittedCount, '0');
        setText(selectors.detailOverdueCount, '0');
        setText(selectors.detailNextDue, 'Unavailable');
        setText(selectors.detailNextDueMeta, message || 'Unable to load this class right now.');
        setText(selectors.detailResultsMeta, message || 'Unable to load this class right now.');
        setText(selectors.detailNote, message || 'Return to your classes hub and choose another class.');

        const activitiesContainer = byId(selectors.detailActivitiesList);
        if (activitiesContainer) {
            activitiesContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load this class right now.')}</p>`;
        }

        const factsContainer = byId(selectors.detailFacts);
        if (factsContainer) {
            factsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load class facts right now.')}</p>`;
        }

        const announcementsContainer = byId(selectors.detailAnnouncementsList);
        if (announcementsContainer) {
            announcementsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(message || 'Unable to load announcements right now.')}</p>`;
        }
        setText(selectors.detailAnnouncementsMeta, message || 'Unable to load announcements right now.');
    }

    async function loadClassDetail() {
        const page = readPageData(selectors.detailPage);
        if (!page || !page.classId) {
            renderDetailError('Class not found.');
            return;
        }

        try {
            const [detailResponse, announcementResponse] = await Promise.all([
                fetch(`/api/student/classes/${encodeURIComponent(page.classId)}`, {
                    credentials: 'include',
                    cache: 'no-store'
                }),
                fetch(`/api/classes/${encodeURIComponent(page.classId)}/announcements`, {
                    credentials: 'include',
                    cache: 'no-store'
                })
            ]);
            const data = await readJsonResponse(detailResponse);
            const announcementsData = await readJsonResponse(announcementResponse);

            if (!detailResponse.ok || !data.success) {
                throw new Error(data.message || 'Unable to load this class right now.');
            }

            renderDetail(data);
            if (!announcementResponse.ok || !announcementsData.success) {
                setText(selectors.detailAnnouncementsMeta, announcementsData.message || 'Unable to load announcements right now.');
                const announcementsContainer = byId(selectors.detailAnnouncementsList);
                if (announcementsContainer) {
                    announcementsContainer.innerHTML = `<p class="student-empty-state">${escapeHtml(announcementsData.message || 'Unable to load announcements right now.')}</p>`;
                }
                return;
            }

            state.detailAnnouncementPermissions = announcementsData.permissions || {};
            state.detailAnnouncements = Array.isArray(announcementsData.announcements) ? announcementsData.announcements : [];
            setText(
                selectors.detailAnnouncementsMeta,
                state.detailAnnouncements.length
                    ? `Showing ${state.detailAnnouncements.length} announcement(s) for this class.`
                    : 'No announcements have been posted for this class yet.'
            );
            renderDetailAnnouncements();
        } catch (error) {
            console.error('Student class detail failed to load:', error);
            renderDetailError(error.message || 'Unable to load this class right now.');
        }
    }

    async function deleteAnnouncementComment(announcementId, commentId) {
        const page = readPageData(selectors.detailPage);
        const response = await fetch(
            `/api/classes/${encodeURIComponent(page.classId)}/announcements/${encodeURIComponent(announcementId)}/comments/${encodeURIComponent(commentId)}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );
        const data = await readJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to delete comment.');
        }
    }

    async function submitAnnouncementComment(announcementId, body) {
        const page = readPageData(selectors.detailPage);
        const response = await fetch(
            `/api/classes/${encodeURIComponent(page.classId)}/announcements/${encodeURIComponent(announcementId)}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ body })
            }
        );
        const data = await readJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to post comment.');
        }
    }

    async function toggleAnnouncementLike(announcementId) {
        const page = readPageData(selectors.detailPage);
        const response = await fetch(
            `/api/classes/${encodeURIComponent(page.classId)}/announcements/${encodeURIComponent(announcementId)}/reactions/like`,
            {
                method: 'POST',
                credentials: 'include'
            }
        );
        const data = await readJsonResponse(response);
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to update like.');
        }
    }

    async function handleDetailAnnouncementClick(event) {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton) {
            return;
        }

        const action = actionButton.dataset.action;
        const announcementId = actionButton.dataset.announcementId || '';
        const commentId = actionButton.dataset.commentId || '';

        try {
            if (action === 'toggle-like') {
                await toggleAnnouncementLike(announcementId);
                await loadAnnouncementFeed(readPageData(selectors.detailPage)?.classId || '');
                return;
            }

            if (action === 'delete-comment') {
                await deleteAnnouncementComment(announcementId, commentId);
                await loadAnnouncementFeed(readPageData(selectors.detailPage)?.classId || '');
            }
        } catch (error) {
            console.error('Student announcement action failed:', error);
            setText(selectors.detailAnnouncementsMeta, error.message || 'Unable to update announcements right now.');
        }
    }

    async function handleDetailAnnouncementSubmit(event) {
        const commentForm = event.target.closest('.classes-announcement-comment-form');
        if (!commentForm) {
            return;
        }

        event.preventDefault();
        const announcementId = commentForm.dataset.announcementId || '';
        const body = commentForm.elements.body?.value.trim() || '';
        if (!body) {
            setText(selectors.detailAnnouncementsMeta, 'Comment body is required.');
            return;
        }

        try {
            await submitAnnouncementComment(announcementId, body);
            commentForm.reset();
            await loadAnnouncementFeed(readPageData(selectors.detailPage)?.classId || '');
        } catch (error) {
            console.error('Student announcement comment failed:', error);
            setText(selectors.detailAnnouncementsMeta, error.message || 'Unable to post comment right now.');
        }
    }

    function bindIndexJoinForm() {
        const joinForm = byId(selectors.joinForm);
        const joinInput = byId(selectors.joinInput);

        if (joinForm) {
            joinForm.addEventListener('submit', handleIndexJoinSubmit);
        }

        if (joinInput) {
            joinInput.addEventListener('input', () => {
                joinInput.value = joinInput.value.toUpperCase();
            });
        }
    }

    function init() {
        if (byId(selectors.indexPage)) {
            bindIndexJoinForm();
            loadClassesIndex();
        }

        if (byId(selectors.detailPage)) {
            const announcementsList = byId(selectors.detailAnnouncementsList);
            if (announcementsList) {
                announcementsList.addEventListener('click', (event) => {
                    handleDetailAnnouncementClick(event);
                });
                announcementsList.addEventListener('submit', (event) => {
                    handleDetailAnnouncementSubmit(event);
                });
            }
            loadClassDetail();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})(window);
