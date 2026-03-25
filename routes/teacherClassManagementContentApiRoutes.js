const express = require('express');
const multer = require('multer');
const {
  MATERIAL_UPLOAD_MAX_BYTES,
  validateMaterialUpload,
  uploadClassMaterialFile,
  deleteClassMaterialFile,
  serializeClassMaterial,
  serializeClassMaterials
} = require('../utils/classMaterialStorage');

function createTeacherClassManagementContentApiRoutes({
  getDeps,
  loadOwnedClass,
  getClassAccess,
  writeLog,
  isAuthenticated,
  isTeacherOrAdmin,
  ObjectId
}) {
  const router = express.Router();

  const ALLOWED_MATERIAL_TYPES = new Set(['link', 'file', 'note', 'video', 'document']);
  const URL_MATERIAL_TYPES = new Set(['link', 'video', 'document', 'file']);
  const ALLOWED_LATE = ['allow', 'deny', 'penalize'];
  const ALLOWED_GRADE_VIS = ['immediate', 'after_review', 'hidden'];
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MATERIAL_UPLOAD_MAX_BYTES }
  });

  function normalizeModuleOrder(modules = []) {
    return [...modules]
      .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
      .map((moduleItem, index) => ({
        ...moduleItem,
        order: index
      }));
  }

  function normalizeMaterialOrder(materials = []) {
    return [...materials]
      .sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0))
      .map((materialItem, index) => ({
        ...materialItem,
        order: index
      }));
  }

  function validateOrderedIds(orderedIds, items, keyName) {
    const normalizedIds = Array.isArray(orderedIds)
      ? orderedIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
    const itemIds = items.map((item) => String(item?.[keyName] || '').trim()).filter(Boolean);
    if (normalizedIds.length !== itemIds.length) {
      return null;
    }

    const incoming = [...normalizedIds].sort();
    const existing = [...itemIds].sort();
    if (incoming.some((item, index) => item !== existing[index])) {
      return null;
    }

    return normalizedIds;
  }

  function reorderItemsByIds(items, orderedIds, keyName) {
    const itemMap = new Map(items.map((item) => [String(item[keyName] || ''), item]));
    return orderedIds.map((id, index) => ({
      ...itemMap.get(id),
      order: index
    }));
  }

  function sanitizeMaterialPayload(classDoc, body = {}, existingMaterial = null) {
    const title = String(body.title || '').trim();
    if (!title) {
      return { error: 'Material title is required.' };
    }
    if (title.length > 300) {
      return { error: 'Material title is too long.' };
    }

    const materialType = ALLOWED_MATERIAL_TYPES.has(String(body.type || '').trim())
      ? String(body.type || '').trim()
      : (existingMaterial?.type || 'link');
    const url = String(body.url || '').trim();
    if (URL_MATERIAL_TYPES.has(materialType) && url && !/^https?:\/\//i.test(url)) {
      return { error: 'URL must start with http:// or https://.' };
    }

    const moduleId = String(body.moduleId || '').trim() || null;
    if (moduleId) {
      const existingModules = Array.isArray(classDoc.modules) ? classDoc.modules : [];
      if (!existingModules.some((moduleItem) => moduleItem.moduleId === moduleId)) {
        return { error: 'Referenced module not found.' };
      }
    }

    return {
      title,
      description: String(body.description || '').trim(),
      type: materialType,
      url: url || null,
      moduleId,
      hidden: body.hidden === true || body.hidden === 'true'
    };
  }

  function uploadSingleMaterialFile(req, res, next) {
    upload.single('file')(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10 MB.' });
        }
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return next();
    });
  }

  async function serializeMaterialsResponse(materials) {
    return serializeClassMaterials(normalizeMaterialOrder(materials));
  }

  router.get('/:classId/modules', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const classDoc = await loadOwnedClass(req, res, deps.classesCollection, req.params.classId);
      if (!classDoc) return;

      const modules = normalizeModuleOrder(Array.isArray(classDoc.modules) ? classDoc.modules : []);
      const access = getClassAccess(req, classDoc);
      return res.json({ success: true, currentRole: access.currentRole, permissions: access.permissions, modules });
    } catch (error) {
      console.error('Error fetching class modules:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/modules', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageModules) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage modules.' });
      }

      const title = String(req.body.title || '').trim();
      if (!title) {
        return res.status(400).json({ success: false, message: 'Module title is required.' });
      }
      if (title.length > 200) {
        return res.status(400).json({ success: false, message: 'Module title is too long.' });
      }

      const existingModules = normalizeModuleOrder(Array.isArray(classDoc.modules) ? classDoc.modules : []);
      const now = new Date();
      const newModule = {
        moduleId: new ObjectId().toHexString(),
        title,
        description: String(req.body.description || '').trim(),
        order: existingModules.length,
        hidden: false,
        createdAt: now
      };

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            modules: [...existingModules, newModule],
            updatedAt: now
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MODULE_ADDED', `Added module "${title}" to ${classDoc.className}`);
      return res.status(201).json({ success: true, module: newModule, message: 'Module added successfully.' });
    } catch (error) {
      console.error('Error adding class module:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/:classId/modules/reorder', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageModules) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage modules.' });
      }

      const existingModules = normalizeModuleOrder(Array.isArray(classDoc.modules) ? classDoc.modules : []);
      const orderedModuleIds = validateOrderedIds(req.body.moduleIds, existingModules, 'moduleId');
      if (!orderedModuleIds) {
        return res.status(400).json({ success: false, message: 'Provide the complete ordered module list.' });
      }

      const reorderedModules = reorderItemsByIds(existingModules, orderedModuleIds, 'moduleId');
      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            modules: reorderedModules,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MODULES_REORDERED', `Reordered modules in ${classDoc.className}`);
      return res.json({ success: true, modules: reorderedModules, message: 'Modules reordered successfully.' });
    } catch (error) {
      console.error('Error reordering class modules:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/:classId/modules/:moduleId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageModules) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage modules.' });
      }

      const existingModules = normalizeModuleOrder(Array.isArray(classDoc.modules) ? classDoc.modules : []);
      const moduleIndex = existingModules.findIndex((moduleItem) => moduleItem.moduleId === req.params.moduleId);
      if (moduleIndex === -1) {
        return res.status(404).json({ success: false, message: 'Module not found.' });
      }

      const title = String(req.body.title || '').trim();
      if (!title) {
        return res.status(400).json({ success: false, message: 'Module title is required.' });
      }
      if (title.length > 200) {
        return res.status(400).json({ success: false, message: 'Module title is too long.' });
      }

      const updatedModule = {
        ...existingModules[moduleIndex],
        title,
        description: String(req.body.description || '').trim(),
        hidden: req.body.hidden === true || req.body.hidden === 'true'
      };

      existingModules[moduleIndex] = updatedModule;

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            modules: existingModules,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MODULE_UPDATED', `Updated module "${title}" in ${classDoc.className}`);
      return res.json({ success: true, module: updatedModule, message: 'Module updated successfully.' });
    } catch (error) {
      console.error('Error updating class module:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.delete('/:classId/modules/:moduleId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageModules) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage modules.' });
      }

      const existingModules = normalizeModuleOrder(Array.isArray(classDoc.modules) ? classDoc.modules : []);
      const moduleToDelete = existingModules.find((moduleItem) => moduleItem.moduleId === req.params.moduleId);
      if (!moduleToDelete) {
        return res.status(404).json({ success: false, message: 'Module not found.' });
      }

      const remainingModules = normalizeModuleOrder(
        existingModules.filter((moduleItem) => moduleItem.moduleId !== req.params.moduleId)
      );
      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const updatedMaterials = existingMaterials.map((materialItem) => (
        materialItem.moduleId === req.params.moduleId
          ? { ...materialItem, moduleId: null }
          : materialItem
      ));

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            modules: remainingModules,
            materials: updatedMaterials,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MODULE_DELETED', `Deleted module "${moduleToDelete.title}" from ${classDoc.className}`);
      return res.json({ success: true, message: 'Module deleted successfully.' });
    } catch (error) {
      console.error('Error deleting class module:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/:classId/materials', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const classDoc = await loadOwnedClass(req, res, deps.classesCollection, req.params.classId);
      if (!classDoc) return;

      const materials = await serializeMaterialsResponse(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const moduleId = String(req.query.moduleId || '').trim();
      const filtered = moduleId ? materials.filter((materialItem) => materialItem.moduleId === moduleId) : materials;
      const access = getClassAccess(req, classDoc);
      return res.json({ success: true, currentRole: access.currentRole, permissions: access.permissions, materials: filtered });
    } catch (error) {
      console.error('Error fetching class materials:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/materials', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const sanitized = sanitizeMaterialPayload(classDoc, req.body);
      if (sanitized.error) {
        return res.status(400).json({ success: false, message: sanitized.error });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const newMaterial = {
        materialId: new ObjectId().toHexString(),
        ...sanitized,
        order: existingMaterials.length,
        createdAt: new Date()
      };

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: [...existingMaterials, newMaterial],
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MATERIAL_ADDED', `Added material "${newMaterial.title}" to ${classDoc.className}`);
      return res.status(201).json({
        success: true,
        material: await serializeClassMaterial(newMaterial),
        message: 'Material added successfully.'
      });
    } catch (error) {
      console.error('Error adding class material:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/materials/upload', isAuthenticated, isTeacherOrAdmin, uploadSingleMaterialFile, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const sanitized = sanitizeMaterialPayload(classDoc, req.body);
      if (sanitized.error) {
        return res.status(400).json({ success: false, message: sanitized.error });
      }

      const uploadError = validateMaterialUpload(sanitized.type, req.file);
      if (uploadError) {
        return res.status(400).json({ success: false, message: uploadError });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const materialId = new ObjectId().toHexString();
      const fileMeta = await uploadClassMaterialFile({
        classId: req.params.classId,
        materialId,
        file: req.file,
        uploadedByUserId: req.session?.userId || null
      });
      const newMaterial = {
        materialId,
        ...sanitized,
        file: fileMeta,
        order: existingMaterials.length,
        createdAt: new Date()
      };

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: [...existingMaterials, newMaterial],
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MATERIAL_ADDED', `Uploaded material "${newMaterial.title}" to ${classDoc.className}`);
      return res.status(201).json({
        success: true,
        material: await serializeClassMaterial(newMaterial),
        message: 'Material uploaded successfully.'
      });
    } catch (error) {
      console.error('Error uploading class material:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/:classId/materials/reorder', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const orderedMaterialIds = validateOrderedIds(req.body.materialIds, existingMaterials, 'materialId');
      if (!orderedMaterialIds) {
        return res.status(400).json({ success: false, message: 'Provide the complete ordered material list.' });
      }

      const reorderedMaterials = reorderItemsByIds(existingMaterials, orderedMaterialIds, 'materialId');
      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: reorderedMaterials,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MATERIALS_REORDERED', `Reordered materials in ${classDoc.className}`);
      return res.json({
        success: true,
        materials: await serializeClassMaterials(reorderedMaterials),
        message: 'Materials reordered successfully.'
      });
    } catch (error) {
      console.error('Error reordering class materials:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/:classId/materials/:materialId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const materialIndex = existingMaterials.findIndex((materialItem) => materialItem.materialId === req.params.materialId);
      if (materialIndex === -1) {
        return res.status(404).json({ success: false, message: 'Material not found.' });
      }

      const sanitized = sanitizeMaterialPayload(classDoc, req.body, existingMaterials[materialIndex]);
      if (sanitized.error) {
        return res.status(400).json({ success: false, message: sanitized.error });
      }

      const updatedMaterial = {
        ...existingMaterials[materialIndex],
        ...sanitized
      };
      existingMaterials[materialIndex] = updatedMaterial;

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: existingMaterials,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_MATERIAL_UPDATED', `Updated material "${updatedMaterial.title}" in ${classDoc.className}`);
      return res.json({
        success: true,
        material: await serializeClassMaterial(updatedMaterial),
        message: 'Material updated successfully.'
      });
    } catch (error) {
      console.error('Error updating class material:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.post('/:classId/materials/:materialId/upload', isAuthenticated, isTeacherOrAdmin, uploadSingleMaterialFile, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const materialIndex = existingMaterials.findIndex((materialItem) => materialItem.materialId === req.params.materialId);
      if (materialIndex === -1) {
        return res.status(404).json({ success: false, message: 'Material not found.' });
      }

      const existingMaterial = existingMaterials[materialIndex];
      const uploadError = validateMaterialUpload(existingMaterial.type, req.file);
      if (uploadError) {
        return res.status(400).json({ success: false, message: uploadError });
      }

      const oldStorageKey = existingMaterial.file?.storageKey || '';
      const fileMeta = await uploadClassMaterialFile({
        classId: req.params.classId,
        materialId: existingMaterial.materialId,
        file: req.file,
        uploadedByUserId: req.session?.userId || null
      });

      const updatedMaterial = {
        ...existingMaterial,
        file: fileMeta
      };
      existingMaterials[materialIndex] = updatedMaterial;

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: existingMaterials,
            updatedAt: new Date()
          }
        }
      );

      if (oldStorageKey) {
        deleteClassMaterialFile(oldStorageKey).catch((deleteError) => {
          console.warn('Material file cleanup failed (non-fatal):', deleteError.message);
        });
      }

      await writeLog(logsCollection, req, 'CLASS_MATERIAL_UPDATED', `Replaced file for material "${updatedMaterial.title}" in ${classDoc.className}`);
      return res.json({
        success: true,
        material: await serializeClassMaterial(updatedMaterial),
        message: 'Material file uploaded successfully.'
      });
    } catch (error) {
      console.error('Error uploading class material file:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.delete('/:classId/materials/:materialId/file', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const materialIndex = existingMaterials.findIndex((materialItem) => materialItem.materialId === req.params.materialId);
      if (materialIndex === -1) {
        return res.status(404).json({ success: false, message: 'Material not found.' });
      }

      const existingMaterial = existingMaterials[materialIndex];
      if (!existingMaterial.file?.storageKey) {
        return res.status(404).json({ success: false, message: 'No uploaded file is attached to this material.' });
      }

      const storageKey = existingMaterial.file.storageKey;
      const updatedMaterial = {
        ...existingMaterial,
        file: null
      };
      existingMaterials[materialIndex] = updatedMaterial;

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: existingMaterials,
            updatedAt: new Date()
          }
        }
      );

      await deleteClassMaterialFile(storageKey);
      await writeLog(logsCollection, req, 'CLASS_MATERIAL_UPDATED', `Removed uploaded file from material "${updatedMaterial.title}" in ${classDoc.className}`);
      return res.json({
        success: true,
        material: await serializeClassMaterial(updatedMaterial),
        message: 'Material file removed successfully.'
      });
    } catch (error) {
      console.error('Error removing class material file:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.delete('/:classId/materials/:materialId', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canManageMaterials) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage materials.' });
      }

      const existingMaterials = normalizeMaterialOrder(Array.isArray(classDoc.materials) ? classDoc.materials : []);
      const materialToDelete = existingMaterials.find((materialItem) => materialItem.materialId === req.params.materialId);
      if (!materialToDelete) {
        return res.status(404).json({ success: false, message: 'Material not found.' });
      }

      const remainingMaterials = normalizeMaterialOrder(
        existingMaterials.filter((materialItem) => materialItem.materialId !== req.params.materialId)
      );

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            materials: remainingMaterials,
            updatedAt: new Date()
          }
        }
      );

      if (materialToDelete.file?.storageKey) {
        deleteClassMaterialFile(materialToDelete.file.storageKey).catch((deleteError) => {
          console.warn('Material file cleanup failed (non-fatal):', deleteError.message);
        });
      }

      await writeLog(logsCollection, req, 'CLASS_MATERIAL_DELETED', `Deleted material "${materialToDelete.title}" from ${classDoc.className}`);
      return res.json({ success: true, message: 'Material deleted successfully.' });
    } catch (error) {
      console.error('Error deleting class material:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.get('/:classId/settings', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const classDoc = await loadOwnedClass(req, res, deps.classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);

      return res.json({
        success: true,
        currentRole: access.currentRole,
        permissions: access.permissions,
        classItem: {
          _id: String(classDoc._id),
          className: classDoc.className || 'Class',
          classCode: classDoc.classCode || '',
          status: classDoc.status || 'active',
          selfEnrollmentEnabled: classDoc.selfEnrollmentEnabled !== false
        },
        settings: {
          selfEnrollmentEnabled: classDoc.selfEnrollmentEnabled !== false,
          discussionEnabled: classDoc.settings?.discussionEnabled !== false,
          lateSubmissionPolicy: classDoc.settings?.lateSubmissionPolicy || 'allow',
          gradeVisibility: classDoc.settings?.gradeVisibility || 'after_review'
        }
      });
    } catch (error) {
      console.error('Error fetching class settings:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  router.put('/:classId/settings', isAuthenticated, isTeacherOrAdmin, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    const { classesCollection, logsCollection } = deps;

    try {
      const classDoc = await loadOwnedClass(req, res, classesCollection, req.params.classId);
      if (!classDoc) return;
      const access = getClassAccess(req, classDoc);
      if (!access.permissions.canUpdateSettings) {
        return res.status(403).json({ success: false, message: 'You do not have permission to update class settings.' });
      }

      const settings = {
        selfEnrollmentEnabled: req.body.selfEnrollmentEnabled !== false,
        discussionEnabled: req.body.discussionEnabled !== false,
        lateSubmissionPolicy: ALLOWED_LATE.includes(req.body.lateSubmissionPolicy)
          ? req.body.lateSubmissionPolicy
          : (classDoc.settings?.lateSubmissionPolicy || 'allow'),
        gradeVisibility: ALLOWED_GRADE_VIS.includes(req.body.gradeVisibility)
          ? req.body.gradeVisibility
          : (classDoc.settings?.gradeVisibility || 'after_review')
      };

      await classesCollection.updateOne(
        { _id: classDoc._id },
        {
          $set: {
            selfEnrollmentEnabled: settings.selfEnrollmentEnabled,
            settings,
            updatedAt: new Date()
          }
        }
      );

      await writeLog(logsCollection, req, 'CLASS_SETTINGS_UPDATED', `Updated settings for ${classDoc.className} (${classDoc.classCode})`);
      return res.json({ success: true, settings, message: 'Settings updated successfully.' });
    } catch (error) {
      console.error('Error updating class settings:', error);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  return router;
}

module.exports = createTeacherClassManagementContentApiRoutes;
