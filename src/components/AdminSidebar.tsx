import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, MessageSquare, DollarSign, Database, Menu, X } from 'lucide-react';
import { supabase } from '../services/authService';

const Brand = {
  sand: '#F7F5F2',
  navy: '#19324A',
  teal: '#0096B3',
  sky: '#7DF9FF',
  orange: '#FF6A00',
  line: '#EAE7E3',
};

interface DocumentStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
}

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    total: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  const fetchDocumentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_knowledge_documents')
        .select('processing_status');

      if (error) throw error;

      const stats: DocumentStats = {
        total: data?.length || 0,
        processing: data?.filter(d => d.processing_status === 'processing' || d.processing_status === 'pending').length || 0,
        completed: data?.filter(d => d.processing_status === 'completed').length || 0,
        failed: data?.filter(d => d.processing_status === 'failed').length || 0,
      };

      setDocumentStats(stats);
    } catch (err) {
      console.error('Error fetching document stats:', err);
    }
  };

  useEffect(() => {
    fetchDocumentStats();

    const interval = setInterval(fetchDocumentStats, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchDocumentStats();
  }, [location.pathname]);

  const navItems = [
    {
      path: '/admin',
      icon: Activity,
      label: 'Dashboard',
      exact: true,
    },
    {
      path: '/admin/whatsapp',
      icon: MessageSquare,
      label: 'WhatsApp',
    },
    {
      path: '/admin/cost-breakdown',
      icon: DollarSign,
      label: 'Cost Breakdown',
    },
    {
      path: '/admin/knowledge-base',
      icon: Database,
      label: 'Knowledge Base',
      badge: documentStats.total,
      badgeColor: documentStats.processing > 0 ? Brand.orange : documentStats.failed > 0 ? '#ef4444' : Brand.teal,
    },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.path, item.exact);
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          active
            ? 'shadow-sm'
            : 'hover:bg-white/50'
        }`}
        style={{
          background: active ? Brand.teal : 'transparent',
          color: active ? 'white' : Brand.navy,
        }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && (
          <>
            <span className="font-medium">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : item.badgeColor,
                  color: active ? 'white' : 'white',
                }}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg"
        style={{ color: Brand.navy }}
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 transition-all duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
        style={{ background: Brand.sand, borderRight: `1px solid ${Brand.line}` }}
      >
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-6">
            {!isCollapsed && (
              <h2 className="text-xl font-bold" style={{ color: Brand.navy }}>
                Admin Panel
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-white/50 transition-colors"
              style={{ color: Brand.navy }}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </nav>

          {!isCollapsed && documentStats.total > 0 && (
            <div
              className="mt-auto p-4 rounded-lg"
              style={{ background: 'white', borderColor: Brand.line }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: Brand.navy }}>
                Knowledge Base Stats
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: Brand.navy, opacity: 0.7 }}>Total:</span>
                  <span className="font-semibold" style={{ color: Brand.navy }}>
                    {documentStats.total}
                  </span>
                </div>
                {documentStats.processing > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: Brand.navy, opacity: 0.7 }}>Processing:</span>
                    <span className="font-semibold" style={{ color: Brand.orange }}>
                      {documentStats.processing}
                    </span>
                  </div>
                )}
                {documentStats.failed > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: Brand.navy, opacity: 0.7 }}>Failed:</span>
                    <span className="font-semibold text-red-600">
                      {documentStats.failed}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
