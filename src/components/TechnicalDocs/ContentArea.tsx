import React, { useState, useEffect, useRef } from 'react';
import { Save, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createPage, updatePage, logActivity } from '../../services/documentationService';
import type { DocumentationPage } from '../../services/documentationService';

interface ContentAreaProps {
  page: DocumentationPage | null;
  isLoading: boolean;
  onPageUpdate: (page: DocumentationPage) => void;
}

const ContentArea: React.FC<ContentAreaProps> = ({ page, isLoading, onPageUpdate }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setContent(page.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [page]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      if (page) {
        const updatedPage = await updatePage(page.id, { title, content });
        await logActivity(page.id, user.id, 'edit', { title, content });
        onPageUpdate(updatedPage);
      } else {
        const newPage = await createPage({
          user_id: user.id,
          title: title || 'Untitled',
          content,
          slug: `page-${Date.now()}`,
          icon: '📄',
          color: '#3B82F6',
          is_published: false,
          is_template: false,
          order_index: 0,
          metadata: {}
        });
        await logActivity(newPage.id, user.id, 'create', { title, content });
        onPageUpdate(newPage);
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving page:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debounceSave();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    debounceSave();
  };

  const debounceSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none focus:ring-0 p-0 bg-transparent"
        />
        {lastSaved && (
          <p className="text-xs text-gray-400 mt-2">
            Last saved {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="flex-1">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing..."
          className="w-full h-full text-base text-gray-700 placeholder-gray-300 border-none focus:outline-none focus:ring-0 p-0 bg-transparent resize-none"
        />
      </div>

      {isSaving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal"></div>
          <span className="text-sm text-gray-600">Saving...</span>
        </div>
      )}
    </div>
  );
};

export default ContentArea;
