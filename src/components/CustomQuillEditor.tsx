'use client'
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Import Quill dinamis untuk menghindari error SSR
const ReactQuill = dynamic(
  async () => {
    // Import ReactQuill without trying to import the CSS
    const { default: RQ } = await import('react-quill-new');
    return RQ;
  },
  {
    ssr: false,
    loading: () => <div className="h-64 w-full flex items-center justify-center bg-base-300 animate-pulse rounded-lg">Loading editor...</div>
  }
);

interface QuillEditorProps {
  data: string;
  onChange: (data: string) => void;
}

const CustomQuillEditor: React.FC<QuillEditorProps> = ({ data, onChange }) => {
  const [mounted, setMounted] = useState(false);
  const [editorValue, setEditorValue] = useState('');

  // Initialize component on client-side only
  useEffect(() => {
    setMounted(true);
    // Set initial editor value
    setEditorValue(data || '');
    
    // Manually inject Quill CSS
    if (typeof document !== 'undefined' && !document.getElementById('quill-css')) {
      const link = document.createElement('link');
      link.id = 'quill-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
      document.head.appendChild(link);
    }
  }, []);

  // Update editor value when prop data changes
  useEffect(() => {
    if (mounted && data !== editorValue) {
      console.log('Updating editor value from prop data:', data);
      setEditorValue(data || '');
    }
  }, [data, mounted, editorValue]);

  // Handle changes to editor content
  const handleChange = (content: string, delta: any, source: string, editor: any) => {
    console.log('Editor content changed:', content);
    setEditorValue(content);
    onChange(content);
  };

  // Quill modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['link'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['blockquote'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
      matchers: [],
    },
    keyboard: {
      bindings: {
        tab: {
          key: 9,
          handler: function (this: any, range: any, context: any) {
            this.quill.format('indent', '+1', 'user');
            return false;
          }
        },
        'shift+tab': {
          key: 9,
          shiftKey: true,
          handler: function (this: any, range: any, context: any) {
            this.quill.format('indent', '-1', 'user');
            return false;
          }
        }
      }
    }
  };

  // Formats configuration - IMPORTANT: Use only the parent 'list' format
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'link',
    'list',  // Only use the parent format
    'indent',
    'blockquote'
  ];

  if (!mounted) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-base-300 rounded-lg">
        <div className="loading loading-spinner loading-md"></div>
      </div>
    );
  }

  return (
    <div className="quill-editor-wrapper rounded-lg overflow-hidden">
      <div className="border border-base-300 quill-editor-container">
        <ReactQuill
          theme="snow"
          value={editorValue}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder="Tulis teks ayat di sini..."
        />
      </div>
      <style jsx global>{`
        /* Styling untuk Quill editor */
        .quill-editor-wrapper .ql-editor {
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          font-size: 1rem;
          white-space: pre-wrap;
        }

        /* Custom styling untuk indentasi */
        .ql-editor .ql-indent-1 {
          padding-left: 3em !important;
        }
        .ql-editor .ql-indent-2 {
          padding-left: 6em !important;
        }
        .ql-editor .ql-indent-3 {
          padding-left: 9em !important;
        }

        /* Styling untuk tombol toolbar */
        .ql-toolbar.ql-snow {
          border-color: var(--border-color, #e2e8f0);
          background-color: var(--toolbar-bg, #f8fafc);
        }
        
        /* Make buttons more visible */
        .ql-toolbar.ql-snow .ql-formats button {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* Styling untuk tombol indent/outdent */
        .ql-toolbar.ql-snow .ql-indent[value="-1"],
        .ql-toolbar.ql-snow .ql-indent[value="+1"] {
          opacity: 1 !important;
        }
        
        /* Fix container */
        .quill {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
};

export default CustomQuillEditor; 