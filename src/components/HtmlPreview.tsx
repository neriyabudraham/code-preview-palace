
import { useEffect, useRef } from "react";

interface HtmlPreviewProps {
  html: string;
}

export const HtmlPreview = ({ html }: HtmlPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    if (html.trim()) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      // Show empty state when no HTML content
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>תצוגה מקדימה</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 40px;
                    background: #f8f9fa;
                    color: #6c757d;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                }
                .empty-message {
                    text-align: center;
                    opacity: 0.6;
                }
            </style>
        </head>
        <body>
            <div class="empty-message">
                תצוגה מקדימה תופיע כאן לאחר הזנת קוד HTML
            </div>
        </body>
        </html>
      `);
      doc.close();
    }
  }, [html]);

  return (
    <div className="h-full border border-gray-600 rounded-lg overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        sandbox="allow-scripts allow-same-origin"
        title="HTML Preview"
      />
    </div>
  );
};
