(function attachTeacherClassEditor(global) {
    const TERM_OPTIONS = {
        semester: ['First Semester', 'Second Semester', 'Mid Year Term'],
        trimester: ['Trimester 1', 'Trimester 2', 'Trimester 3'],
        quarter: ['First Quarter', 'Second Quarter', 'Third Quarter', 'Fourth Quarter']
    };

    const DAY_OPTIONS = [
        { code: 'SUN', label: 'Sun' },
        { code: 'MON', label: 'Mon' },
        { code: 'TUE', label: 'Tue' },
        { code: 'WED', label: 'Wed' },
        { code: 'THU', label: 'Thu' },
        { code: 'FRI', label: 'Fri' },
        { code: 'SAT', label: 'Sat' }
    ];

    function init() {
        const form = document.getElementById('teacherClassForm');
        if (!form) return;

        form.addEventListener('submit', handleSubmit);
        document.getElementById('teacherSaveDraftButton')?.addEventListener('click', () => saveClass('draft'));
        document.getElementById('teacherRegenerateCodeButton')?.addEventListener('click', regenerateCode);
        document.getElementById('teacherTermSystem')?.addEventListener('change', handleTermSystemChange);

        renderAcademicTermOptions('', '');

        if (getMode() === 'edit' && getClassId()) {
            loadClass();
        }
    }

    function getMode() {
        return document.body?.dataset?.classMode || 'create';
    }

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    async function loadClass() {
        setStatus('Loading class details...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success || !data.classItem) {
                throw new Error(data.message || 'Failed to load class.');
            }

            fillForm(data.classItem);
            setStatus('Class details loaded.');
        } catch (error) {
            console.error('Teacher class editor load failed:', error);
            setStatus(error.message || 'Unable to load class details.');
        }
    }

    function fillForm(classItem) {
        setValue('teacherClassName', classItem.className);
        setValue('teacherCourseCode', classItem.courseCode);
        const termSystem = inferTermSystem(classItem.termSystem, classItem.academicTerm);
        setValue('teacherTermSystem', termSystem);
        renderAcademicTermOptions(termSystem, classItem.academicTerm);
        setValue('teacherSection', classItem.section);
        setScheduleDaySelection(classItem.scheduleDayCodes, classItem.scheduleDays);
        setMeetingTimes(classItem.scheduleTimeFrom, classItem.scheduleTimeTo, classItem.scheduleTime);
        setValue('teacherRoom', classItem.room);
        setValue('teacherSubjectDescription', classItem.subjectDescription);
        setValue('teacherClassDescription', classItem.description);
        const checkbox = document.getElementById('teacherSelfEnrollmentEnabled');
        if (checkbox) checkbox.checked = classItem.selfEnrollmentEnabled !== false;
        setText('teacherClassCodePill', classItem.classCode || 'Join code unavailable');
    }

    async function handleSubmit(event) {
        event.preventDefault();
        await saveClass();
    }

    async function saveClass(statusOverride) {
        const payload = collectPayload(statusOverride);
        const isEdit = getMode() === 'edit' && getClassId();
        const url = isEdit ? `/api/teacher/classes/${encodeURIComponent(getClassId())}` : '/api/teacher/classes';
        const method = isEdit ? 'PUT' : 'POST';

        setStatus(statusOverride === 'draft'
            ? 'Saving class as draft...'
            : (isEdit ? 'Saving changes...' : 'Creating class...'));

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to save class.');
            }

            if (!isEdit && data.classId) {
                window.location.href = `/teacher/classes/${encodeURIComponent(data.classId)}/edit`;
                return;
            }

            if (data.classCode) setText('teacherClassCodePill', data.classCode);
            setStatus(data.message || 'Class saved successfully.');
        } catch (error) {
            console.error('Teacher class save failed:', error);
            setStatus(error.message || 'Unable to save class.');
        }
    }

    async function regenerateCode() {
        if (!getClassId()) return;
        setStatus('Regenerating join code...');

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/generate-join-code`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to regenerate join code.');
            }

            setText('teacherClassCodePill', data.classCode || 'Join code unavailable');
            setStatus(data.message || 'Join code regenerated successfully.');
        } catch (error) {
            console.error('Teacher class code regeneration failed:', error);
            setStatus(error.message || 'Unable to regenerate join code.');
        }
    }

    function collectPayload(statusOverride) {
        const termSystem = getValue('teacherTermSystem');
        const academicTerm = getValue('teacherAcademicTerm');
        const scheduleTimeFrom = getValue('teacherScheduleTimeFrom');
        const scheduleTimeTo = getValue('teacherScheduleTimeTo');

        return {
            className: getValue('teacherClassName'),
            courseCode: getValue('teacherCourseCode'),
            termSystem,
            academicTerm,
            section: getValue('teacherSection'),
            scheduleDayCodes: getCheckedValues('scheduleDayCodes'),
            scheduleTimeFrom,
            scheduleTimeTo,
            room: getValue('teacherRoom'),
            subjectDescription: getValue('teacherSubjectDescription'),
            description: getValue('teacherClassDescription'),
            status: statusOverride || 'active',
            selfEnrollmentEnabled: Boolean(document.getElementById('teacherSelfEnrollmentEnabled')?.checked)
        };
    }

    function handleTermSystemChange() {
        renderAcademicTermOptions(getValue('teacherTermSystem'), '');
    }

    function renderAcademicTermOptions(termSystem, selectedValue) {
        const select = document.getElementById('teacherAcademicTerm');
        if (!select) return;

        const options = TERM_OPTIONS[termSystem] || [];
        if (options.length === 0) {
            const fallbackOption = selectedValue
                ? `<option value="${escapeHtml(selectedValue)}" selected>${escapeHtml(selectedValue)}</option>`
                : '<option value="">Select term structure first</option>';
            select.innerHTML = fallbackOption;
            return;
        }

        const hasSelectedOption = options.includes(selectedValue);
        select.innerHTML = [
            '<option value="">Select academic term</option>',
            ...(!hasSelectedOption && selectedValue ? [`<option value="${escapeHtml(selectedValue)}" selected>${escapeHtml(selectedValue)}</option>`] : []),
            ...options.map((label) => `<option value="${escapeHtml(label)}"${label === selectedValue ? ' selected' : ''}>${escapeHtml(label)}</option>`)
        ].join('');
    }

    function inferTermSystem(explicitTermSystem, academicTerm) {
        const normalizedExplicit = String(explicitTermSystem || '').trim().toLowerCase();
        if (TERM_OPTIONS[normalizedExplicit]) {
            return normalizedExplicit;
        }

        const normalizedTerm = String(academicTerm || '').trim().toLowerCase();
        return Object.keys(TERM_OPTIONS).find((key) =>
            TERM_OPTIONS[key].some((item) => item.toLowerCase() === normalizedTerm)
        ) || '';
    }

    function setScheduleDaySelection(dayCodes, scheduleDays) {
        const selected = new Set(normalizeDayCodes(dayCodes, scheduleDays));
        document.querySelectorAll('input[name="scheduleDayCodes"]').forEach((checkbox) => {
            checkbox.checked = selected.has(checkbox.value);
        });
    }

    function normalizeDayCodes(dayCodes, scheduleDays) {
        if (Array.isArray(dayCodes) && dayCodes.length > 0) {
            return dayCodes.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean);
        }

        const normalized = String(scheduleDays || '').toLowerCase();
        return DAY_OPTIONS
            .filter((item) => normalized.includes(item.label.toLowerCase()))
            .map((item) => item.code);
    }

    function setMeetingTimes(scheduleTimeFrom, scheduleTimeTo, fallbackScheduleTime) {
        let nextFrom = normalizeTimeInputValue(scheduleTimeFrom || '');
        let nextTo = normalizeTimeInputValue(scheduleTimeTo || '');

        if ((!nextFrom && !nextTo) && fallbackScheduleTime) {
            const parts = String(fallbackScheduleTime).split(/\s*-\s*/);
            nextFrom = normalizeTimeInputValue(parts[0] || '');
            nextTo = normalizeTimeInputValue(parts[1] || '');
        }

        setValue('teacherScheduleTimeFrom', nextFrom);
        setValue('teacherScheduleTimeTo', nextTo);
    }

    function normalizeTimeInputValue(value) {
        const trimmed = String(value || '').trim();
        if (!trimmed) {
            return '';
        }

        const directMatch = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (directMatch) {
            return trimmed;
        }

        const meridiemMatch = trimmed.match(/^(\d{1,2}):([0-5]\d)\s*([AP]M)$/i);
        if (!meridiemMatch) {
            return '';
        }

        let hours = Number(meridiemMatch[1]);
        const minutes = meridiemMatch[2];
        const meridiem = meridiemMatch[3].toUpperCase();

        if (hours === 12) {
            hours = meridiem === 'AM' ? 0 : 12;
        } else if (meridiem === 'PM') {
            hours += 12;
        }

        return `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    function getCheckedValues(name) {
        return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
    }

    function getValue(id) {
        return document.getElementById(id)?.value?.trim() || '';
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.value = value || '';
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function setStatus(message) {
        setText('teacherClassFormStatus', message);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    document.addEventListener('DOMContentLoaded', init);
    global.teacherClassEditor = { init };
})(window);
