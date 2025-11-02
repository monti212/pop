import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PenSquare, Search, Trash2, Crown, X, LogOut, LayoutGrid, Layout, Check, FileEdit as Edit3, FileText, Grid2x2 as Grid, Building, ChevronDown, MessageSquare, BookOpen, FolderOpen, Settings, MoreVertical, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../context/ConversationContext';
import { updateConversationTitle } from '../../services/chatService';
import Logo from '../Logo';

interface ConversationListProps {
  onClose?: () => void;
  darkMode?: boolean;
  isCollapsed?: boolean;
  onUpgradeClick?: () => void;
  onSignOut?: () => void;
  onShowAgentGallery?: () => void;
  onOpenPlansModal?: () => void;
  onOpenSettings?: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  onClose, 
  darkMode = true,
  isCollapsed = false,
  onSignOut,
  onShowAgentGallery,
  onOpenPlansModal,
  onOpenSettings
}) => {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Check if current user is authorized for website builder
  const isAuthorizedForWebsiteBuilder = user?.email === 'disabled@example.com';

  // Check if current user is admin
  const isAdmin = profile?.team_role === 'optimus_prime' || profile?.team_role === 'prime';

  const {
    conversations,
    currentConversation,
    setCurrentConversation,
    createNewConversation,
    deleteConversation,
    updateConversation,
    loadConversationMessages
  } = useConversations();

  const handleNewConversation = () => {
    createNewConversation().then(newConversation => {
      setCurrentConversation(newConversation);
      if (onClose) onClose();
    }).catch(error => {
      console.error('Error creating new conversation:', error);
    });
  };

  const handleSelectConversation = async (id: string) => {
    const selected = conversations.find(conv => conv.id === id);
    if (selected) {
      // Load messages for this conversation if not already loaded
      if (!selected.messages || selected.messages.length === 0) {
        await loadConversationMessages(selected);
      } else {
        setCurrentConversation(selected);
      }
      if (onClose) onClose();
    }
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const handleStartEdit = (conversation: typeof conversations[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConversationId(conversation.id);
    setEditingTitle(getConversationTitle(conversation));
  };

  const handleSaveEdit = async () => {
    if (!editingConversationId || !editingTitle.trim() || !user) {
      handleCancelEdit();
      return;
    }

    try {
      // Update in database
      const success = await updateConversationTitle(editingConversationId, editingTitle.trim(), user.id);
      
      if (success) {
        // Update in local state
        const updatedConversation = conversations.find(c => c.id === editingConversationId);
        if (updatedConversation) {
          updateConversation({
            ...updatedConversation,
            title: editingTitle.trim()
          });
        }
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
    
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Get conversation title
  const getConversationTitle = (conversation: typeof conversations[0]) => {
    // If conversation has a title, use it
    if (conversation.title && conversation.title !== 'New Conversation') {
      // Capitalize first letter
      return conversation.title.charAt(0).toUpperCase() + conversation.title.slice(1);
    }

    // Find first user message
    const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');

    if (firstUserMessage) {
      // Truncate message to first 30 chars for title
      const title = firstUserMessage.content.substring(0, 30);
      const finalTitle = title.length < firstUserMessage.content.length ? `${title}...` : title;
      // Capitalize first letter
      return finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
    }

    // Fallback to date
    return new Date(conversation.createdAt).toLocaleDateString();
  };

  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  // U Craft state variables removed

  const handleMenuOpen = (conversationId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.right + 8
    });
    setOpenMenuId(openMenuId === conversationId ? null : conversationId);
  };

  // Group conversations by date
  const getTodayConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      convDate.setHours(0, 0, 0, 0);
      return convDate.getTime() === today.getTime();
    });
  };

  const getYesterdayConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      convDate.setHours(0, 0, 0, 0);
      return convDate.getTime() === yesterday.getTime();
    });
  };

  const getOlderConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return conversations.filter(conv => {
      const convDate = new Date(conv.updatedAt);
      convDate.setHours(0, 0, 0, 0);
      return convDate.getTime() < yesterday.getTime();
    });
  };

  // Get conversations by timeframe
  const todayConversations = getTodayConversations();
  const yesterdayConversations = getYesterdayConversations();
  const olderConversations = getOlderConversations();
  
  // Filter conversations by search term if searching
  const filteredConversations = isSearching && searchTerm
    ? conversations.filter(conv => {
        const title = getConversationTitle(conv).toLowerCase();
        const content = conv.messages
          .filter(msg => msg.role === 'user')
          .map(msg => msg.content.toLowerCase())
          .join(' ');
        const term = searchTerm.toLowerCase();
        return title.includes(term) || content.includes(term);
      })
    : [];

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    setSearchTerm('');
  };

  // U Craft effects removed

  return (
    <>
      {showSubscriptionModal && (
        <SubscriptionModal 
          onClose={() => setShowSubscriptionModal(false)}
          darkMode={darkMode}
        />
      )}
      
      <div className={`flex flex-col h-full bg-[#F9F9F8] text-[#1A1A1A] overflow-auto scrollbar-hide transition-all duration-700 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-full'
      }`}>
        {/* Pencils of Promise Logo - at the top */}
        {!isCollapsed && (
          <div className="px-5 pt-3 pb-1">
            <Logo className="h-10 w-auto" />
          </div>
        )}

        {/* Mobile close button */}
        {onClose && !isCollapsed && (
          <div className="flex justify-end p-2 md:hidden">
            <button
              onClick={onClose}
              className="p-2 rounded-12 text-[#475766]/70 hover:bg-[#F7F5F2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Search bar - conditionally shown */}
        {isSearching && !isCollapsed && (
          <div className="p-2 sm:p-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 rounded-12 bg-white border border-[#EAE7E3] text-[#1A1A1A] placeholder:text-[#8A8A8A] text-sm font-medium focus:ring-2 focus:ring-[#0096B3] focus:ring-offset-0 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#1A1A1A]" />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 rounded-full hover:bg-[#F7F5F2] text-[#475766]/70"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {searchTerm && filteredConversations.length === 0 && (
              <p className="text-xs text-center mt-2 text-[#475766]/50">
                No conversations found matching "{searchTerm}"
              </p>
            )}
          </div>
        )}
        
        {/* Main navigation */}
        <div className={`p-2 px-3 space-y-1 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Search and Settings buttons - only show when not collapsed */}
          {!isCollapsed && (
            <div className="space-y-1">
            <button
              onClick={toggleSearch}
              className={`w-full flex items-center justify-start gap-2 px-3 py-2.5 rounded-12 ${
                isSearching
                  ? 'bg-[#EFEFED] text-[#19324A] font-medium shadow-md'
                  : 'border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out'
              }`}
            >
              <Search className={`w-4 h-4 ${isSearching ? 'text-[#f5b233]' : 'text-[#f5b233]'}`} />
              <span className="text-sm font-medium">Search</span>
            </button>

            <button
              onClick={onOpenSettings}
                className="w-full flex items-center justify-start gap-2 px-3 py-2.5 rounded-12 border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out"
            >
              <Settings className="w-4 h-4 text-[#f5b233]" />
              <span className="text-sm font-medium">Settings</span>
            </button>
            </div>
          )}

          {/* New Chat - always show (icon only when collapsed) */}
          <button
            onClick={handleNewConversation}
            className={`${isCollapsed ? 'w-10 h-10 rounded-12 flex items-center justify-center' : 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-12'} border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out`}
            title={isCollapsed ? "New chat" : undefined}
          >
            <PenSquare className="w-4 h-4 text-[#f5b233]" />
            {!isCollapsed && <span className="text-sm font-medium">New chat</span>}
          </button>

          {/* U Craft Group - Expanded view when not collapsed */}
          {!isCollapsed && (
            <motion.div
              className="space-y-1"
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <motion.button
                onClick={() => {
                  navigate('/uhuru-files');
                  if (onClose) onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-12 border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.05 }}
              >
                <FolderOpen className="w-4 h-4 text-[#0096B3]" />
                <span className="text-sm font-medium">Uhuru Files</span>
              </motion.button>

              <motion.button
                onClick={() => {
                  navigate('/uhuru-office');
                  if (onClose) onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-12 border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
              >
                <FileText className="w-4 h-4 text-[#0096B3]" />
                <span className="text-sm font-medium">Uhuru Office</span>
              </motion.button>

              {/* Admin Dashboard Button - Only show for admin users */}
              {isAdmin && (
                <motion.button
                  onClick={() => {
                    navigate('/admin');
                    if (onClose) onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-12 border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                >
                  <Shield className="w-4 h-4 text-[#FF6A00]" />
                  <span className="text-sm font-medium">Admin Dashboard</span>
                </motion.button>
              )}
            </motion.div>
          )}
          
          {/* Other buttons - hide when collapsed */}
          {!isCollapsed && (
            <>
              {/* Website Builder Button - Only show for authorized user */}
              {isAuthorizedForWebsiteBuilder && (
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-12 border border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-md hover:text-[#19324A] hover:scale-[1.01] transition-all duration-150 ease-out"
                  onClick={() => {
                    navigate('/builder');
                    if (onClose) onClose();
                  }}
                >
                  <Layout className="w-4 h-4 text-[#f5b233]" />
                  <span className="text-sm font-medium">Website Builder</span>
                </button>
              )}

              {/* Super Admin Button - Hidden per user request */}
            </>
          )}
          
          {/* Websites Button */}
        </div>
        
        {/* Search results - only show when searching */}
        {isSearching && searchTerm && !isCollapsed && (
          <div className="px-2 pb-3 mt-3">
            <h3 className="text-[10px] font-medium mb-1 px-2 text-[#7A8996] uppercase tracking-wider">
              Search Results ({filteredConversations.length})
            </h3>
            <div className="space-y-2 px-2">
              {filteredConversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 ease-out text-left group border-l-[3px] ${
                    currentConversation?.id === conversation.id
                      ? 'bg-[#F3EFEA] border-[#f5b233] text-[#19324A] font-semibold shadow-sm'
                      : 'border-[#E5E7EB] hover:bg-[#F3EFEA] hover:shadow-sm hover:border-[#f5b233] hover:text-[#19324A] hover:scale-[1.01]'
                  }`}
                >
                  {editingConversationId === conversation.id ? (
                    <div className="flex items-center w-full gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 text-sm px-2 py-1 bg-white border border-[#0096B3] rounded focus:outline-none focus:ring-2 focus:ring-[#0096B3] focus:ring-offset-0 text-[#19324A]"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-medium truncate flex-1">{getConversationTitle(conversation)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={(e) => handleStartEdit(conversation, e)}
                          className="p-1 rounded-full hover:bg-white hover:shadow-sm text-[#475766]/70 hover:text-[#19324A] hover:scale-105 transition-all duration-150 ease-out"
                          title="Edit conversation name"
                        >
                          <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(e, conversation.id)}
                          className="p-1 rounded-full hover:bg-red-50 hover:shadow-sm text-[#475766]/70 hover:text-red-600 hover:scale-105 transition-all duration-150 ease-out"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Conversation lists - only show when not searching */}
        {!isSearching && !isCollapsed && (
          <>
            {/* Today's chats */}
            {todayConversations.length > 0 && (
              <div className="mt-3 px-2">
                <h3 className="text-[10px] font-medium mb-1 px-2 text-[#7A8996] uppercase tracking-wider">
                  TODAY
                </h3>
                <div className="space-y-2 px-2">
                  {todayConversations.map(conversation => (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 ease-out text-left group border-l-[3px] ${
                        currentConversation?.id === conversation.id
                          ? 'bg-[#EFEFED] border-[#f5b233] text-[#19324A] font-medium shadow-sm'
                          : 'border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-sm hover:border-[#f5b233] hover:text-[#19324A] hover:scale-[1.01]'
                      }`}
                    >
                      {editingConversationId === conversation.id ? (
                        <div className="flex items-center w-full gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="flex-1 text-sm px-2 py-1 bg-white border border-[#0096B3] rounded focus:outline-none focus:ring-2 focus:ring-[#0096B3] focus:ring-offset-0 text-[#19324A]"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs truncate flex-1 text-[#1A1A1A]">{getConversationTitle(conversation)}</span>
                          <button
                            onClick={(e) => handleMenuOpen(conversation.id, e)}
                            className="p-1 rounded-full hover:bg-white/80 text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Yesterday's chats */}
            {yesterdayConversations.length > 0 && (
              <div className="mt-3 px-2">
                <h3 className="text-[10px] font-medium mb-1 px-2 text-[#7A8996] uppercase tracking-wider">
                  YESTERDAY
                </h3>
                <div className="space-y-2 px-2">
                  {yesterdayConversations.map(conversation => (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 ease-out text-left group border-l-[3px] ${
                        currentConversation?.id === conversation.id
                          ? 'bg-[#EFEFED] border-[#f5b233] text-[#19324A] font-medium shadow-sm'
                          : 'border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-sm hover:border-[#f5b233] hover:text-[#19324A] hover:scale-[1.01]'
                      }`}
                    >
                      {editingConversationId === conversation.id ? (
                        <div className="flex items-center w-full gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="flex-1 text-sm px-2 py-1 bg-white border border-[#0096B3] rounded focus:outline-none focus:ring-2 focus:ring-[#0096B3] focus:ring-offset-0 text-[#19324A]"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs truncate flex-1 text-[#1A1A1A]">{getConversationTitle(conversation)}</span>
                          <button
                            onClick={(e) => handleMenuOpen(conversation.id, e)}
                            className="p-1 rounded-full hover:bg-white/80 text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Older chats */}
            {olderConversations.length > 0 && (
              <div className="mt-3 px-2 pb-3">
                <h3 className="text-[10px] font-medium mb-1 px-2 text-[#7A8996] uppercase tracking-wider">
                  PREVIOUS
                </h3>
                <div className="space-y-2 px-2">
                  {olderConversations.map(conversation => (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all duration-150 ease-out text-left group border-l-[3px] ${
                        currentConversation?.id === conversation.id
                          ? 'bg-[#EFEFED] border-[#f5b233] text-[#19324A] font-medium shadow-sm'
                          : 'border-[#E5E7EB] hover:bg-[#EFEFED] hover:shadow-sm hover:border-[#f5b233] hover:text-[#19324A] hover:scale-[1.01]'
                      }`}
                    >
                      {editingConversationId === conversation.id ? (
                        <div className="flex items-center w-full gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="flex-1 text-sm px-2 py-1 bg-white border border-[#0096B3] rounded focus:outline-none focus:ring-2 focus:ring-[#0096B3] focus:ring-offset-0 text-[#19324A]"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700 transition-all duration-200"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700 transition-all duration-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs truncate flex-1 text-[#1A1A1A]">{getConversationTitle(conversation)}</span>
                          <button
                            onClick={(e) => handleMenuOpen(conversation.id, e)}
                            className="p-1 rounded-full hover:bg-white/80 text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="p-3">
        </div>

      </div>

      {/* Fixed positioned dropdown menu for conversations */}
      <AnimatePresence>
        {openMenuId && menuPosition && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setOpenMenuId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] py-2 z-[100] min-w-[160px]"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                transformOrigin: 'top left'
              }}
            >
              <div className="space-y-0.5 px-1">
                <button
                  onClick={(e) => {
                    const conversation = conversations.find(c => c.id === openMenuId);
                    if (conversation) handleStartEdit(conversation, e);
                    setOpenMenuId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-[#1A1A1A] hover:bg-[#F3EFEA] hover:text-[#0096B3] rounded-lg transition-all duration-150 ease-out hover:scale-[1.02]"
                >
                  <Edit3 className="w-[18px] h-[18px]" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    handleDeleteConversation(e, openMenuId);
                    setOpenMenuId(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50/80 hover:text-red-700 rounded-lg transition-all duration-150 ease-out hover:scale-[1.02]"
                >
                  <Trash2 className="w-[18px] h-[18px]" />
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* U Craft popup menu - Removed */}
    </>
  );
};

export default ConversationList;