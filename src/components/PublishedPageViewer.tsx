
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const PublishedPageViewer = () => {
  const { slug } = useParams();
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) {
        setError("לא נמצא מזהה דף");
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching page for slug:', slug);
        
        // Fetch the published page directly from the database
        const { data: page, error: dbError } = await supabase
          .from('published_pages')
          .select('html_content, title')
          .eq('slug', slug)
          .maybeSingle();

        if (dbError) {
          console.error('Database error:', dbError);
          setError("שגיאה בטעינת הדף");
          setLoading(false);
          return;
        }

        if (!page) {
          console.log('Page not found for slug:', slug);
          setError("הדף לא נמצא");
          setLoading(false);
          return;
        }

        console.log('Page loaded successfully:', page.title);
        
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">טוען דף...</p>
        </div>
      </div>
    );
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

  // Render the HTML content directly
  return (
    <div 
      className="w-full h-screen"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
