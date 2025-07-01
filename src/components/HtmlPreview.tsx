
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

    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div className="h-full border border-gray-600 rounded-lg overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        sandbox="allow-scripts"
        title="HTML Preview"
      />
    </div>
  );
};
