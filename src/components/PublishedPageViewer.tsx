
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PublishedPageViewer = () => {
  const { slug } = useParams();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setError("לא נמצא מזהה דף");
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching page for slug:', slug);
        
        // Get the current hostname to check if it's a custom domain
        const currentHost = window.location.hostname;
        const isCustomDomain = currentHost !== 'html-to-site.lovable.app' && 
                              currentHost !== 'page.neriyabudraham.co.il' &&
                              currentHost !== 'localhost' && 
                              currentHost !== '127.0.0.1';
        
        console.log('Current host:', currentHost, 'Is custom domain:', isCustomDomain);
        
        // With the new schema, we can query directly using the generated slug_id
        // The slug_id will be automatically generated as domain/slug
        const expectedSlugId = `${currentHost}/${slug}`;
        
        console.log('Looking for slug_id:', expectedSlugId);
        
        let query = supabase
          .from('published_pages')
          .select('html_content, title, custom_domain, slug_id')
          .eq('slug_id', expectedSlugId);
        
        const { data: page, error: dbError } = await query.maybeSingle();

        if (dbError) {
          console.error('Database error:', dbError);
          setError("שגיאה בטעינת הדף");
          setLoading(false);
          return;
        }

        if (!page) {
          console.log('Page not found for slug_id:', expectedSlugId);
          // If not found with exact slug_id, try fallback for default domain pages accessed via custom domain
          if (isCustomDomain) {
            console.log('Trying fallback for default domain...');
            const fallbackSlugId = `html-to-site.lovable.app/${slug}`;
            const { data: fallbackPage, error: fallbackError } = await supabase
              .from('published_pages')
              .select('html_content, title, custom_domain, slug_id')
              .eq('slug_id', fallbackSlugId)
              .maybeSingle();
            
            if (fallbackError) {
              console.error('Fallback query error:', fallbackError);
              setError("הדף לא נמצא");
              setLoading(false);
              return;
            }
            
            if (fallbackPage) {
              console.log('Found page with fallback slug_id:', fallbackSlugId);
              setHtmlContent(fallbackPage.html_content);
              setLoading(false);
              if (fallbackPage.title) {
                document.title = fallbackPage.title;
              }
              return;
            }
          }
          
          setError("הדף לא נמצא");
          setLoading(false);
          return;
        }

        console.log('Page loaded successfully:', page.title, 'Slug ID:', page.slug_id);
        
        // Ensure proper HTML structure
        let htmlContent = page.html_content;
        
        // Make sure we have proper DOCTYPE and charset
        if (!htmlContent.includes('<!DOCTYPE html>')) {
          htmlContent = '<!DOCTYPE html>\n' + htmlContent;
        }
        
        // Ensure UTF-8 charset is properly set
        if (!htmlContent.includes('<meta charset="UTF-8">') && !htmlContent.includes('charset=utf-8')) {
          htmlContent = htmlContent.replace(
            '<head>',
            '<head>\n  <meta charset="UTF-8">'
          );
        }

        setHtmlContent(htmlContent);
        setLoading(false);

        // Update page title if available
        if (page.title) {
          document.title = page.title;
        }

      } catch (err) {
        console.error('Error fetching page:', err);
        setError("שגיאה בטעינת הדף");
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  // Use iframe to properly render HTML content
  useEffect(() => {
    if (htmlContent && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }
    }
  }, [htmlContent]);

  // Don't show anything while loading - just wait
  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl mb-2">{error}</p>
          <p className="text-gray-400">יתכן שהקישור שגוי או שהדף הוסר</p>
        </div>
      </div>
    );
  }

  // Render the HTML content using iframe for proper isolation and rendering
  return (
    <iframe
      ref={iframeRef}
      className="w-full h-screen border-0"
      title="Published Page"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  );
};
