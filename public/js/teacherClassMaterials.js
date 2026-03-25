(function attachTeacherClassMaterials(global) {
    const URL_TYPES = new Set(['link', 'video']);
    const UPLOAD_TYPES = new Set(['document', 'file']);

    const state = {
        modules: [],
        materials: [],
        classItem: null,
        editingMaterialId: '',
        isReordering: false,
        closeEditTimer: null,
        permissions: null
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

    function clearScheduledEditClose() {
        if (state.closeEditTimer) {
            global.clearTimeout(state.closeEditTimer);
            state.closeEditTimer = null;
        }
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

    function formatFileSize(sizeBytes) {
        const numeric = Number(sizeBytes);
        if (!Number.isFinite(numeric) || numeric <= 0) {
            return '';
        }
        if (numeric < 1024) {
            return `${numeric} B`;
        }
        if (numeric < (1024 * 1024)) {
            return `${(numeric / 1024).toFixed(1)} KB`;
        }
        return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
    }

    function sortedModules() {
        return [...state.modules].sort((a, b) => Number(a.order) - Number(b.order));
    }

    function sortedMaterials() {
        return [...state.materials].sort((a, b) => Number(a.order) - Number(b.order));
    }

    function init() {
        byId('teacherMaterialTypeSelect')?.addEventListener('change', () => updateTypePresentation('teacherMaterial'));
        byId('teacherMaterialEditTypeSelect')?.addEventListener('change', () => updateTypePresentation('teacherMaterialEdit'));
        byId('teacherMaterialAddForm')?.addEventListener('submit', handleAddSubmit);
        byId('teacherMaterialEditForm')?.addEventListener('submit', handleEditSubmit);
        byId('teacherMaterialEditCloseButton')?.addEventListener('click', closeEditModal);
        byId('teacherMaterialEditCancelButton')?.addEventListener('click', closeEditModal);
        byId('teacherMaterialRemoveFileButton')?.addEventListener('click', handleRemoveFile);
        byId('teacherMaterialEditModal')?.addEventListener('click', handleEditModalClick);
        document.addEventListener('keydown', handleKeydown);
        updateTypePresentation('teacherMaterial');
        updateTypePresentation('teacherMaterialEdit');
        loadAll();
    }

    function updateTypePresentation(prefix) {
        const type = byId(`${prefix}TypeSelect`)?.value || 'link';
        const urlWrap = byId(`${prefix}UrlWrap`);
        const urlLabel = byId(`${prefix}UrlLabel`);
        const urlHelp = byId(`${prefix}UrlHelp`);
        const fileWrap = byId(`${prefix}FileWrap`);
        const fileLabel = byId(`${prefix}FileLabel`);
        const fileHelp = byId(`${prefix}FileHelp`);

        if (urlWrap) {
            urlWrap.hidden = !URL_TYPES.has(type);
        }
        if (fileWrap) {
            fileWrap.hidden = !UPLOAD_TYPES.has(type);
        }
        if (urlLabel) {
            urlLabel.innerHTML = 'Resource URL <span class="teacher-field-optional">(optional)</span>';
        }
        if (urlHelp) {
            urlHelp.textContent = URL_TYPES.has(type)
                ? 'Add the destination URL for links and videos.'
                : 'Legacy reference URLs remain supported, but uploads are preferred for document and file materials.';
        }
        if (fileLabel) {
            fileLabel.innerHTML = type === 'document'
                ? 'Upload Document <span class="teacher-field-optional">(optional)</span>'
                : 'Upload File <span class="teacher-field-optional">(optional)</span>';
        }
        if (fileHelp) {
            fileHelp.textContent = type === 'document'
                ? 'Upload PDF, Word, PowerPoint, Excel, or TXT files up to 10 MB.'
                : 'Upload a supported file up to 10 MB. Common documents, images, and ZIP files are allowed.';
        }
    }

    function buildMaterialPayload(prefix = '') {
        const type = byId(`${prefix}TypeSelect`)?.value || 'link';
        const rawUrl = String(byId(`${prefix}UrlInput`)?.value || '').trim();
        const payload = {
            title: String(byId(`${prefix}TitleInput`)?.value || '').trim(),
            type,
            description: String(byId(`${prefix}DescInput`)?.value || '').trim(),
            moduleId: byId(`${prefix}ModuleSelect`)?.value || undefined,
            hidden: byId(`${prefix}Hidden`)?.checked || false
        };

        if (URL_TYPES.has(type) || UPLOAD_TYPES.has(type)) {
            payload.url = rawUrl || undefined;
        }

        return payload;
    }

    function getSelectedFile(prefix) {
        return byId(`${prefix}FileInput`)?.files?.[0] || null;
    }

    function buildMaterialFormData(prefix = '') {
        const payload = buildMaterialPayload(prefix);
        const formData = new global.FormData();
        Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }
            formData.append(key, value);
        });

        const file = getSelectedFile(prefix);
        if (file) {
            formData.append('file', file);
        }
        return formData;
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
                state.permissions = classData.permissions || classData.classItem?.permissions || null;
                const classItem = classData.classItem;
                setText('teacherMaterialsTitle', `${classItem.className || 'Class'} - Materials`);
                const subtitle = [classItem.courseCode, classItem.section, classItem.academicTerm]
                    .filter(Boolean)
                    .join(' | ');
                setText('teacherMaterialsSubcopy', subtitle || 'Add links, notes, and uploaded resources for students.');
            }

            state.modules = Array.isArray(modulesData.modules) ? modulesData.modules : [];
            state.permissions = modulesData.permissions || materialsData.permissions || state.permissions;
            state.materials = Array.isArray(materialsData.materials) ? materialsData.materials : [];

            populateModuleSelect('teacherMaterialModuleSelect');
            populateModuleSelect('teacherMaterialEditModuleSelect');
            render();
        } catch (error) {
            console.error('Load materials failed:', error);
            setStatus(error.message || 'Unable to load materials.');
        }
    }

    function populateModuleSelect(selectId) {
        const select = byId(selectId);
        if (!select) return;

        const options = sortedModules().map((mod) =>
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
            setStatus(state.permissions?.canManageMaterials
                ? 'No materials yet. Add the first resource using the form above.'
                : 'No materials yet. You have read-only access to class materials.');
            container.innerHTML = '';
            updateComposerState();
            return;
        }

        setStatus(state.isReordering
            ? 'Updating material order...'
            : state.permissions?.canManageMaterials
                ? `${state.materials.length} material(s).`
                : `${state.materials.length} material(s). Read-only access for your class role.`);
        updateComposerState();

        const sections = [];
        sortedModules().forEach((mod) => {
            const modMaterials = sortedMaterials().filter((materialItem) => materialItem.moduleId === mod.moduleId);
            if (modMaterials.length > 0) {
                sections.push({ moduleId: mod.moduleId, title: mod.title, materials: modMaterials });
            }
        });

        const unlinked = sortedMaterials().filter((materialItem) => !materialItem.moduleId);
        if (unlinked.length > 0) {
            sections.push({ moduleId: null, title: 'Unlinked Materials', materials: unlinked });
        }

        container.innerHTML = sections.map((section) => renderMaterialGroup(section)).join('');

        container.querySelectorAll('[data-material-action]').forEach((btn) => {
            btn.addEventListener('click', () => handleMaterialAction(btn.dataset.materialAction, btn.dataset.materialId));
        });
    }

    function renderMaterialGroup(section) {
        const headerClass = section.moduleId
            ? 'teacher-material-group-header'
            : 'teacher-material-group-header teacher-material-group-header-unlinked';
        const items = section.materials.map((mat, index) => renderMaterialItem(mat, index, section.materials.length)).join('');

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

    function renderMaterialItem(mat, index, total) {
        const canManageMaterials = Boolean(state.permissions?.canManageMaterials);
        const typeBadgeClass = {
            link: 'teacher-badge-soft',
            video: 'teacher-badge-live',
            document: 'teacher-badge-draft',
            file: 'teacher-badge-muted',
            note: 'teacher-badge-muted'
        }[mat.type] || 'teacher-badge-muted';

        const urlMarkup = mat.url
            ? `<a href="${escapeHtml(mat.url)}" target="_blank" rel="noopener noreferrer" class="teacher-material-link">${escapeHtml(mat.url.length > 60 ? `${mat.url.slice(0, 60)}...` : mat.url)}</a>`
            : '';
        const fileMarkup = mat.file?.downloadUrl
            ? `
                <a href="${escapeHtml(mat.file.downloadUrl)}" target="_blank" rel="noopener noreferrer" class="teacher-material-link">
                    ${escapeHtml(mat.file.originalName || 'Open uploaded file')}
                </a>
                <p class="teacher-meta">${escapeHtml([formatFileSize(mat.file.sizeBytes), mat.file.mimeType].filter(Boolean).join(' | '))}</p>
            `
            : mat.file?.originalName
                ? `<p class="teacher-meta">${escapeHtml(mat.file.originalName)}${mat.file.sizeBytes ? ` | ${escapeHtml(formatFileSize(mat.file.sizeBytes))}` : ''}</p>`
                : '';
        const descMarkup = mat.description
            ? `<p class="teacher-meta">${escapeHtml(mat.description)}</p>`
            : '';
        const hiddenBadge = mat.hidden
            ? `<span class="teacher-badge teacher-badge-muted">Hidden</span>`
            : '';
        const disabledUp = index === 0 || state.isReordering || !canManageMaterials ? ' disabled' : '';
        const disabledDown = index === total - 1 || state.isReordering || !canManageMaterials ? ' disabled' : '';

        return `
            <article class="teacher-material-item">
                <div class="teacher-module-item-move">
                    <button type="button" class="teacher-icon-btn teacher-module-move-btn" data-material-action="move-up" data-material-id="${escapeHtml(mat.materialId)}" aria-label="Move material up"${disabledUp}>&#9650;</button>
                    <button type="button" class="teacher-icon-btn teacher-module-move-btn" data-material-action="move-down" data-material-id="${escapeHtml(mat.materialId)}" aria-label="Move material down"${disabledDown}>&#9660;</button>
                </div>
                <div class="teacher-material-item-body">
                    <div class="teacher-material-item-header">
                        <span class="teacher-material-item-title">${escapeHtml(mat.title)}</span>
                        <span class="teacher-badge ${typeBadgeClass}">${escapeHtml(formatType(mat.type))}</span>
                        ${hiddenBadge}
                    </div>
                    ${fileMarkup}
                    ${urlMarkup}
                    ${descMarkup}
                </div>
                <div class="teacher-material-item-actions">
                    ${canManageMaterials
                        ? `
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-material-action="edit" data-material-id="${escapeHtml(mat.materialId)}">Edit</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small" data-material-action="${mat.hidden ? 'show' : 'hide'}" data-material-id="${escapeHtml(mat.materialId)}">${mat.hidden ? 'Show' : 'Hide'}</button>
                            <button type="button" class="teacher-btn teacher-btn-secondary teacher-btn-small teacher-btn-danger" data-material-action="delete" data-material-id="${escapeHtml(mat.materialId)}" aria-label="Delete material">Delete</button>
                        `
                        : '<span class="teacher-meta">Read only</span>'}
                </div>
            </article>
        `;
    }

    function updateComposerState() {
        const addForm = byId('teacherMaterialAddForm');
        if (addForm) {
            const disabled = !state.permissions?.canManageMaterials;
            addForm.querySelectorAll('input, textarea, select, button').forEach((node) => {
                node.disabled = disabled;
            });
        }
    }

    function resetAddForm() {
        byId('teacherMaterialTitleInput').value = '';
        byId('teacherMaterialUrlInput').value = '';
        byId('teacherMaterialDescInput').value = '';
        byId('teacherMaterialModuleSelect').value = '';
        byId('teacherMaterialTypeSelect').value = 'link';
        if (byId('teacherMaterialFileInput')) {
            byId('teacherMaterialFileInput').value = '';
        }
        updateTypePresentation('teacherMaterial');
    }

    async function handleAddSubmit(event) {
        event.preventDefault();
        const statusEl = byId('teacherMaterialAddStatus');
        const submitBtn = event.target.querySelector('[type="submit"]');
        const payload = buildMaterialPayload('teacherMaterial');
        const file = getSelectedFile('teacherMaterial');

        if (!payload.title) return;

        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = UPLOAD_TYPES.has(payload.type) && file ? 'Uploading material...' : 'Adding material...';

        try {
            let response;
            if (UPLOAD_TYPES.has(payload.type) && file) {
                response = await fetch(
                    `/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/upload`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        body: buildMaterialFormData('teacherMaterial')
                    }
                );
            } else {
                response = await fetch(
                    `/api/teacher/classes/${encodeURIComponent(getClassId())}/materials`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(payload)
                    }
                );
            }

            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to add material.');
            state.materials.push(data.material);
            resetAddForm();
            if (statusEl) statusEl.textContent = data.message || 'Material added.';
            setStatus(data.message || 'Material added.');
            render();
        } catch (error) {
            console.error('Add material failed:', error);
            if (statusEl) statusEl.textContent = error.message || 'Unable to add material.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function handleMaterialAction(action, materialId) {
        const material = state.materials.find((item) => item.materialId === materialId);
        if (!material) return;

        if (action === 'edit') {
            openEditModal(material);
            return;
        }
        if (action === 'delete') {
            if (!global.confirm(`Delete material "${material.title}"?`)) return;
            await deleteMaterial(materialId);
            return;
        }
        if (action === 'hide') {
            await updateMaterial(material, { hidden: true });
            return;
        }
        if (action === 'show') {
            await updateMaterial(material, { hidden: false });
            return;
        }

        const displayGroup = sortedMaterials().filter((item) => (item.moduleId || '') === (material.moduleId || ''));
        const currentIndex = displayGroup.findIndex((item) => item.materialId === materialId);
        if (action === 'move-up' && currentIndex > 0) {
            await reorderWithinGroup(displayGroup, currentIndex, currentIndex - 1);
            return;
        }
        if (action === 'move-down' && currentIndex < displayGroup.length - 1) {
            await reorderWithinGroup(displayGroup, currentIndex, currentIndex + 1);
        }
    }

    async function reorderWithinGroup(groupMaterials, fromIndex, toIndex) {
        if (state.isReordering) return;

        const moved = [...groupMaterials];
        [moved[fromIndex], moved[toIndex]] = [moved[toIndex], moved[fromIndex]];
        const movedIds = moved.map((item) => item.materialId);
        const nextOrder = sortedMaterials().map((item) => item.materialId);
        const groupIdSet = new Set(groupMaterials.map((item) => item.materialId));
        let cursor = 0;
        const reorderedIds = nextOrder.map((id) => (groupIdSet.has(id) ? movedIds[cursor++] : id));
        await reorderMaterials(reorderedIds);
    }

    async function reorderMaterials(materialIds) {
        state.isReordering = true;
        render();

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ materialIds })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to reorder materials.');
            }

            state.materials = Array.isArray(data.materials) ? data.materials : state.materials;
            setStatus('Material order updated.');
            render();
        } catch (error) {
            console.error('Reorder materials failed:', error);
            setStatus(error.message || 'Unable to reorder materials.');
            await loadAll();
        } finally {
            state.isReordering = false;
            render();
        }
    }

    function openEditModal(material) {
        clearScheduledEditClose();
        state.editingMaterialId = material.materialId;
        byId('teacherMaterialEditId').value = material.materialId;
        byId('teacherMaterialEditTitleInput').value = material.title || '';
        byId('teacherMaterialEditTypeSelect').value = material.type || 'link';
        byId('teacherMaterialEditUrlInput').value = material.url || '';
        byId('teacherMaterialEditDescInput').value = material.description || '';
        byId('teacherMaterialEditModuleSelect').value = material.moduleId || '';
        byId('teacherMaterialEditHidden').checked = material.hidden || false;
        byId('teacherMaterialEditStatus').textContent = '';
        if (byId('teacherMaterialEditFileInput')) {
            byId('teacherMaterialEditFileInput').value = '';
        }
        const currentFile = byId('teacherMaterialEditCurrentFile');
        if (currentFile) {
            currentFile.innerHTML = material.file?.downloadUrl
                ? `Current file: <a href="${escapeHtml(material.file.downloadUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(material.file.originalName || 'Open file')}</a>${material.file.sizeBytes ? ` (${escapeHtml(formatFileSize(material.file.sizeBytes))})` : ''}`
                : material.file?.originalName
                    ? `Current file: ${escapeHtml(material.file.originalName)}`
                    : 'No uploaded file attached to this material yet.';
        }
        const removeFileButton = byId('teacherMaterialRemoveFileButton');
        if (removeFileButton) {
            removeFileButton.hidden = !material.file;
        }
        updateTypePresentation('teacherMaterialEdit');
        const modal = byId('teacherMaterialEditModal');
        if (modal) {
            modal.hidden = false;
            byId('teacherMaterialEditTitleInput')?.focus();
        }
    }

    function closeEditModal() {
        clearScheduledEditClose();
        const modal = byId('teacherMaterialEditModal');
        if (modal) modal.hidden = true;
        state.editingMaterialId = '';
    }

    function handleEditModalClick(event) {
        if (event.target?.dataset?.closeMaterialEditModal === 'true') {
            closeEditModal();
        }
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            closeEditModal();
        }
    }

    async function uploadReplacementFile(materialId) {
        const file = getSelectedFile('teacherMaterialEdit');
        if (!file) {
            return null;
        }

        const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/${encodeURIComponent(materialId)}/upload`, {
            method: 'POST',
            credentials: 'include',
            body: buildMaterialFormData('teacherMaterialEdit')
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Failed to upload replacement file.');
        }
        return data.material || null;
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        const materialId = byId('teacherMaterialEditId')?.value || state.editingMaterialId;
        const material = state.materials.find((item) => item.materialId === materialId);
        if (!material) return;

        const submitBtn = event.target.querySelector('[type="submit"]');
        const statusEl = byId('teacherMaterialEditStatus');
        if (submitBtn) submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Saving...';

        try {
            const payload = buildMaterialPayload('teacherMaterialEdit');
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/${encodeURIComponent(materialId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update material.');
            }

            let nextMaterial = data.material || { ...state.materials.find((item) => item.materialId === materialId), ...payload };
            if (UPLOAD_TYPES.has(payload.type) && getSelectedFile('teacherMaterialEdit')) {
                if (statusEl) statusEl.textContent = 'Uploading replacement file...';
                const uploadedMaterial = await uploadReplacementFile(materialId);
                if (uploadedMaterial) {
                    nextMaterial = uploadedMaterial;
                }
            }

            const index = state.materials.findIndex((item) => item.materialId === materialId);
            if (index !== -1) {
                state.materials[index] = nextMaterial;
            }
            if (statusEl) statusEl.textContent = 'Saved.';
            setStatus('Material updated.');
            render();
            state.closeEditTimer = global.setTimeout(closeEditModal, 600);
        } catch (error) {
            console.error('Edit material failed:', error);
            if (statusEl) statusEl.textContent = error.message || 'Unable to save changes.';
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function updateMaterial(material, patch) {
        try {
            const nextType = patch.type ?? material.type;
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/${encodeURIComponent(material.materialId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: patch.title ?? material.title,
                    type: nextType,
                    ...(URL_TYPES.has(nextType) || UPLOAD_TYPES.has(nextType) ? { url: patch.url ?? material.url ?? undefined } : {}),
                    description: patch.description ?? material.description ?? '',
                    moduleId: patch.moduleId ?? material.moduleId ?? undefined,
                    hidden: patch.hidden ?? (material.hidden || false)
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update material.');
            }

            const index = state.materials.findIndex((item) => item.materialId === material.materialId);
            if (index !== -1) {
                state.materials[index] = data.material || { ...state.materials[index], ...patch };
            }
            setStatus((patch.hidden ?? material.hidden) ? 'Material hidden.' : 'Material shown.');
            render();
        } catch (error) {
            console.error('Update material failed:', error);
            setStatus(error.message || 'Unable to update material.');
        }
    }

    async function handleRemoveFile() {
        const materialId = byId('teacherMaterialEditId')?.value || state.editingMaterialId;
        if (!materialId) {
            return;
        }
        if (!global.confirm('Remove the uploaded file from this material?')) {
            return;
        }

        const statusEl = byId('teacherMaterialEditStatus');
        if (statusEl) {
            statusEl.textContent = 'Removing file...';
        }

        try {
            const response = await fetch(`/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/${encodeURIComponent(materialId)}/file`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to remove uploaded file.');
            }

            const index = state.materials.findIndex((item) => item.materialId === materialId);
            if (index !== -1) {
                state.materials[index] = data.material || { ...state.materials[index], file: null };
                openEditModal(state.materials[index]);
            }
            if (statusEl) {
                statusEl.textContent = 'Uploaded file removed.';
            }
            setStatus('Uploaded file removed.');
            render();
        } catch (error) {
            console.error('Remove uploaded file failed:', error);
            if (statusEl) {
                statusEl.textContent = error.message || 'Unable to remove uploaded file.';
            }
        }
    }

    async function deleteMaterial(materialId) {
        try {
            const response = await fetch(
                `/api/teacher/classes/${encodeURIComponent(getClassId())}/materials/${encodeURIComponent(materialId)}`,
                { method: 'DELETE', credentials: 'include' }
            );
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete material.');
            state.materials = state.materials.filter((m) => m.materialId !== materialId).map((item, index) => ({ ...item, order: index }));
            setStatus('Material deleted.');
            render();
        } catch (error) {
            console.error('Delete material failed:', error);
            setStatus(error.message || 'Unable to delete material.');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
}(window));
