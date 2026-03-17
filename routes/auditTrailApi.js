// \routes\auditTrailApi.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

router.get('/audit-trail', isAdminOrManager, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  let limit = req.query.limit === 'all' ? 1000000 : parseInt(req.query.limit) || 50;
  const search = req.query.search || '';
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;

  let query = supabase
    .from('audit_trail')
    .select('user_name, user_role, action, action_time, ip_address, details', { count: 'exact' });

  if (search) {
    query = query.or(
      `user_name.ilike.%${search}%,user_role.ilike.%${search}%,action.ilike.%${search}%,details.ilike.%${search}%`
    );
  }
  if (dateFrom) query = query.gte('action_time', dateFrom);
  if (dateTo) query = query.lte('action_time', dateTo);

  const start = (page - 1) * limit;
  query = query.range(start, start + limit - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ logs: [], totalPages: 1 });
  const totalPages = Math.max(1, Math.ceil(count / limit));
  res.json({ logs: data, totalPages, count });
});

module.exports = router;
