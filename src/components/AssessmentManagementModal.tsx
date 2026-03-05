import React, { useState, useEffect } from 'react';
import { X, Save, Upload, FileText, Trash2, Download, Loader } from 'lucide-react';
import {
  Assessment,
  createAssessment,
  updateAssessment,
  uploadAssessmentDocument,
  removeAssessmentDocument,
  downloadAssessmentDocument
} from '../services/assessmentService';

interface AssessmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
  assessment?: Assessment | null;
}

const AssessmentManagementModal: React.FC<AssessmentManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classId,
  assessment
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'upcoming' | 'due' | 'completed'>('upcoming');
  const [dueDate, setDueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && assessment) {
      setTitle(assessment.title);
      setDescription(assessment.description || '');
      setStatus(assessment.status);
      setDueDate(assessment.due_date || '');
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('upcoming');
      setDueDate('');
      setSelectedFile(null);
    }
  }, [isOpen, assessment]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUploadDocument = async (assessmentId: string) => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadAssessmentDocument(assessmentId, selectedFile, classId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload document');
      }

      setSuccessMessage('Document uploaded successfully!');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (!assessment?.document_url) return;

    if (!confirm('Are you sure you want to remove this document?')) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await removeAssessmentDocument(assessment.id, assessment.document_url);

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove document');
      }

      setSuccessMessage('Document removed successfully!');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to remove document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!assessment?.document_url) return;

    try {
      const blob = await downloadAssessmentDocument(assessment.document_url);
      if (!blob) throw new Error('Failed to download document');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = assessment.document_name || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download document');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let assessmentId = assessment?.id;

      if (assessment) {
        const result = await updateAssessment(assessment.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          due_date: dueDate || undefined
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to update assessment');
        }
      } else {
        const result = await createAssessment({
          class_id: classId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          due_date: dueDate || undefined
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create assessment');
        }

        assessmentId = result.data.id;
      }

      if (selectedFile && assessmentId) {
        await handleUploadDocument(assessmentId);
      }

      setSuccessMessage(`Assessment ${assessment ? 'updated' : 'created'} successfully!`);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'active': return 'green';
      case 'upcoming': return 'blue';
      case 'due': return 'red';
      case 'completed': return 'gray';
      default: return 'gray';
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {assessment ? 'Edit Assessment' : 'Create Assessment'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Chapter 5 Test, Final Project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Add details about this assessment..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="due">Due</option>
                <option value="completed">Completed</option>
              </select>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-700`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Document Attachment</h3>

            {assessment?.document_url && assessment?.document_name ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{assessment.document_name}</p>
                      <p className="text-xs text-gray-500">Current document</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDownloadDocument}
                      className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Download document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleRemoveDocument}
                      disabled={isUploading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, PPT, PPTX (Max 10MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                </label>

                {selectedFile && (
                  <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span className="text-sm text-teal-700">{selectedFile.name}</span>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Upload relevant materials for this assessment (rubrics, instructions, study guides, etc.)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isSaving || isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading || !title.trim()}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving || isUploading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>{isUploading ? 'Uploading...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{assessment ? 'Update' : 'Create'} Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentManagementModal;
