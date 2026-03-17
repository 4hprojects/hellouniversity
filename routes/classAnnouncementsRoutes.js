const express = require('express');
const Filter = require('bad-words');
const validator = require('validator');

function createClassAnnouncementsRoutes({
  getClassesCollection,
  getUsersCollection,
  getClassAnnouncementsCollection,
  getAnnouncementCommentsCollection,
  getAnnouncementReactionsCollection,
  ObjectId,
  isAuthenticated
}) {
  const router = express.Router();
  const filter = new Filter();

  function getDeps(res) {
    const classesCollection = getClassesCollection();
    const usersCollection = getUsersCollection();
    const classAnnouncementsCollection = getClassAnnouncementsCollection();
    const announcementCommentsCollection = getAnnouncementCommentsCollection();
    const announcementReactionsCollection = getAnnouncementReactionsCollection();

    if (
      !classesCollection
      || !usersCollection
      || !classAnnouncementsCollection
      || !announcementCommentsCollection
      || !announcementReactionsCollection
    ) {
      res.status(503).json({ success: false, message: 'Service unavailable. Please try again.' });
      return null;
    }

    return {
      classesCollection,
      usersCollection,
      classAnnouncementsCollection,
      announcementCommentsCollection,
      announcementReactionsCollection
    };
  }

  function toIdString(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value.toHexString === 'function') return value.toHexString();
    return String(value);
  }

  function normalizeClassStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['draft', 'active', 'archived'].includes(normalized)) {
      return normalized;
    }
    return 'active';
  }

  function sanitizeText(value) {
    return validator.escape(filter.clean(String(value || '').trim()));
  }

  function isArchivedClass(classDoc) {
    return normalizeClassStatus(classDoc?.status) === 'archived';
  }

  function getSessionUserId(req) {
    return String(req.session?.userId || '').trim();
  }

  function getSessionRole(req) {
    return String(req.session?.role || '').trim().toLowerCase();
  }

  function isAdminSession(req) {
    return getSessionRole(req) === 'admin';
  }

  function isOwnerSession(req, classDoc) {
    return toIdString(classDoc?.instructorId) === getSessionUserId(req);
  }

  function isActiveTeachingTeamSession(req, classDoc) {
    const currentUserId = getSessionUserId(req);
    if (!currentUserId) {
      return false;
    }

    return Array.isArray(classDoc?.teachingTeam) && classDoc.teachingTeam.some((member) => (
      String(member?.status || '').trim().toLowerCase() === 'active'
      && toIdString(member?.userId) === currentUserId
    ));
  }

  function isEnrolledStudentSession(req, classDoc) {
    const studentId = String(req.session?.studentIDNumber || '').trim();
    return Boolean(
      studentId
      && Array.isArray(classDoc?.students)
      && classDoc.students.includes(studentId)
    );
  }

  async function loadActorProfile(req, usersCollection) {
    const sessionName = `${req.session?.firstName || ''} ${req.session?.lastName || ''}`.trim();
    if (sessionName) {
      return {
        userId: getSessionUserId(req),
        name: sanitizeText(sessionName),
        role: getSessionRole(req) || 'user'
      };
    }

    let user = null;
    if (ObjectId.isValid(getSessionUserId(req))) {
      user = await usersCollection.findOne(
        { _id: new ObjectId(getSessionUserId(req)) },
        { projection: { firstName: 1, lastName: 1, studentIDNumber: 1 } }
      );
    }

    if (!user && req.session?.studentIDNumber) {
      user = await usersCollection.findOne(
        { studentIDNumber: String(req.session.studentIDNumber).trim() },
        { projection: { firstName: 1, lastName: 1, studentIDNumber: 1 } }
      );
    }

    const fallbackName = sessionName
      || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
      || req.session?.studentIDNumber
      || 'HelloUniversity User';

    return {
      userId: getSessionUserId(req),
      name: sanitizeText(fallbackName),
      role: getSessionRole(req) || 'user'
    };
  }

  async function loadClassAccessContext(req, res, deps, classId) {
    if (!ObjectId.isValid(classId)) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return null;
    }

    const classDoc = await deps.classesCollection.findOne({ _id: new ObjectId(classId) });
    if (!classDoc) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return null;
    }

    const isOwner = isOwnerSession(req, classDoc);
    const isAdmin = isAdminSession(req);
    const isActiveTeam = isActiveTeachingTeamSession(req, classDoc);
    const isEnrolledStudent = isEnrolledStudentSession(req, classDoc);

    const canRead = isAdmin || isOwner || isActiveTeam || isEnrolledStudent;
    if (!canRead) {
      res.status(404).json({ success: false, message: 'Class not found.' });
      return null;
    }

    const archived = isArchivedClass(classDoc);

    return {
      classDoc,
      isAdmin,
      isOwner,
      isActiveTeam,
      isEnrolledStudent,
      permissions: {
        canPostAnnouncement: isOwner && !archived,
        canComment: (isOwner || isEnrolledStudent) && !archived,
        canReact: (isOwner || isEnrolledStudent) && !archived,
        isReadOnly: archived
      }
    };
  }

  function ensureWritableClass(res, access) {
    if (!access || !access.permissions?.isReadOnly) {
      return true;
    }

    res.status(409).json({ success: false, message: 'This class is archived and read-only.' });
    return false;
  }

  async function serializeFeed(req, deps, access) {
    const classId = access.classDoc._id;
    const viewerUserId = getSessionUserId(req);
    const announcements = await deps.classAnnouncementsCollection
      .find({ classId })
      .sort({ createdAt: -1 })
      .toArray();

    const announcementIds = announcements.map((item) => item._id);
    const comments = announcementIds.length
      ? await deps.announcementCommentsCollection
        .find({ announcementId: { $in: announcementIds } })
        .sort({ createdAt: 1 })
        .toArray()
      : [];
    const reactions = announcementIds.length
      ? await deps.announcementReactionsCollection.find({
        announcementId: { $in: announcementIds },
        reactionType: 'like'
      }).toArray()
      : [];

    const commentsByAnnouncementId = new Map();
    comments.forEach((comment) => {
      const key = toIdString(comment.announcementId);
      if (!commentsByAnnouncementId.has(key)) {
        commentsByAnnouncementId.set(key, []);
      }
      commentsByAnnouncementId.get(key).push({
        id: toIdString(comment._id),
        body: comment.body || '',
        author: {
          name: comment.authorName || 'HelloUniversity User',
          role: comment.authorRole || 'user'
        },
        createdAt: comment.createdAt || null,
        canDelete: !access.permissions.isReadOnly && (
          access.isOwner
          || String(comment.authorUserId || '') === viewerUserId
        )
      });
    });

    const reactionsByAnnouncementId = new Map();
    reactions.forEach((reaction) => {
      const key = toIdString(reaction.announcementId);
      if (!reactionsByAnnouncementId.has(key)) {
        reactionsByAnnouncementId.set(key, []);
      }
      reactionsByAnnouncementId.get(key).push(reaction);
    });

    return announcements.map((announcement) => {
      const key = toIdString(announcement._id);
      const announcementComments = commentsByAnnouncementId.get(key) || [];
      const announcementReactions = reactionsByAnnouncementId.get(key) || [];
      const viewerHasLiked = announcementReactions.some((reaction) => String(reaction.userId || '') === viewerUserId);

      return {
        id: key,
        title: announcement.title || '',
        body: announcement.body || '',
        author: {
          name: announcement.authorName || 'HelloUniversity User',
          role: announcement.authorRole || 'user'
        },
        createdAt: announcement.createdAt || null,
        updatedAt: announcement.updatedAt || null,
        likeCount: announcementReactions.length,
        viewerHasLiked,
        commentCount: announcementComments.length,
        canEdit: access.isOwner && !access.permissions.isReadOnly,
        canDelete: access.isOwner && !access.permissions.isReadOnly,
        comments: announcementComments
      };
    });
  }

  async function loadAnnouncement(res, deps, classDoc, announcementId) {
    if (!ObjectId.isValid(announcementId)) {
      res.status(404).json({ success: false, message: 'Announcement not found.' });
      return null;
    }

    const announcementDoc = await deps.classAnnouncementsCollection.findOne({
      _id: new ObjectId(announcementId),
      classId: classDoc._id
    });

    if (!announcementDoc) {
      res.status(404).json({ success: false, message: 'Announcement not found.' });
      return null;
    }

    return announcementDoc;
  }

  async function loadComment(res, deps, classDoc, announcementDoc, commentId) {
    if (!ObjectId.isValid(commentId)) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return null;
    }

    const commentDoc = await deps.announcementCommentsCollection.findOne({
      _id: new ObjectId(commentId),
      classId: classDoc._id,
      announcementId: announcementDoc._id
    });

    if (!commentDoc) {
      res.status(404).json({ success: false, message: 'Comment not found.' });
      return null;
    }

    return commentDoc;
  }

  router.get('/:classId/announcements', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;

      const announcements = await serializeFeed(req, deps, access);
      return res.json({
        success: true,
        classId: toIdString(access.classDoc._id),
        permissions: access.permissions,
        announcements
      });
    } catch (error) {
      console.error('Error loading class announcements:', error);
      return res.status(500).json({ success: false, message: 'Unable to load announcements right now.' });
    }
  });

  router.post('/:classId/announcements', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;
      if (!ensureWritableClass(res, access)) return;
      if (!access.permissions.canPostAnnouncement) {
        return res.status(403).json({ success: false, message: 'Only the class owner can post announcements.' });
      }

      const title = sanitizeText(req.body?.title);
      const body = sanitizeText(req.body?.body);
      if (!title || !body) {
        return res.status(400).json({ success: false, message: 'Announcement title and body are required.' });
      }

      const actor = await loadActorProfile(req, deps.usersCollection);
      const now = new Date();

      await deps.classAnnouncementsCollection.insertOne({
        classId: access.classDoc._id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        title,
        body,
        createdAt: now,
        updatedAt: now
      });

      return res.status(201).json({ success: true, message: 'Announcement posted successfully.' });
    } catch (error) {
      console.error('Error creating announcement:', error);
      return res.status(500).json({ success: false, message: 'Unable to post announcement right now.' });
    }
  });

  router.put('/:classId/announcements/:announcementId', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;
      if (!ensureWritableClass(res, access)) return;
      if (!access.permissions.canPostAnnouncement) {
        return res.status(403).json({ success: false, message: 'Only the class owner can edit announcements.' });
      }

      const announcementDoc = await loadAnnouncement(res, deps, access.classDoc, req.params.announcementId);
      if (!announcementDoc) return;

      const title = sanitizeText(req.body?.title);
      const body = sanitizeText(req.body?.body);
      if (!title || !body) {
        return res.status(400).json({ success: false, message: 'Announcement title and body are required.' });
      }

      await deps.classAnnouncementsCollection.updateOne(
        { _id: announcementDoc._id },
        {
          $set: {
            title,
            body,
            updatedAt: new Date()
          }
        }
      );

      return res.json({ success: true, message: 'Announcement updated successfully.' });
    } catch (error) {
      console.error('Error updating announcement:', error);
      return res.status(500).json({ success: false, message: 'Unable to update announcement right now.' });
    }
  });

  router.delete('/:classId/announcements/:announcementId', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;
      if (!ensureWritableClass(res, access)) return;
      if (!access.permissions.canPostAnnouncement) {
        return res.status(403).json({ success: false, message: 'Only the class owner can delete announcements.' });
      }

      const announcementDoc = await loadAnnouncement(res, deps, access.classDoc, req.params.announcementId);
      if (!announcementDoc) return;

      await deps.classAnnouncementsCollection.deleteMany({ _id: announcementDoc._id });
      await deps.announcementCommentsCollection.deleteMany({ announcementId: announcementDoc._id });
      await deps.announcementReactionsCollection.deleteMany({ announcementId: announcementDoc._id });

      return res.json({ success: true, message: 'Announcement deleted successfully.' });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      return res.status(500).json({ success: false, message: 'Unable to delete announcement right now.' });
    }
  });

  router.post('/:classId/announcements/:announcementId/comments', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;
      if (!ensureWritableClass(res, access)) return;
      if (!access.permissions.canComment) {
        return res.status(403).json({ success: false, message: 'You cannot comment in this class.' });
      }

      const announcementDoc = await loadAnnouncement(res, deps, access.classDoc, req.params.announcementId);
      if (!announcementDoc) return;

      const body = sanitizeText(req.body?.body);
      if (!body) {
        return res.status(400).json({ success: false, message: 'Comment body is required.' });
      }

      const actor = await loadActorProfile(req, deps.usersCollection);
      const now = new Date();

      await deps.announcementCommentsCollection.insertOne({
        classId: access.classDoc._id,
        announcementId: announcementDoc._id,
        authorUserId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        body,
        createdAt: now,
        updatedAt: now
      });

      return res.status(201).json({ success: true, message: 'Comment posted successfully.' });
    } catch (error) {
      console.error('Error posting announcement comment:', error);
      return res.status(500).json({ success: false, message: 'Unable to post comment right now.' });
    }
  });

  router.delete('/:classId/announcements/:announcementId/comments/:commentId', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;
      if (!ensureWritableClass(res, access)) return;

      const announcementDoc = await loadAnnouncement(res, deps, access.classDoc, req.params.announcementId);
      if (!announcementDoc) return;
      const commentDoc = await loadComment(res, deps, access.classDoc, announcementDoc, req.params.commentId);
      if (!commentDoc) return;

      const isCommentOwner = String(commentDoc.authorUserId || '') === getSessionUserId(req);
      if (!access.isOwner && !isCommentOwner) {
        return res.status(403).json({ success: false, message: 'You cannot delete this comment.' });
      }

      await deps.announcementCommentsCollection.deleteMany({ _id: commentDoc._id });
      return res.json({ success: true, message: 'Comment deleted successfully.' });
    } catch (error) {
      console.error('Error deleting announcement comment:', error);
      return res.status(500).json({ success: false, message: 'Unable to delete comment right now.' });
    }
  });

  router.post('/:classId/announcements/:announcementId/reactions/like', isAuthenticated, async (req, res) => {
    const deps = getDeps(res);
    if (!deps) return;

    try {
      const access = await loadClassAccessContext(req, res, deps, req.params.classId);
      if (!access) return;
      if (!ensureWritableClass(res, access)) return;
      if (!access.permissions.canReact) {
        return res.status(403).json({ success: false, message: 'You cannot react in this class.' });
      }

      const announcementDoc = await loadAnnouncement(res, deps, access.classDoc, req.params.announcementId);
      if (!announcementDoc) return;

      const userId = getSessionUserId(req);
      const existingReaction = await deps.announcementReactionsCollection.findOne({
        classId: access.classDoc._id,
        announcementId: announcementDoc._id,
        userId,
        reactionType: 'like'
      });

      if (existingReaction) {
        await deps.announcementReactionsCollection.deleteMany({ _id: existingReaction._id });
        return res.json({ success: true, liked: false, message: 'Like removed.' });
      }

      await deps.announcementReactionsCollection.insertOne({
        classId: access.classDoc._id,
        announcementId: announcementDoc._id,
        userId,
        reactionType: 'like',
        createdAt: new Date()
      });

      return res.json({ success: true, liked: true, message: 'Announcement liked.' });
    } catch (error) {
      console.error('Error toggling announcement like:', error);
      return res.status(500).json({ success: false, message: 'Unable to update reaction right now.' });
    }
  });

  return router;
}

module.exports = createClassAnnouncementsRoutes;
