const { createClient } = require('@supabase/supabase-js');

// SERVER-SIDE ONLY — SUPABASE_SERVICE_ROLE must never be exposed to the browser or bundled client code.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

module.exports = { supabase };