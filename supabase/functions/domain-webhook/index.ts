import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const WEBHOOK_URL = 'https://n8n.neriyabudraham.co.il/webhook/30e8d3b2-4ba9-401d-997e-be55ded4f363';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, domain, action } = await req.json();

    if (!userId || !domain || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Processing domain webhook:', { userId, domain, action });

    // Get user details
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      timestamp: new Date().toISOString(),
      action: action,
      user: {
        id: userId,
        email: userProfile.email,
        full_name: userProfile.full_name
      },
      domain: {
        name: domain,
        added_at: new Date().toISOString()
      }
    };

    console.log('Sending webhook payload:', webhookPayload);

    // Send webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    // Log webhook attempt
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_url: WEBHOOK_URL,
        payload: webhookPayload,
        response_status: webhookResponse.status,
        response_body: await webhookResponse.text(),
        user_id: userId
      });

    console.log('Webhook sent with status:', webhookResponse.status);

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhook_status: webhookResponse.status 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('Error in domain-webhook function:', error);
    
    // Log error to webhook_logs
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_url: WEBHOOK_URL,
        payload: { error: error.message },
        response_status: 500,
        response_body: 'Internal server error'
      });

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});