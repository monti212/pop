import React, { useState, useEffect } from 'react';
import { Plus, Search, Folder } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPagesByUserId, createPage } from '../../services/documentationService';
import type { DocumentationPage } from '../../services/documentationService';

interface NavigationSidebarProps {
  currentPageId?: string;
  onPageSelect: (page: DocumentationPage) => void;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ currentPageId, onPageSelect }) => {
  const { user } = useAuth();
  const [pages, setPages] = useState<DocumentationPage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadPages();
  }, [user]);

  const loadPages = async () => {
    if (!user) return;
    try {
      const userPages = await getPagesByUserId(user.id);
      setPages(userPages);
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const handleCreatePage = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const newPage = await createPage({
        user_id: user.id,
        title: 'Untitled',
        content: '',
        slug: `untitled-${Date.now()}`,
        icon: '📄',
        color: '#3B82F6',
        is_published: false,
        is_template: false,
        order_index: pages.length,
        metadata: {}
      });
      await loadPages();
      onPageSelect(newPage);
    } catch (error) {
      console.error('Error creating page:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Your Pages</h2>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
        </div>

        <button
          onClick={handleCreatePage}
          disabled={isCreating}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>New Page</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredPages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {searchQuery ? 'No pages found' : 'No pages yet'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onPageSelect(page)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                  currentPageId === page.id
                    ? 'bg-teal/10 text-teal-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{page.icon}</span>
                <span className="flex-1 truncate">{page.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationSidebar;
