const { supabase } = require('../supabaseClient');

async function logAuditTrail({
  req,
  action,
  userNameFallback = 'admin',
  userIdOverride,
  userRoleOverride,
  userNameOverride,
  details
}) {
  const user_id = userIdOverride || req.user?.studentIDNumber || req.user?.userId || 'admin';
  const user_role = userRoleOverride || req.user?.role || 'admin';
  const user_name = userNameOverride || req.user?.name || userNameFallback || 'admin';

  await supabase
    .from('audit_trail')
    .insert([{
      user_id,
      user_role,
      user_name,
      action,
      details, // <-- add this column to your DB if not present
      user_agent: req.headers['user-agent'],
      ip_address: req.ip
    }]);
}

module.exports = { logAuditTrail };