import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/authService';
import { MessageCircle, Phone, Image, FileText, Send, RefreshCw, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

interface WhatsAppMessage {
  id: string;
  sender_phone: string;
  recipient_phone: string;
  message_body: string;
  media_urls: string[];
  media_types: string[];
  direction: 'inbound' | 'outbound';
  delivery_status: string;
  created_at: string;
  whatsapp_user_id: string;
}

interface WhatsAppUser {
  id: string;
  phone_number: string;
  first_message_date: string;
  last_message_date: string;
  account_status: string;
}

interface UsageData {
  phone_number: string;
  message_count: number;
  daily_limit: number;
  date: string;
}

const WhatsAppMessages: React.FC = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [users, setUsers] = useState<WhatsAppUser[]>([]);
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [showMediaOnly, setShowMediaOnly] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sendMessageMode, setSendMessageMode] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [messagesRes, usersRes, usageRes] = await Promise.all([
        supabase
          .from('whatsapp_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('whatsapp_users')
          .select('*')
          .order('last_message_date', { ascending: false }),
        supabase
          .from('whatsapp_usage')
          .select('*')
          .eq('date', new Date().toISOString().split('T')[0])
      ]);

      if (messagesRes.data) setMessages(messagesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (usageRes.data) setUsage(usageRes.data);
    } catch (error) {
      console.error('Error loading WhatsApp data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!sendTo || !sendBody) return;

    setSending(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-whatsapp-webhook/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            to: sendTo,
            body: sendBody
          })
        }
      );

      if (response.ok) {
        setSendBody('');
        setSendTo('');
        setSendMessageMode(false);
        loadData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (selectedUser && msg.whatsapp_user_id !== selectedUser) return false;
    if (filterDirection !== 'all' && msg.direction !== filterDirection) return false;
    if (showMediaOnly && (!msg.media_urls || msg.media_urls.length === 0)) return false;
    return true;
  });

  const stats = {
    totalMessages: messages.length,
    totalUsers: users.length,
    inboundToday: messages.filter(m =>
      m.direction === 'inbound' &&
      new Date(m.created_at).toDateString() === new Date().toDateString()
    ).length,
    outboundToday: messages.filter(m =>
      m.direction === 'outbound' &&
      new Date(m.created_at).toDateString() === new Date().toDateString()
    ).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Messages</h1>
            <p className="text-gray-600 mt-1">Monitor and manage WhatsApp conversations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setSendMessageMode(!sendMessageMode)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMessages}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <Phone className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inbound Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inboundToday}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outbound Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.outboundToday}</p>
              </div>
              <Send className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {sendMessageMode && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send WhatsApp Message</h3>
              <button
                onClick={() => setSendMessageMode(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (E.164 format)
                </label>
                <input
                  type="text"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="+267xxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your message..."
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={sending || !sendTo || !sendBody}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.phone_number}
                </option>
              ))}
            </select>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showMediaOnly}
                onChange={(e) => setShowMediaOnly(e.target.checked)}
                className="rounded"
              />
              <span>Media Only</span>
            </label>
            {(selectedUser || filterDirection !== 'all' || showMediaOnly) && (
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setFilterDirection('all');
                  setShowMediaOnly(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From / To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Media
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        message.direction === 'inbound'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {message.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {message.direction === 'inbound' ? message.sender_phone : message.recipient_phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {message.message_body}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {message.media_urls && message.media_urls.length > 0 && (
                        <div className="flex gap-2">
                          {message.media_urls.map((url, idx) => {
                            const type = message.media_types?.[idx] || '';
                            if (type.startsWith('image/')) {
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setSelectedImage(url)}
                                  className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  <Image className="w-4 h-4 text-gray-600" />
                                </button>
                              );
                            }
                            return (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                <FileText className="w-4 h-4 text-gray-600" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {message.delivery_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedImage}
                alt="WhatsApp media"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppMessages;
