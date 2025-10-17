import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  Plus,
  Calendar,
  Globe,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';

interface ApiKey {
  key_id: string;
  service: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked: boolean;
}

interface ApiKeySettingsProps {
  darkMode?: boolean;
  interfaceLanguage?: string;
}

// Client-side API key generation
const generateApiKey = (): string => {
  // Generate a unique key with uhuru_ prefix
  const randomPart = crypto.randomUUID().replace(/-/g, '');
  return `uhuru_${randomPart}`;
};

// Client-side SHA256 hashing using Web Crypto API
const hashApiKey = async (key: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ 
  darkMode = false,
  interfaceLanguage = 'english'
}) => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Translations
  const translations: Record<string, Record<string, string>> = {
    english: {
      apiKeys: "API Keys",
      description: "Generate and manage API keys to access Uhuru programmatically",
      generateNew: "Generate New API Key",
      keyGenerated: "API Key Generated",
      copyKey: "Copy Key",
      copied: "Copied!",
      hideKey: "Hide Key",
      showKey: "Show Key",
      revoke: "Revoke",
      delete: "Delete",
      noKeys: "No API Keys",
      noKeysDescription: "You haven't generated any API keys yet. Create one to start using the Uhuru API.",
      keyDetails: "Key Details",
      service: "Service",
      created: "Created",
      lastUsed: "Last Used",
      expires: "Expires",
      status: "Status",
      active: "Active",
      revoked: "Revoked",
      never: "Never",
      warningTitle: "Important Security Notice",
      warningText: "This is your API key. For security reasons, it will only be shown once. Please copy and store it securely.",
      dailyLimit: "No daily request limits - use as needed",
      revokeConfirm: "Are you sure you want to revoke this API key? This action cannot be undone.",
      deleteConfirm: "Are you sure you want to delete this API key? This action cannot be undone."
    }
  };

  const getTranslation = (key: string): string => {
    return translations[interfaceLanguage]?.[key] || translations.english[key] || key;
  };

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user]);

  const loadApiKeys = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('key_id, service, created_at, expires_at, last_used_at, revoked')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApiKeys(data || []);
    } catch (err: any) {
      console.error('Error loading API keys:', err);
      setError(err.message || 'I couldn\'t load your API keys right now. Try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    if (!user) return;

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate new API key
      const newKey = generateApiKey();
      const keyHash = await hashApiKey(newKey);

      // Insert into database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          service: 'uhuru',
          key_value: newKey,
          key_hash: keyHash,
          revoked: false
        })
        .select('key_id')
        .single();

      if (error) throw error;

      // Show the new key to the user
      setNewlyGeneratedKey(newKey);
      setShowNewKey(true);
      setSuccess('API key generated successfully!');

      // Reload the keys list
      await loadApiKeys();

    } catch (err: any) {
      console.error('Error generating API key:', err);
      setError(err.message || 'API key generation isn\'t working. Want to try again?');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async (key: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm(getTranslation('revokeConfirm'))) return;

    try {
      setError(null);
      
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked: true })
        .eq('key_id', keyId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSuccess('API key revoked – all sorted!');
      await loadApiKeys();

    } catch (err: any) {
      console.error('Error revoking API key:', err);
      setError(err.message || 'I couldn\'t revoke that API key. Try again?');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm(getTranslation('deleteConfirm'))) return;

    try {
      setError(null);
      
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('key_id', keyId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSuccess('API key deleted – gone for good!');
      await loadApiKeys();

    } catch (err: any) {
      console.error('Error deleting API key:', err);
      setError(err.message || 'I couldn\'t delete that API key. Want to try again?');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return getTranslation('never');
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-teal border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
          {getTranslation('apiKeys')}
        </h3>
        <p className={`text-sm ${darkMode ? 'text-white/70' : 'text-gray-600'} mb-4`}>
          {getTranslation('description')}
        </p>
        
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-900/30' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-start gap-2">
            <Globe className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-500'} flex-shrink-0 mt-0.5`} />
            <div>
              <h4 className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'} mb-1`}>
                {getTranslation('dailyLimit')}
              </h4>
              <p className={`text-xs ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                Each API key gets 50 requests per day. Check the docs for all the details!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-900/30' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`w-4 h-4 ${darkMode ? 'text-red-400' : 'text-red-500'} flex-shrink-0 mt-0.5`} />
            <div>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                Error
              </h3>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-red-200' : 'text-red-700'}`}>{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className={`ml-auto ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-900/30' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-start gap-2">
            <Check className={`w-4 h-4 ${darkMode ? 'text-green-400' : 'text-green-500'} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-700'}`}>{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className={`ml-auto ${darkMode ? 'text-green-400 hover:text-green-300' : 'text-green-500 hover:text-green-600'}`}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Key Display */}
      {newlyGeneratedKey && showNewKey && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-orange-900/20 border border-orange-900/30' : 'bg-orange-50 border border-orange-200'}`}>
          <div className="flex items-start gap-2 mb-3">
            <Shield className={`w-5 h-5 ${darkMode ? 'text-orange-400' : 'text-orange-500'} flex-shrink-0 mt-0.5`} />
            <div>
              <h3 className={`text-sm font-medium ${darkMode ? 'text-orange-300' : 'text-orange-800'} mb-1`}>
                {getTranslation('warningTitle')}
              </h3>
              <p className={`text-xs ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                {getTranslation('warningText')}
              </p>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-300 font-mono text-sm`}>
            <div className="flex items-center justify-between">
              <span className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {newlyGeneratedKey}
              </span>
              <button
                onClick={() => handleCopyKey(newlyGeneratedKey, 'new-key')}
                className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                title="Copy API key"
              >
                {copiedKeyId === 'new-key' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          <button
            onClick={() => {
              setNewlyGeneratedKey(null);
              setShowNewKey(false);
            }}
            className="mt-3 text-xs text-orange-600 hover:text-orange-700"
          >
            I've copied the key safely
          </button>
        </div>
      )}

      {/* Generate New Key Button */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Generate New API Key
          </h4>
          <button
            onClick={loadApiKeys}
            disabled={isLoading}
            className={`p-1.5 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-white/10 text-white/70' : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-600'} mb-4`}>
          Create a new API key to integrate my capabilities into your apps.
        </p>
        
        <button
          onClick={handleGenerateApiKey}
          disabled={isGenerating}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            darkMode 
              ? 'bg-teal text-white hover:bg-teal/90' 
              : 'bg-teal text-white hover:bg-teal/90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {getTranslation('generateNew')}
            </>
          )}
        </button>
      </div>

      {/* API Keys List */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'}`}>
        <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
          Your API Keys ({apiKeys.length})
        </h4>
        
        {apiKeys.length === 0 ? (
          <div className="text-center py-6">
            <Key className={`w-8 h-8 ${darkMode ? 'text-white/30' : 'text-gray-300'} mx-auto mb-2`} />
            <h5 className={`font-medium ${darkMode ? 'text-white/70' : 'text-gray-600'} mb-1`}>
              No API Keys Yet
            </h5>
            <p className={`text-xs ${darkMode ? 'text-white/50' : 'text-gray-500'}`}>
              You haven't created any API keys yet. Generate one to start building with me!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.key_id}
                className={`p-3 rounded-lg border transition-colors ${
                  apiKey.revoked 
                    ? darkMode 
                      ? 'bg-red-900/20 border-red-900/30' 
                      : 'bg-red-50 border-red-200'
                    : darkMode 
                      ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Key className={`w-4 h-4 ${
                      apiKey.revoked 
                        ? darkMode ? 'text-red-400' : 'text-red-500'
                        : 'text-teal'
                    }`} />
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {apiKey.service.toUpperCase()} API Key
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      apiKey.revoked
                        ? darkMode
                          ? 'bg-red-900/30 text-red-300'
                          : 'bg-red-100 text-red-700'
                        : darkMode
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {apiKey.revoked ? getTranslation('revoked') : getTranslation('active')}
                    </span>
                  </div>
                  
                  {!apiKey.revoked && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRevokeKey(apiKey.key_id)}
                        className={`p-1 rounded transition-colors ${
                          darkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'
                        }`}
                        title="Revoke key"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className={`text-xs space-y-1 ${darkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">{getTranslation('created')}:</span>
                      <br />
                      {formatDate(apiKey.created_at)}
                    </div>
                    <div>
                      <span className="font-medium">{getTranslation('lastUsed')}:</span>
                      <br />
                      {formatDate(apiKey.last_used_at)}
                    </div>
                  </div>
                  
                  {apiKey.expires_at && (
                    <div>
                      <span className="font-medium">{getTranslation('expires')}:</span> {formatDate(apiKey.expires_at)}
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                    <span className="font-medium">Key ID:</span> {apiKey.key_id.substring(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Documentation Link */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-start gap-2">
          <Key className={`w-5 h-5 ${darkMode ? 'text-white/70' : 'text-gray-500'} flex-shrink-0 mt-0.5`} />
          <div>
            <h4 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
              API Documentation
            </h4>
            <p className={`text-xs ${darkMode ? 'text-white/70' : 'text-gray-600'} mb-2`}>
              Learn how to use your API keys to integrate me into your applications.
            </p>
            <a
              href="/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-teal hover:text-teal/80 font-medium"
            >
              View Documentation
              <Globe className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;