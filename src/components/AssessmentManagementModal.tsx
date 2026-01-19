import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Upload, Calendar, AlertCircle, CheckCircle, Clock, FileText, Loader } from 'lucide-react';
import { format } from 'date-fns';
import {
  Assessment,
  getClassAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  uploadAssessmentDocument
} from '../services/assessmentService';

interface AssessmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  classId: string;
  className: string;
}

type AssessmentStatus = 'active' | 'upcoming' | 'due' | 'completed';

const AssessmentManagementModal: React.FC<AssessmentManagementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classId,
  className
}) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'upcoming' as AssessmentStatus,
    due_date: '',
    document_url: '',
    document_name: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadAssessments();
    }
  }, [isOpen, classId]);

  const loadAssessments = async () => {
    setIsLoading(true);
    setError(null);
    const result = await getClassAssessments(classId);
    if (result.success && result.data) {
      setAssessments(result.data);
    } else {
      setError(result.error || 'Failed to load assessments');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (editingAssessment) {
        const result = await updateAssessment(editingAssessment.id, {
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status,
          due_date: formData.due_date || undefined,
          document_url: formData.document_url || undefined,
          document_name: formData.document_name || undefined
        });

        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const result = await createAssessment({
          class_id: classId,
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status,
          due_date: formData.due_date || undefined,
          document_url: formData.document_url || undefined,
          document_name: formData.document_name || undefined
        });

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      resetForm();
      await loadAssessments();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setFormData({
      title: assessment.title,
      description: assessment.description || '',
      status: assessment.status,
      due_date: assessment.due_date || '',
      document_url: assessment.document_url || '',
      document_name: assessment.document_name || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (assessmentId: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return;

    const result = await deleteAssessment(assessmentId);
    if (result.success) {
      await loadAssessments();
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to delete assessment');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);

    try {
      const result = await uploadAssessmentDocument(file, classId);
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          document_url: result.data!.url,
          document_name: result.data!.name
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'upcoming',
      due_date: '',
      document_url: '',
      document_name: ''
    });
    setEditingAssessment(null);
    setShowForm(false);
  };

  const getStatusIcon = (status: AssessmentStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'upcoming':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'due':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: AssessmentStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'upcoming':
        return 'bg-blue-100 text-blue-700';
      case 'due':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-greyed-navy">Assessment Management</h2>
              <p className="text-sm text-greyed-black/70 mt-1">{className}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-greyed-black transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!showForm ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-greyed-navy">All Assessments</h3>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all flex items-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Assessment
                </button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-greyed-navy animate-spin" />
                </div>
              ) : assessments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-greyed-black/70 mb-4">No assessments yet</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all font-medium"
                  >
                    Create First Assessment
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-greyed-navy transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-greyed-navy text-lg">{assessment.title}</h4>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                              {getStatusIcon(assessment.status)}
                              {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                            </span>
                          </div>
                          {assessment.description && (
                            <p className="text-sm text-greyed-black/70 mb-2">{assessment.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-greyed-black/70">
                            {assessment.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Due: {format(new Date(assessment.due_date), 'MMM d, yyyy')}</span>
                              </div>
                            )}
                            {assessment.document_name && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                <span>{assessment.document_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(assessment)}
                            className="p-2 rounded-lg hover:bg-greyed-blue/20 text-greyed-navy transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(assessment.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-greyed-navy">
                  {editingAssessment ? 'Edit Assessment' : 'New Assessment'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-greyed-black/70 hover:text-greyed-navy"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-greyed-navy mb-2">
                    Assessment Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-greyed-navy"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-greyed-navy mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-greyed-navy resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-greyed-navy mb-2">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AssessmentStatus }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-greyed-navy"
                      required
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="due">Due</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-greyed-navy mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-greyed-navy"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-greyed-navy mb-2">
                    Upload Document
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-greyed-navy transition-all cursor-pointer">
                      <div className="flex items-center justify-center gap-2 text-greyed-black/70">
                        <Upload className="w-5 h-5" />
                        <span className="text-sm">
                          {uploadingFile ? 'Uploading...' : formData.document_name || 'Choose file'}
                        </span>
                      </div>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploadingFile}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-greyed-black/60 mt-1">
                    Upload assessment instructions, rubrics, or related documents
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-greyed-black rounded-lg hover:bg-gray-50 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-greyed-navy text-white rounded-lg hover:bg-greyed-navy/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                    {editingAssessment ? 'Update' : 'Create'} Assessment
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentManagementModal;
