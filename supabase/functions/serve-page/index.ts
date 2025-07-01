
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.pathname.split('/').pop()

    if (!slug) {
      return new Response('Page not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the published page by slug
    const { data: page, error } = await supabase
      .from('published_pages')
      .select('html_content, title')
      .eq('slug', slug)
      .single()

    if (error || !page) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>דף לא נמצא</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                .container {
                    background: rgba(255,255,255,0.1);
                    padding: 3rem;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                }
                h1 {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.9;
                }
                p {
                    font-size: 1.2rem;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>404</h1>
                <p>הדף שחיפשת לא נמצא</p>
                <p>יתכן שהקישור שגוי או שהדף הוסר</p>
            </div>
        </body>
        </html>
      `, { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Return the HTML content
    return new Response(page.html_content, {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Error serving page:', error)
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})
