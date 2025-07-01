
import { useEffect, useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const CodeEditor = ({ value, onChange }: CodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      onChange(textarea.value);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    };

    textarea.addEventListener('input', handleInput);
    textarea.addEventListener('keydown', handleKeyDown);

    return () => {
      textarea.removeEventListener('input', handleInput);
      textarea.removeEventListener('keydown', handleKeyDown);
    };
  }, [value, onChange]);

  return (
    <div className="h-full">
      <textarea
        ref={textareaRef}
        value={value}
        className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm p-4 border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
        placeholder="הזן כאן את קוד ה-html שלך..."
        style={{
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineHeight: '1.5',
          tabSize: 2,
        }}
      />
    </div>
  );
};
