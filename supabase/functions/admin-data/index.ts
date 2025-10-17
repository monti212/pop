import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Initialize Supabase client with service role key for RLS bypass
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false, // Important for server-side functions
  },
});

// Helper function to check if user has admin privileges
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('team_role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error checking user admin status:', error);
      return false;
    }
    
    // Admin roles: optimus_prime, prime only
    // autobot users get Uhuru Plus features but NOT admin access
    return profile.team_role === 'optimus_prime' ||
           profile.team_role === 'prime';
  } catch (error) {
    console.error('Error in isUserAdmin:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Authenticate the user using the JWT from the request header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the authenticated user has admin privileges
    const hasAdminAccess = await isUserAdmin(user.id);
    if (!hasAdminAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Insufficient privileges' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate dates for filtering
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();

    // Fetch total user count
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) throw totalUsersError;

    // Fetch active users (logged in within last 30 days)
    const { count: activeUsers, error: activeUsersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', thirtyDaysAgo);

    if (activeUsersError) throw activeUsersError;

    // Fetch dormant users (not logged in for 30+ days)
    const { count: dormantUsers, error: dormantUsersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .lt('last_active_at', thirtyDaysAgo);

    if (dormantUsersError) throw dormantUsersError;

    // Fetch users created in the last 7 days
    const { count: newUsersLast7Days, error: newUsers7DaysError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    if (newUsers7DaysError) throw newUsers7DaysError;

    // Fetch users created in the last 30 days
    const { count: newUsersLast30Days, error: newUsers30DaysError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    if (newUsers30DaysError) throw newUsers30DaysError;

    return new Response(
      JSON.stringify({
        totalUsers,
        activeUsers,
        dormantUsers,
        newUsersLast7Days,
        newUsersLast30Days,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in admin-data function:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});