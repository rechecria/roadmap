'use client';

import { useState, useRef, useEffect } from 'react';

interface PageTitleProps {
  title: string;
  onTitleChange: (title: string) => void;
  placeholder?: string;
}

export function PageTitle({
  title,
  onTitleChange,
  placeholder = 'Untitled',
}: PageTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const contentEditableRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleBlur = () => {
    const newTitle = contentEditableRef.current?.textContent?.trim() || placeholder;
    setLocalTitle(newTitle);
    onTitleChange(newTitle === placeholder ? '' : newTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const displayText = localTitle || placeholder;
  const isPlaceholder = !localTitle || localTitle === placeholder;

  return (
    <h1
      ref={contentEditableRef}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className={`text-4xl font-bold outline-none py-2 px-0 transition-colors ${
        isPlaceholder ? 'text-gray-400' : 'text-gray-900'
      }`}
      style={{
        minHeight: '3rem',
        wordBreak: 'break-word',
      }}
    >
      {displayText}
    </h1>
  );
}
