
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Request received:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    console.log('URL pathname:', url.pathname);
    
    // Extract slug from pathname more reliably
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    let slug = '';
    
    if (pathParts.length > 0) {
      // If called directly (e.g., /serve-page/myslug or just /myslug)
      slug = pathParts[pathParts.length - 1];
      if (slug === 'serve-page' && pathParts.length > 1) {
        slug = pathParts[pathParts.length - 2];
      }
    }
    
    // Fallback to search params
    if (!slug || slug === 'serve-page') {
      slug = url.searchParams.get('slug') || '';
    }
    
    console.log('Extracted slug:', slug);

    if (!slug) {
      console.log('No slug found, returning 404');
      return new Response('Page not found', { 
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      })
    }

    // Initialize Supabase client with service role key and bypass auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL configured:', !!supabaseUrl);
    console.log('Supabase Service Key configured:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response('Server configuration error', { 
        status: 500,
        headers: corsHeaders
      });
    }

    // Create client with service role key and bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the published page by slug using service role to bypass RLS
    console.log('Querying for slug:', slug);
    const { data: page, error } = await supabase
      .from('published_pages')
      .select('html_content, title')
      .eq('slug', slug)
      .maybeSingle();

    console.log('Query result:', { page: !!page, error });

    if (error) {
      console.error('Database error:', error);
      return new Response('Database error', { 
        status: 500,
        headers: corsHeaders
      });
    }

    if (!page) {
      console.log('Page not found in database for slug:', slug);
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
                .debug {
                    font-size: 0.8rem;
                    opacity: 0.6;
                    margin-top: 2rem;
                    font-family: monospace;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>404</h1>
                <p>הדף שחיפשת לא נמצא</p>
                <p>יתכן שהקישור שגוי או שהדף הוסר</p>
                <div class="debug">
                    <p>נחפש עבור: ${slug}</p>
                    <p>נתיב: ${url.pathname}</p>
                    <p>שעה: ${new Date().toLocaleString('he-IL')}</p>
                </div>
            </div>
        </body>
        </html>
      `, { 
        status: 404,
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      })
    }

    console.log('Serving page for slug:', slug);
    
    // Make sure the HTML content is properly encoded
    const htmlContent = page.html_content;
    
    // Return the HTML content with proper headers for rendering
    return new Response(htmlContent, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        // Add additional headers to ensure proper rendering
        'X-Content-Type-Options': 'nosniff'
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response('Internal Server Error', { 
      status: 500,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8'
      }
    })
  }
})
