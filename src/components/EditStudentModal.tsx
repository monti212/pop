import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Brain, Trash2 } from 'lucide-react';
import { updateStudent, deleteStudent } from '../services/studentService';

interface Student {
  id: string;
  class_id: string;
  student_name: string;
  student_identifier: string | null;
  neurodivergence_type: string | null;
  accommodations: string | null;
  learning_notes: string | null;
  active_status: boolean;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentData: Student;
}

const NEURODIVERGENCE_TYPES = [
  { value: '', label: 'None' },
  { value: 'ADHD', label: 'ADHD' },
  { value: 'Autism', label: 'Autism Spectrum' },
  { value: 'Dyslexia', label: 'Dyslexia' },
  { value: 'Dyscalculia', label: 'Dyscalculia' },
  { value: 'Dysgraphia', label: 'Dysgraphia' },
  { value: 'Other', label: 'Other' }
];

const ACCOMMODATION_TEMPLATES = [
  'Extended time on tests and assignments',
  'Preferential seating near the front',
  'Frequent breaks during long tasks',
  'Use of assistive technology',
  'Modified homework assignments',
  'Additional time for processing information',
  'Visual aids and written instructions',
  'Reduced distractions in testing environment'
];

const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, onSuccess, studentData }) => {
  const [formData, setFormData] = useState({
    student_name: '',
    student_id: '',
    neurodivergence_type: '',
    accommodations: '',
    learning_notes: '',
    active_status: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAccommodationTemplates, setShowAccommodationTemplates] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && studentData) {
      setFormData({
        student_name: studentData.student_name,
        student_id: studentData.student_identifier || '',
        neurodivergence_type: studentData.neurodivergence_type || '',
        accommodations: studentData.accommodations || '',
        learning_notes: studentData.learning_notes || '',
        active_status: studentData.active_status
      });
      setErrors({});
      setServerError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, studentData]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.student_name.trim()) {
      newErrors.student_name = 'Student name is required';
    } else if (formData.student_name.length > 100) {
      newErrors.student_name = 'Student name must be 100 characters or less';
    }

    if (formData.student_id && formData.student_id.length > 50) {
      newErrors.student_id = 'Student ID must be 50 characters or less';
    }

    if (formData.accommodations && formData.accommodations.length > 1000) {
      newErrors.accommodations = 'Accommodations must be 1000 characters or less';
    }

    if (formData.learning_notes && formData.learning_notes.length > 500) {
      newErrors.learning_notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateStudent(studentData.id, {
        student_name: formData.student_name.trim(),
        student_identifier: formData.student_id.trim() || undefined,
        has_neurodivergence: !!formData.neurodivergence_type,
        neurodivergence_type: (formData.neurodivergence_type || undefined) as any,
        accommodations: formData.accommodations.trim() || undefined,
        learning_notes: formData.learning_notes.trim() || undefined,
        active_status: formData.active_status
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update student');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating student:', error);
      setServerError(error.message || 'Failed to update student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setServerError(null);

    try {
      const result = await deleteStudent(studentData.id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete student');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      setServerError(error.message || 'Failed to delete student. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setServerError(null);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const addAccommodationTemplate = (template: string) => {
    const current = formData.accommodations;
    const newValue = current ? `${current}\n• ${template}` : `• ${template}`;
    setFormData(prev => ({ ...prev, accommodations: newValue }));
    setShowAccommodationTemplates(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Student</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting || isDeleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{serverError}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>

            <div>
              <label htmlFor="student_name" className="block text-sm font-medium text-gray-700 mb-1">
                Student Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="student_name"
                name="student_name"
                value={formData.student_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.student_name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="John Doe"
                disabled={isSubmitting || isDeleting}
                maxLength={100}
              />
              {errors.student_name && (
                <p className="mt-1 text-sm text-red-600">{errors.student_name}</p>
              )}
            </div>

            <div>
              <label htmlFor="student_id" className="block text-sm font-medium text-gray-700 mb-1">
                Student ID (Optional)
              </label>
              <input
                type="text"
                id="student_id"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.student_id ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 2024-0001"
                disabled={isSubmitting || isDeleting}
                maxLength={50}
              />
              {errors.student_id && (
                <p className="mt-1 text-sm text-red-600">{errors.student_id}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active_status"
                name="active_status"
                checked={formData.active_status}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                disabled={isSubmitting || isDeleting}
              />
              <label htmlFor="active_status" className="ml-2 text-sm text-gray-700">
                Student is currently active
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-medium text-gray-900">Neurodivergence Information (Optional)</h3>
            </div>

            <div>
              <label htmlFor="neurodivergence_type" className="block text-sm font-medium text-gray-700 mb-1">
                Neurodivergence Type
              </label>
              <select
                id="neurodivergence_type"
                name="neurodivergence_type"
                value={formData.neurodivergence_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={isSubmitting || isDeleting}
              >
                {NEURODIVERGENCE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.neurodivergence_type && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="accommodations" className="block text-sm font-medium text-gray-700">
                      Accommodations
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAccommodationTemplates(!showAccommodationTemplates)}
                      className="text-xs text-teal-600 hover:text-teal-700"
                      disabled={isSubmitting || isDeleting}
                    >
                      {showAccommodationTemplates ? 'Hide Templates' : 'Show Templates'}
                    </button>
                  </div>

                  {showAccommodationTemplates && (
                    <div className="mb-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-2">Click to add:</p>
                      <div className="space-y-1">
                        {ACCOMMODATION_TEMPLATES.map((template, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => addAccommodationTemplate(template)}
                            className="block w-full text-left text-xs text-gray-700 hover:bg-white px-2 py-1 rounded transition-colors"
                          >
                            • {template}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    id="accommodations"
                    name="accommodations"
                    value={formData.accommodations}
                    onChange={handleChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none ${
                      errors.accommodations ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="List any accommodations this student requires..."
                    disabled={isSubmitting || isDeleting}
                    maxLength={1000}
                  />
                  {errors.accommodations && (
                    <p className="mt-1 text-sm text-red-600">{errors.accommodations}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.accommodations.length}/1000 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="learning_notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Learning Notes
                  </label>
                  <textarea
                    id="learning_notes"
                    name="learning_notes"
                    value={formData.learning_notes}
                    onChange={handleChange}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none ${
                      errors.learning_notes ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Any additional information about how to best support this student..."
                    disabled={isSubmitting || isDeleting}
                    maxLength={500}
                  />
                  {errors.learning_notes && (
                    <p className="mt-1 text-sm text-red-600">{errors.learning_notes}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.learning_notes.length}/500 characters
                  </p>
                </div>
              </>
            )}
          </div>

          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2"
                disabled={isSubmitting || isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Student</span>
              </button>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting || isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-200">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-2">Are you sure you want to remove this student?</p>
                <p className="text-sm text-red-700">
                  This will permanently delete all attendance records for this student. This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditStudentModal;
