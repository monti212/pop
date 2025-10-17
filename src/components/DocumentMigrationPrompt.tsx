import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createDocument, getUserDocuments } from '../services/documentService';

interface LocalDocument {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  isAutoSaved?: boolean;
  source?: string;
}

interface MigrationResult {
  success: number;
  failed: number;
  errors: string[];
}

const DocumentMigrationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [localDocs, setLocalDocs] = useState<LocalDocument[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForLocalDocuments();
  }, [user]);

  const checkForLocalDocuments = async () => {
    if (!user) return;

    const migrationDismissed = localStorage.getItem('document-migration-dismissed');
    if (migrationDismissed === 'true') {
      setDismissed(true);
      return;
    }

    const savedDocs = localStorage.getItem('uhuru-office-documents');
    if (!savedDocs) return;

    try {
      const docs: LocalDocument[] = JSON.parse(savedDocs);
      if (docs.length === 0) return;

      const dbResult = await getUserDocuments(user.id, { limit: 1 });

      if (dbResult.success) {
        const hasDbDocs = (dbResult.documents?.length || 0) > 0;

        if (!hasDbDocs) {
          setLocalDocs(docs);
          setShow(true);
        }
      }
    } catch (error) {
      console.error('Error checking for local documents:', error);
    }
  };

  const handleMigrate = async () => {
    if (!user || localDocs.length === 0) return;

    setIsMigrating(true);
    const errors: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const doc of localDocs) {
      try {
        const result = await createDocument(user.id, doc.title, doc.content, {
          documentType: 'office',
          isAutoSaved: doc.isAutoSaved || false,
          source: doc.source || 'localStorage_migration',
          metadata: {
            original_id: doc.id,
            original_created_at: doc.created_at,
            migrated_at: new Date().toISOString()
          }
        });

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${doc.title}: ${result.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        failCount++;
        errors.push(`${doc.title}: ${error.message || 'Migration failed'}`);
      }
    }

    setResult({
      success: successCount,
      failed: failCount,
      errors
    });

    if (successCount > 0 && failCount === 0) {
      localStorage.setItem('uhuru-office-documents-backup', JSON.stringify(localDocs));
      localStorage.removeItem('uhuru-office-documents');
    }

    setIsMigrating(false);
    setMigrationComplete(true);
  };

  const handleDismiss = () => {
    localStorage.setItem('document-migration-dismissed', 'true');
    setShow(false);
    setDismissed(true);
  };

  const handleSkip = () => {
    setShow(false);
  };

  if (!show || dismissed || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          <div className="bg-gradient-to-r from-teal to-teal-600 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8" />
                <h2 className="text-2xl font-bold">Migrate Your Documents</h2>
              </div>
              {!isMigrating && !migrationComplete && (
                <button
                  onClick={handleDismiss}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-white/90 text-sm">
              Move your local documents to the cloud for access across all devices
            </p>
          </div>

          <div className="p-6">
            {!migrationComplete ? (
              <>
                <div className="mb-6">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">
                        We found {localDocs.length} document{localDocs.length !== 1 ? 's' : ''} stored locally
                      </p>
                      <p className="text-blue-700">
                        Migrate them to your account for automatic sync, backup, and access from any device.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
                  {localDocs.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-2 h-2 bg-teal rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {doc.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {localDocs.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      + {localDocs.length - 5} more document{localDocs.length - 5 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleMigrate}
                    disabled={isMigrating}
                    className="flex-1 premium-button-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isMigrating ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Migrate Now
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSkip}
                    disabled={isMigrating}
                    className="px-6 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Later
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Your local documents will be backed up before migration
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                {result && result.failed === 0 ? (
                  <>
                    <div className="mb-4 flex justify-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Migration Complete!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Successfully migrated {result.success} document{result.success !== 1 ? 's' : ''} to your account.
                      You can now access them from any device.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex justify-center">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-yellow-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Partial Migration
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Migrated {result?.success || 0} document{result?.success !== 1 ? 's' : ''}.
                      {result?.failed ? ` ${result.failed} failed.` : ''}
                    </p>
                    {result?.errors && result.errors.length > 0 && (
                      <div className="max-h-32 overflow-y-auto bg-red-50 rounded-lg p-3 text-left">
                        {result.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-red-700 mb-1">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => setShow(false)}
                  className="premium-button-primary py-3 px-8 rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DocumentMigrationPrompt;
