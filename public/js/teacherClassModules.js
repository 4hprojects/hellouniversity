(function attachTeacherClassModules(global) {
    const state = {
        modules: [],
        classItem: null,
        editingModuleId: ''
    };

    function getClassId() {
        return document.body?.dataset?.classId || '';
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setText(id, value) {
        const el = byId(id);
        if (el) el.textContent = value;
    }

    function setStatus(text) {
        setText('teacherModulesStatus', text);
    }

    function sortedModules() {
        return [...state.modules].sort((a, b) => Number(a.order) - Number(b.order));
    }

    function init() {
        byId('teacherModuleAddForm')?.addEventListener('submit', handleAddSubmit);
        byId('teacherModuleEditForm')?.addEventListener('submit', handleEditSubmit);
        byId('teacherModuleEditCloseButton')?.addEventListener('click', closeEditModal);
        byId('teacherModuleEditCancelButton')?.addEventListener('click', closeEditModal);
        byId('teacherModuleEditModal')?.addEventListener('click', handleEditModalClick);
        document.addEventListener('keydown', handleKeydown);
        loadClass();
        loadModules();
    }

    async function loadClass() {
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success || !data.classItem) return;
            state.classItem = data.classItem;
            const classItem = data.classItem;
            setText('teacherModulesTitle', `${classItem.className || 'Class'} — Modules`);
            const subtitle = [classItem.courseCode, classItem.section, classItem.academicTerm]
                .filter(Boolean)
                .join(' | ');
            setText('teacherModulesSubcopy', subtitle || 'Organize class topics, weeks, and units for your students.');
        } catch (_err) {
            // Non-fatal — header stays as default
        }
    }

    async function loadModules() {
        setStatus('Loading modules...');
        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/modules`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to load modules.');
            state.modules = Array.isArray(data.modules) ? data.modules : [];
            render();
        } catch (error) {
            console.error('Load modules failed:', error);
            setStatus(error.message || 'Unable to load modules.');
        }
    }

    function render() {
        const sorted = sortedModules();
        const countEl = byId('teacherModulesCount');
        if (countEl) countEl.textContent = String(sorted.length);

        const container = byId('teacherModulesList');
        if (!container) return;

        if (sorted.length === 0) {
            setStatus('No modules yet. Add the first module using the form above.');
            container.innerHTML = '';
            return;
        }

        setStatus(`${sorted.length} module(s).`);
        container.innerHTML = sorted.map((mod, index) => renderModuleItem(mod, index, sorted.length)).join('');

        container.querySelectorAll('[data-module-action]').forEach((btn) => {
            btn.addEventListener('click', () => handleModuleAction(btn.dataset.moduleAction, btn.dataset.moduleId));
        });
    }

    function renderModuleItem(mod, index, total) {
        const hiddenBadge = mod.hidden
            ? `<span class="teacher-badge teacher-badge-muted">Hidden</span>`
            : '';
        const disabledUp = index === 0 ? ' disabled' : '';
        const disabledDown = index === total - 1 ? ' disabled' : '';
        const descMarkup = mod.description
            ? `<p class="teacher-meta">${escapeHtml(mod.description)}</p>`
            : '';

        return `
            <article class="teacher-module-item">
                <div class="teacher-module-item-move">
                    <button type="button" class="teacher-icon-btn teacher-module-move-btn" data-module-action="move-up" data-module-id="${escapeHtml(mod.moduleId)}" aria-label="Move module up" title="Move up"${disabledUp}>&#9650;</button>
                    <button type="button" class="teacher-icon-btn teacher-module-move-btn" data-module-action="move-down" data-module-id="${escapeHtml(mod.moduleId)}" aria-label="Move module down" title="Move down"${disabledDown}>&#9660;</button>
                </div>
                <div class="teacher-module-item-body">
                    <div class="teacher-module-item-header">
                        <strong>${escapeHtml(mod.title)}</strong>
                        ${hiddenBadge}
                    </div>
                    ${descMarkup}
                </div>
                <div class="teacher-module-item-actions">
                    <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-module-action="edit" data-module-id="${escapeHtml(mod.moduleId)}">Edit</button>
                    <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-module-action="${mod.hidden ? 'show' : 'hide'}" data-module-id="${escapeHtml(mod.moduleId)}">${mod.hidden ? 'Show' : 'Hide'}</button>
                    <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-btn-danger" data-module-action="delete" data-module-id="${escapeHtml(mod.moduleId)}" aria-label="Delete module">Delete</button>
                </div>
            </article>
        `;
    }

    async function handleModuleAction(action, moduleId) {
        const mod = state.modules.find((m) => m.moduleId === moduleId);
        if (!mod) return;

        if (action === 'edit') {
            openEditModal(mod);
            return;
        }

        if (action === 'delete') {
            if (!global.confirm(`Delete module "${mod.title}"? Materials under this module will remain but become unlinked.`)) return;
            await deleteModule(moduleId);
            return;
        }

        if (action === 'hide') {
            await updateModuleField(mod, { hidden: true });
            return;
        }

        if (action === 'show') {
            await updateModuleField(mod, { hidden: false });
            return;
        }

        const sorted = sortedModules();
        const currentIndex = sorted.findIndex((m) => m.moduleId === moduleId);

        if (action === 'move-up' && currentIndex > 0) {
            const above = sorted[currentIndex - 1];
            const orderA = Number(mod.order);
            const orderB = Number(above.order);
            await Promise.all([
                updateModuleField(mod, { order: orderB }),
                updateModuleField(above, { order: orderA })
            ]);
            return;
        }

        if (action === 'move-down' && currentIndex < sorted.length - 1) {
            const below = sorted[currentIndex + 1];
            const orderA = Number(mod.order);
            const orderB = Number(below.order);
            await Promise.all([
                updateModuleField(mod, { order: orderB }),
                updateModuleField(below, { order: orderA })
            ]);
        }
    }

    async function updateModuleField(mod, patch) {
        try {
            const payload = {
                title: mod.title,
                description: mod.description || '',
                order: mod.order,
                hidden: mod.hidden || false,
                ...patch
            };
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/modules/${encodeURIComponent(mod.moduleId)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update module.');
            const idx = state.modules.findIndex((m) => m.moduleId === mod.moduleId);
            if (idx !== -1) state.modules[idx] = { ...state.modules[idx], ...patch };
            render();
        } catch (error) {
            console.error('Update module failed:', error);
            setStatus(error.message || 'Unable to update module.');
        }
    }

    async function deleteModule(moduleId) {
        try {
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/modules/${encodeURIComponent(moduleId)}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete module.');
            state.modules = state.modules.filter((m) => m.moduleId !== moduleId);
            render();
        } catch (error) {
            console.error('Delete module failed:', error);
            setStatus(error.message || 'Unable to delete module.');
        }
    }

    async function handleAddSubmit(event) {
        event.preventDefault();
        const titleInput = byId('teacherModuleTitleInput');
        const descInput = byId('teacherModuleDescInput');
        const statusEl = byId('teacherModuleAddStatus');
        const submitBtn = event.target.querySelector('[type="submit"]');
        const title = String(titleInput?.value || '').trim();
        if (!title) return;

        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Adding module...';

        try {
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/modules`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        title,
                        description: String(descInput?.value || '').trim()
                    })
                }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to add module.');
            state.modules.push(data.module);
            if (titleInput) titleInput.value = '';
            if (descInput) descInput.value = '';
            if (statusEl) statusEl.textContent = 'Module added.';
            render();
        } catch (error) {
            console.error('Add module failed:', error);
            if (statusEl) statusEl.textContent = error.message || 'Unable to add module.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    function openEditModal(mod) {
        state.editingModuleId = mod.moduleId;
        const idInput = byId('teacherModuleEditId');
        const titleInput = byId('teacherModuleEditTitleInput');
        const descInput = byId('teacherModuleEditDescInput');
        const hiddenCheck = byId('teacherModuleEditHidden');
        const statusEl = byId('teacherModuleEditStatus');
        if (idInput) idInput.value = mod.moduleId;
        if (titleInput) titleInput.value = mod.title;
        if (descInput) descInput.value = mod.description || '';
        if (hiddenCheck) hiddenCheck.checked = mod.hidden || false;
        if (statusEl) statusEl.textContent = '';
        const modal = byId('teacherModuleEditModal');
        if (modal) {
            modal.hidden = false;
            titleInput?.focus();
        }
    }

    function closeEditModal() {
        const modal = byId('teacherModuleEditModal');
        if (modal) modal.hidden = true;
        state.editingModuleId = '';
    }

    function handleEditModalClick(event) {
        if (event.target.dataset.closeEditModal === 'true') closeEditModal();
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') closeEditModal();
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        const moduleId = byId('teacherModuleEditId')?.value || state.editingModuleId;
        const mod = state.modules.find((m) => m.moduleId === moduleId);
        if (!mod) return;

        const title = String(byId('teacherModuleEditTitleInput')?.value || '').trim();
        const description = String(byId('teacherModuleEditDescInput')?.value || '').trim();
        const hidden = byId('teacherModuleEditHidden')?.checked || false;
        const statusEl = byId('teacherModuleEditStatus');
        const submitBtn = event.target.querySelector('[type="submit"]');

        if (!title) return;
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Saving...';

        try {
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/modules/${encodeURIComponent(moduleId)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, description, order: mod.order, hidden })
                }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to update module.');
            const idx = state.modules.findIndex((m) => m.moduleId === moduleId);
            if (idx !== -1) state.modules[idx] = { ...state.modules[idx], title, description, hidden };
            if (statusEl) statusEl.textContent = 'Saved.';
            render();
            setTimeout(closeEditModal, 600);
        } catch (error) {
            console.error('Edit module failed:', error);
            if (statusEl) statusEl.textContent = error.message || 'Unable to save changes.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    document.addEventListener('DOMContentLoaded', init);
}(window));
