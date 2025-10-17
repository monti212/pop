import React, { useState, useEffect } from 'react';
import { Phone, Save, Plus, Trash2, Settings as SettingsIcon, MessageCircle, Image, FileText, History } from 'lucide-react';
import { supabase } from '../../services/authService';

interface WhatsAppSetting {
  id: string;
  phone_number: string | null;
  max_conversation_history: number;
  daily_message_limit: number;
  multimodal_enabled: boolean;
  images_enabled: boolean;
  documents_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const WhatsAppSettings: React.FC = () => {
  const [settings, setSettings] = useState<WhatsAppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    phone_number: '',
    max_conversation_history: 10,
    daily_message_limit: 25,
    multimodal_enabled: true,
    images_enabled: true,
    documents_enabled: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .order('phone_number', { ascending: true, nullsFirst: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (setting: WhatsAppSetting) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_settings')
        .update({
          max_conversation_history: setting.max_conversation_history,
          daily_message_limit: setting.daily_message_limit,
          multimodal_enabled: setting.multimodal_enabled,
          images_enabled: setting.images_enabled,
          documents_enabled: setting.documents_enabled
        })
        .eq('id', setting.id);

      if (error) throw error;
      setEditingId(null);
      await loadSettings();
    } catch (error) {
      console.error('Error saving setting:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_settings')
        .insert([{
          phone_number: formData.phone_number || null,
          max_conversation_history: formData.max_conversation_history,
          daily_message_limit: formData.daily_message_limit,
          multimodal_enabled: formData.multimodal_enabled,
          images_enabled: formData.images_enabled,
          documents_enabled: formData.documents_enabled
        }]);

      if (error) throw error;

      setShowAddForm(false);
      setFormData({
        phone_number: '',
        max_conversation_history: 10,
        daily_message_limit: 25,
        multimodal_enabled: true,
        images_enabled: true,
        documents_enabled: false
      });
      await loadSettings();
    } catch (error: any) {
      console.error('Error adding setting:', error);
      alert(error.message || 'Failed to add settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, phoneNumber: string | null) => {
    if (phoneNumber === null) {
      alert('Cannot delete global settings');
      return;
    }

    if (!confirm('Are you sure you want to delete these settings?')) return;

    try {
      const { error } = await supabase
        .from('whatsapp_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSettings();
    } catch (error) {
      console.error('Error deleting setting:', error);
      alert('Failed to delete settings');
    }
  };

  const updateSetting = (id: string, field: string, value: any) => {
    setSettings(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure WhatsApp bot behavior globally or per phone number
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Number Settings
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Phone Number Settings</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (E.164 format)
              </label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for global settings</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <History className="w-4 h-4 inline mr-1" />
                Max Conversation History
              </label>
              <input
                type="number"
                value={formData.max_conversation_history}
                onChange={(e) => setFormData(prev => ({ ...prev, max_conversation_history: parseInt(e.target.value) || 10 }))}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MessageCircle className="w-4 h-4 inline mr-1" />
                Daily Message Limit
              </label>
              <input
                type="number"
                value={formData.daily_message_limit}
                onChange={(e) => setFormData(prev => ({ ...prev, daily_message_limit: parseInt(e.target.value) || 25 }))}
                min="1"
                max="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal"
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.multimodal_enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, multimodal_enabled: e.target.checked }))}
                className="rounded border-gray-300 text-teal focus:ring-teal"
              />
              <span className="text-sm text-gray-700">Enable Multimodal Processing</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.images_enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, images_enabled: e.target.checked }))}
                className="rounded border-gray-300 text-teal focus:ring-teal"
              />
              <Image className="w-4 h-4" />
              <span className="text-sm text-gray-700">Allow Image Messages</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.documents_enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, documents_enabled: e.target.checked }))}
                className="rounded border-gray-300 text-teal focus:ring-teal"
              />
              <FileText className="w-4 h-4" />
              <span className="text-sm text-gray-700">Allow Document Messages</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Settings'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-4">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {setting.phone_number === null ? (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <SettingsIcon className="w-5 h-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-teal" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {setting.phone_number || 'Global Settings'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {setting.phone_number ? 'Phone-specific settings' : 'Default settings for all numbers'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {editingId === setting.id ? (
                  <>
                    <button
                      onClick={() => handleSave(setting)}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors text-sm disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        loadSettings();
                      }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingId(setting.id)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    {setting.phone_number !== null && (
                      <button
                        onClick={() => handleDelete(setting.id, setting.phone_number)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <History className="w-4 h-4 inline mr-1" />
                  Max Conversation History
                </label>
                <input
                  type="number"
                  value={setting.max_conversation_history}
                  onChange={(e) => updateSetting(setting.id, 'max_conversation_history', parseInt(e.target.value) || 10)}
                  disabled={editingId !== setting.id}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageCircle className="w-4 h-4 inline mr-1" />
                  Daily Message Limit
                </label>
                <input
                  type="number"
                  value={setting.daily_message_limit}
                  onChange={(e) => updateSetting(setting.id, 'daily_message_limit', parseInt(e.target.value) || 25)}
                  disabled={editingId !== setting.id}
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={setting.multimodal_enabled}
                  onChange={(e) => updateSetting(setting.id, 'multimodal_enabled', e.target.checked)}
                  disabled={editingId !== setting.id}
                  className="rounded border-gray-300 text-teal focus:ring-teal disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">Enable Multimodal Processing</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={setting.images_enabled}
                  onChange={(e) => updateSetting(setting.id, 'images_enabled', e.target.checked)}
                  disabled={editingId !== setting.id}
                  className="rounded border-gray-300 text-teal focus:ring-teal disabled:opacity-50"
                />
                <Image className="w-4 h-4" />
                <span className="text-sm text-gray-700">Allow Image Messages</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={setting.documents_enabled}
                  onChange={(e) => updateSetting(setting.id, 'documents_enabled', e.target.checked)}
                  disabled={editingId !== setting.id}
                  className="rounded border-gray-300 text-teal focus:ring-teal disabled:opacity-50"
                />
                <FileText className="w-4 h-4" />
                <span className="text-sm text-gray-700">Allow Document Messages</span>
              </label>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
              Last updated: {new Date(setting.updated_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhatsAppSettings;
