
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { slug, referrer } = await req.json()
    
    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get visitor info from headers
    const userAgent = req.headers.get('user-agent') || null
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || null

    console.log('Tracking visit for slug:', slug, 'IP:', ipAddress)

    // Get the published page ID from the slug
    const { data: publishedPage, error: pageError } = await supabase
      .from('published_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (pageError) {
      console.error('Error finding published page:', pageError)
      return new Response(
        JSON.stringify({ error: 'Failed to find page' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert visit record
    const { error: insertError } = await supabase
      .from('page_visits')
      .insert({
        published_page_id: publishedPage?.id || null,
        slug,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer || null
      })

    if (insertError) {
      console.error('Error inserting visit:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to track visit' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Visit tracked successfully for slug:', slug)

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in track-visit function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
