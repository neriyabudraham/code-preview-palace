import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Sending password reset email to:', email);

    // Send password reset email using Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get('origin') || 'https://html-to-site.lovable.app'}/auth`
    });

    if (error) {
      console.error('Error sending password reset:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Password reset email sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('Error in send-password-reset function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});