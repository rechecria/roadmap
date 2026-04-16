'use client';

import { useParams } from 'next/navigation';
import { EditorPage } from '@/components/editor/EditorPage';

export default function PageEditorRoute() {
  const params = useParams();
  const pageId = params?.pageId as string;

  return <EditorPage pageId={pageId} />;
}
