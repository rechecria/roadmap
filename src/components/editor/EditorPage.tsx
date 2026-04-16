'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePagesStore } from '@/stores/pages-store';
import { Block, Page } from '@/types/database';
import { PageTitle } from './PageTitle';
import { Editor } from './Editor';
import { Plus } from 'lucide-react';

interface EditorPageProps {
  pageId?: string;
}

export function EditorPage({ pageId }: EditorPageProps) {
  const { pages, currentPageId, updatePage } = usePagesStore();
  const activePageId = pageId || currentPageId;
  const page = activePageId ? pages[activePageId] : null;

  const debounceTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!activePageId) return;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        updatePage(activePageId, {
          content: page?.content || [],
        });
      }, 1000);
    },
    [activePageId, page?.content, updatePage]
  );

  const handleContentChange = useCallback(
    (blocks: Block[]) => {
      if (!activePageId) return;

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        updatePage(activePageId, {
          content: blocks as any,
        });
      }, 1000);
    },
    [activePageId, page?.content, updatePage]
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No page selected</p>
        </div>
      </div>
    );
  }

  const pageTitle = (page.content as any)?.title || '';
  const pageBlocks = (page.content as any)?.blocks || [];
  const coverImage = (page.content as any)?.coverImage;
  const pageIcon = (page.content as any)?.icon;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Cover Image Area */}
      {coverImage ? (
        <div className="relative w-full h-48 bg-gray-200 overflow-hidden mb-6">
          <img
            src={coverImage}
            alt="Page cover"
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => {
              if (activePageId) {
                updatePage(activePageId, {
                  content: {
                    ...(page.content as any),
                    coverImage: null,
                  },
                });
              }
            }}
            className="absolute top-2 right-2 bg-white rounded-md p-1 shadow hover:bg-gray-100"
            aria-label="Remove cover image"
          >
            <span className="text-sm">Remove</span>
          </button>
        </div>
      ) : (
        <div
          className="w-full h-32 bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 cursor-pointer transition-colors mb-6 flex items-center justify-center"
          onClick={() => {
            // Placeholder for cover image upload
          }}
        >
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-700">
            <Plus size={18} />
            <span className="text-sm">Add cover</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 px-6 max-w-4xl mx-auto w-full py-4">
        {/* Icon and Title Section */}
        <div className="flex items-start gap-4 mb-8">
          {pageIcon ? (
            <div
              className="text-4xl cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              onClick={() => {
                // Placeholder for icon picker
              }}
            >
              {pageIcon}
            </div>
          ) : (
            <button
              onClick={() => {
                // Placeholder for icon picker
              }}
              className="text-4xl flex-shrink-0 text-gray-300 hover:text-gray-400 transition-colors"
              aria-label="Add icon"
            >
              +
            </button>
          )}

          <div className="flex-1 min-w-0">
            <PageTitle
              title={pageTitle}
              onTitleChange={handleTitleChange}
              placeholder="Untitled"
            />
          </div>
        </div>

        {/* Editor */}
        <div className="mb-8">
          <Editor
            initialContent={pageBlocks}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
