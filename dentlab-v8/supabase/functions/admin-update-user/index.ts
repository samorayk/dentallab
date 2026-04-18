// Supabase Edge Function: admin-update-user
// Allows lab admin to change any user's password via the Admin API.
// Deploy with: supabase functions deploy admin-update-user --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify caller is authenticated and is an admin of their lab
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Create regular client to verify caller's role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Check caller is admin
    const { data: profile } = await supabase.from('profiles').select('role, lab_id').eq('id', user.id).single();
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    const { userId, password } = await req.json();
    if (!userId || !password) return new Response(JSON.stringify({ error: 'userId and password required' }), { status: 400, headers: corsHeaders });

    // Verify target user belongs to same lab
    const { data: targetProfile } = await supabase.from('profiles').select('lab_id').eq('id', userId).single();
    if (targetProfile?.lab_id !== profile.lab_id) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    // Use service role to update password
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
