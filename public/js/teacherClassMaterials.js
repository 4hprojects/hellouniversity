(function attachTeacherClassMaterials(global) {
    const URL_TYPES = new Set(['link', 'video']);

    const state = {
        modules: [],
        materials: [],
        classItem: null
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
        setText('teacherMaterialsStatus', text);
    }

    function formatType(type) {
        const labels = {
            link: 'Link',
            video: 'Video',
            document: 'Document',
            file: 'File',
            note: 'Note'
        };
        return labels[String(type || '').toLowerCase()] || 'Resource';
    }

    function init() {
        const typeSelect = byId('teacherMaterialTypeSelect');
        if (typeSelect) {
            typeSelect.addEventListener('change', handleTypeChange);
            handleTypeChange();
        }
        byId('teacherMaterialAddForm')?.addEventListener('submit', handleAddSubmit);
        loadAll();
    }

    function handleTypeChange() {
        const type = byId('teacherMaterialTypeSelect')?.value || 'link';
        const urlWrap = byId('teacherMaterialUrlWrap');
        if (urlWrap) urlWrap.hidden = !URL_TYPES.has(type);
    }

    async function loadAll() {
        setStatus('Loading materials...');
        try {
            const [classRes, modulesRes, materialsRes] = await Promise.all([
                fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}`, { credentials: 'include' }),
                fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/modules`, { credentials: 'include' }),
                fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/materials`, { credentials: 'include' })
            ]);

            const [classData, modulesData, materialsData] = await Promise.all([
                classRes.json(),
                modulesRes.json(),
                materialsRes.json()
            ]);

            if (classData.success && classData.classItem) {
                state.classItem = classData.classItem;
                const classItem = classData.classItem;
                setText('teacherMaterialsTitle', `${classItem.className || 'Class'} — Materials`);
                const subtitle = [classItem.courseCode, classItem.section, classItem.academicTerm]
                    .filter(Boolean)
                    .join(' | ');
                setText('teacherMaterialsSubcopy', subtitle || 'Add links, notes, and resources for students.');
            }

            state.modules = Array.isArray(modulesData.modules) ? modulesData.modules : [];
            state.materials = Array.isArray(materialsData.materials) ? materialsData.materials : [];

            populateModuleSelect();
            render();
        } catch (error) {
            console.error('Load materials failed:', error);
            setStatus(error.message || 'Unable to load materials.');
        }
    }

    function populateModuleSelect() {
        const select = byId('teacherMaterialModuleSelect');
        if (!select) return;

        const sorted = [...state.modules].sort((a, b) => Number(a.order) - Number(b.order));
        const options = sorted.map((mod) =>
            `<option value="${escapeHtml(mod.moduleId)}">${escapeHtml(mod.title)}</option>`
        ).join('');
        select.innerHTML = `<option value="">No module (unlinked)</option>${options}`;
    }

    function render() {
        const countEl = byId('teacherMaterialsCount');
        if (countEl) countEl.textContent = String(state.materials.length);

        const container = byId('teacherMaterialsList');
        if (!container) return;

        if (state.materials.length === 0) {
            setStatus('No materials yet. Add the first resource using the form above.');
            container.innerHTML = '';
            return;
        }

        setStatus(`${state.materials.length} material(s).`);

        const sortedModules = [...state.modules].sort((a, b) => Number(a.order) - Number(b.order));
        const sections = [];

        // Group by module
        sortedModules.forEach((mod) => {
            const modMaterials = state.materials.filter((m) => m.moduleId === mod.moduleId);
            if (modMaterials.length > 0) {
                sections.push({ moduleId: mod.moduleId, title: mod.title, materials: modMaterials });
            }
        });

        // Unlinked materials
        const unlinked = state.materials.filter((m) => !m.moduleId);
        if (unlinked.length > 0) {
            sections.push({ moduleId: null, title: 'Unlinked Materials', materials: unlinked });
        }

        if (sections.length === 0) {
            setStatus('No materials yet. Add the first resource using the form above.');
            container.innerHTML = '';
            return;
        }

        container.innerHTML = sections.map((section) => renderMaterialGroup(section)).join('');

        container.querySelectorAll('[data-delete-material-id]').forEach((btn) => {
            btn.addEventListener('click', () => handleDeleteMaterial(btn.dataset.deleteMaterialId, btn.dataset.materialTitle));
        });
    }

    function renderMaterialGroup(section) {
        const headerClass = section.moduleId
            ? 'teacher-material-group-header'
            : 'teacher-material-group-header teacher-material-group-header-unlinked';

        const items = section.materials
            .sort((a, b) => Number(a.order) - Number(b.order))
            .map((mat) => renderMaterialItem(mat))
            .join('');

        return `
            <div class="teacher-material-group">
                <div class="${headerClass}">
                    <strong>${escapeHtml(section.title)}</strong>
                    <span class="teacher-badge teacher-badge-soft">${section.materials.length}</span>
                </div>
                <div class="teacher-material-group-items">
                    ${items}
                </div>
            </div>
        `;
    }

    function renderMaterialItem(mat) {
        const typeBadgeClass = {
            link: 'teacher-badge-soft',
            video: 'teacher-badge-live',
            document: 'teacher-badge-draft',
            file: 'teacher-badge-muted',
            note: 'teacher-badge-muted'
        }[mat.type] || 'teacher-badge-muted';

        const urlMarkup = mat.url
            ? `<a href="${escapeHtml(mat.url)}" target="_blank" rel="noopener noreferrer" class="teacher-material-link">${escapeHtml(mat.url.length > 60 ? mat.url.slice(0, 60) + '\u2026' : mat.url)}</a>`
            : '';

        const descMarkup = mat.description
            ? `<p class="teacher-meta">${escapeHtml(mat.description)}</p>`
            : '';

        const hiddenBadge = mat.hidden
            ? `<span class="teacher-badge teacher-badge-muted">Hidden</span>`
            : '';

        return `
            <article class="teacher-material-item">
                <div class="teacher-material-item-body">
                    <div class="teacher-material-item-header">
                        <span class="teacher-material-item-title">${escapeHtml(mat.title)}</span>
                        <span class="teacher-badge ${typeBadgeClass}">${escapeHtml(formatType(mat.type))}</span>
                        ${hiddenBadge}
                    </div>
                    ${urlMarkup}
                    ${descMarkup}
                </div>
                <div class="teacher-material-item-actions">
                    <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-btn-danger" data-delete-material-id="${escapeHtml(mat.materialId)}" data-material-title="${escapeHtml(mat.title)}" aria-label="Delete material">Delete</button>
                </div>
            </article>
        `;
    }

    async function handleAddSubmit(event) {
        event.preventDefault();
        const titleInput = byId('teacherMaterialTitleInput');
        const typeSelect = byId('teacherMaterialTypeSelect');
        const urlInput = byId('teacherMaterialUrlInput');
        const descInput = byId('teacherMaterialDescInput');
        const moduleSelect = byId('teacherMaterialModuleSelect');
        const statusEl = byId('teacherMaterialAddStatus');
        const submitBtn = event.target.querySelector('[type="submit"]');

        const title = String(titleInput?.value || '').trim();
        const type = typeSelect?.value || 'link';
        const url = String(urlInput?.value || '').trim();
        const description = String(descInput?.value || '').trim();
        const moduleId = moduleSelect?.value || '';

        if (!title) return;

        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Adding material...';

        try {
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/materials`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ title, type, url: url || undefined, description, moduleId: moduleId || undefined })
                }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to add material.');
            state.materials.push(data.material);
            if (titleInput) titleInput.value = '';
            if (urlInput) urlInput.value = '';
            if (descInput) descInput.value = '';
            if (moduleSelect) moduleSelect.value = '';
            if (statusEl) statusEl.textContent = 'Material added.';
            render();
        } catch (error) {
            console.error('Add material failed:', error);
            if (statusEl) statusEl.textContent = error.message || 'Unable to add material.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function handleDeleteMaterial(materialId, materialTitle) {
        if (!global.confirm(`Delete material "${materialTitle}"?`)) return;

        try {
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/${encodeURIComponent(materialId)}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete material.');
            state.materials = state.materials.filter((m) => m.materialId !== materialId);
            render();
        } catch (error) {
            console.error('Delete material failed:', error);
            setStatus(error.message || 'Unable to delete material.');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
}(window));
