// \routes\auditTrailApi.js
const express = require('express');
const router = express.Router();
const {
  requireCsrf,
  requireRateLimit,
  requireRole,
} = require('../middleware/apiSecurity');
const { logAuditTrail } = require('../utils/auditTrail');
const {
  parseLimit,
  parsePositiveInteger,
  sanitizeSupabaseSearch,
} = require('../utils/requestParsers');
const { supabase } = require('../supabaseClient');

const AUDIT_TRAIL_SELECT =
  'user_name, user_role, action, action_time, ip_address, details';
const SORTABLE_AUDIT_FIELDS = new Set([
  'user_name',
  'user_role',
  'action',
  'action_time',
  'ip_address',
  'details',
]);
const DEFAULT_SORT_FIELD = 'action_time';
const DEFAULT_SORT_ORDER = 'desc';

function parseAuditSort(query) {
  const requestedField = String(query.sortField || '').trim();
  const requestedOrder = String(query.sortOrder || '')
    .trim()
    .toLowerCase();

  return {
    sortField: SORTABLE_AUDIT_FIELDS.has(requestedField)
      ? requestedField
      : DEFAULT_SORT_FIELD,
    sortOrder: requestedOrder === 'asc' ? 'asc' : DEFAULT_SORT_ORDER,
  };
}

router.get(
  '/audit-trail',
  requireRole('admin', 'manager'),
  async (req, res) => {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = parseLimit(req.query.limit, {
      fallback: 50,
      max: 1000,
    });
    const search = sanitizeSupabaseSearch(req.query.search);
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const { sortField, sortOrder } = parseAuditSort(req.query);

    let query = supabase
      .from('audit_trail')
      .select(AUDIT_TRAIL_SELECT, { count: 'exact' });

    if (search) {
      query = query.or(
        `user_name.ilike.%${search}%,user_role.ilike.%${search}%,action.ilike.%${search}%,details.ilike.%${search}%`,
      );
    }
    if (dateFrom) query = query.gte('action_time', dateFrom);
    if (dateTo) query = query.lte('action_time', dateTo);

    const start = (page - 1) * limit;
    query = query
      .order(sortField, { ascending: sortOrder === 'asc' })
      .range(start, start + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      return res.status(500).json({ logs: [], totalPages: 1, count: 0 });
    }
    const safeCount = Number.isFinite(count) ? count : 0;
    const totalPages = Math.max(1, Math.ceil(safeCount / limit));
    return res.json({ logs: data || [], totalPages, count: safeCount });
  },
);

router.post(
  '/audit-trail',
  requireRole('admin', 'manager'),
  requireCsrf,
  requireRateLimit('audit-write'),
  async (req, res) => {
    const action = String(req.body?.action || '').trim();
    const details =
      typeof req.body?.details === 'string' ? req.body.details.trim() : '';

    if (!action) {
      return res
        .status(400)
        .json({ success: false, message: 'Action is required.' });
    }

    try {
      await logAuditTrail({
        req,
        action,
        details,
      });
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/audit-trail:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to write audit trail entry.',
      });
    }
  },
);

module.exports = router;
