'use client';

import { useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';

interface BlockNoteWrapperProps {
  initialContent?: any[];
  onChange?: (blocks: any[]) => void;
  theme?: 'light' | 'dark';
}

export default function BlockNoteWrapper({ initialContent, onChange, theme = 'light' }: BlockNoteWrapperProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
  });

  useEffect(() => {
    if (!editor || !onChange) return;

    const unsubscribe = editor.onChange(() => {
      onChange(editor.document as any[]);
    });

    // editor.onChange may or may not return an unsubscribe fn depending on version
  }, [editor, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
    />
  );
}
