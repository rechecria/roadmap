'use client';

import dynamic from 'next/dynamic';

interface EditorProps {
  initialContent?: any[];
  onChange?: (blocks: any[]) => void;
  theme?: 'light' | 'dark';
}

const BlockNoteEditor = dynamic(
  () => import('./BlockNoteWrapper').then((mod) => mod),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[200px] animate-pulse bg-gray-50 rounded-lg" />
    ),
  }
);

export function Editor({ initialContent, onChange, theme = 'light' }: EditorProps) {
  return (
    <div className="w-full min-h-[calc(100vh-350px)]">
      <BlockNoteEditor initialContent={initialContent} onChange={onChange} theme={theme} />
    </div>
  );
}
