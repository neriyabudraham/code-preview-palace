
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
        const isCustomDomain = currentHost !== 'page.neriyabudraham.co.il' && 
                              currentHost !== 'localhost' && 
                              currentHost !== '127.0.0.1';
        
        console.log('Current host:', currentHost, 'Is custom domain:', isCustomDomain);
        
        let query = supabase
          .from('published_pages')
          .select('html_content, title, custom_domain')
          .eq('slug', slug);
        
        // If accessing via custom domain, filter by that domain
        if (isCustomDomain) {
          query = query.eq('custom_domain', currentHost);
        }
        
        const { data: page, error: dbError } = await query.maybeSingle();

        if (dbError) {
          console.error('Database error:', dbError);
          setError("שגיאה בטעינת הדף");
          setLoading(false);
          return;
        }

        if (!page) {
          console.log('Page not found for slug:', slug, 'and domain:', currentHost);
          setError("הדף לא נמצא");
          setLoading(false);
          return;
        }

        console.log('Page loaded successfully:', page.title, 'Domain:', page.custom_domain);
        
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
