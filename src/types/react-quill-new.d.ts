declare module 'react-quill-new' {
  import { ComponentType } from 'react';

  interface ReactQuillProps {
    theme?: string;
    value?: string;
    onChange?: (content: string, delta: any, source: string, editor: any) => void;
    modules?: any;
    formats?: string[];
    placeholder?: string;
  }

  const ReactQuill: ComponentType<ReactQuillProps>;
  export default ReactQuill;
} 