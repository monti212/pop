import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, AlertCircle, Brain, Upload, FileText, Loader, Trash2 } from 'lucide-react';
import { bulkCreateStudents, createStudent } from '../services/studentService';
import { parseDocumentContent } from '../utils/documentParser';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classId: string;
}

interface BulkStudentDraft {
  student_name: string;
  student_identifier: string;
}

type EntryMode = 'single' | 'bulk';

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

const HEADER_PATTERN = /\b(student|learner|name|id|identifier|number|no\.?|class|form|grade|gender|age|dob|sheet)\b/i;
const MAX_STUDENT_NAME_LENGTH = 100;
const MAX_STUDENT_ID_LENGTH = 50;

function cleanCell(value: string): string {
  return value
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanName(value: string): string {
  return cleanCell(value)
    .replace(/^(student|learner)\s*(name)?\s*[:\-]\s*/i, '')
    .replace(/^\d+\s*[\).\-\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyHeader(value: string): boolean {
  const cleaned = cleanCell(value).replace(/[:\-]/g, ' ');
  return HEADER_PATTERN.test(cleaned) && cleaned.split(/\s+/).length <= 4;
}

function isLikelyName(value: string): boolean {
  const cleaned = cleanName(value);
  if (!cleaned || cleaned.length > MAX_STUDENT_NAME_LENGTH || isLikelyHeader(cleaned)) return false;
  if (/^sheet\s*:/i.test(cleaned) || /^\[.*\]$/.test(cleaned)) return false;
  if (/[{}[\]<>=@]/.test(cleaned)) return false;

  const letters = cleaned.match(/[A-Za-z]/g)?.length || 0;
  const digits = cleaned.match(/\d/g)?.length || 0;
  if (letters < 2 || digits > letters) return false;

  return cleaned.split(/\s+/).length <= 7;
}

function isLikelyIdentifier(value: string): boolean {
  const cleaned = cleanCell(value);
  return cleaned.length > 0 && cleaned.length <= MAX_STUDENT_ID_LENGTH && /\d/.test(cleaned) && !isLikelyHeader(cleaned);
}

function parseStudentLine(line: string): BulkStudentDraft | null {
  const trimmed = cleanCell(line);
  if (!trimmed || isLikelyHeader(trimmed) || /^[-_=]{3,}$/.test(trimmed)) return null;

  const separatorFields = trimmed
    .split(/\t|,|;|\|/)
    .map(cleanCell)
    .filter(Boolean);

  if (separatorFields.length > 1) {
    const nameField = separatorFields.find((field) => isLikelyName(field));
    if (!nameField) return null;

    const identifierField = separatorFields.find((field) => field !== nameField && isLikelyIdentifier(field));
    return {
      student_name: cleanName(nameField),
      student_identifier: identifierField ? cleanCell(identifierField) : ''
    };
  }

  const withoutPrefix = cleanName(trimmed);
  const idAtEnd = withoutPrefix.match(/^(.+?)\s+([A-Z0-9][A-Z0-9/_-]*\d[A-Z0-9/_-]*)$/i);
  if (idAtEnd && isLikelyName(idAtEnd[1])) {
    return {
      student_name: cleanName(idAtEnd[1]),
      student_identifier: cleanCell(idAtEnd[2])
    };
  }

  const idAtStart = withoutPrefix.match(/^([A-Z0-9][A-Z0-9/_-]*\d[A-Z0-9/_-]*)\s+(.+)$/i);
  if (idAtStart && isLikelyName(idAtStart[2])) {
    return {
      student_name: cleanName(idAtStart[2]),
      student_identifier: cleanCell(idAtStart[1])
    };
  }

  if (!isLikelyName(withoutPrefix)) return null;
  return {
    student_name: withoutPrefix,
    student_identifier: ''
  };
}

function extractStudentDrafts(text: string): BulkStudentDraft[] {
  const seen = new Set<string>();
  const drafts: BulkStudentDraft[] = [];

  for (const line of text.split(/\r?\n/)) {
    const draft = parseStudentLine(line);
    if (!draft) continue;

    const key = `${draft.student_name.toLowerCase()}|${draft.student_identifier.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push(draft);
  }

  return drafts;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onSuccess, classId }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>('single');
  const [formData, setFormData] = useState({
    student_name: '',
    student_id: '',
    neurodivergence_type: '',
    accommodations: '',
    learning_notes: ''
  });
  const [bulkStudents, setBulkStudents] = useState<BulkStudentDraft[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAccommodationTemplates, setShowAccommodationTemplates] = useState(false);

  const validBulkStudents = useMemo(
    () => bulkStudents.filter((student) => student.student_name.trim().length > 0),
    [bulkStudents]
  );

  useEffect(() => {
    if (!isOpen) return;
    setEntryMode('single');
    setFormData({
      student_name: '',
      student_id: '',
      neurodivergence_type: '',
      accommodations: '',
      learning_notes: ''
    });
    setBulkStudents([]);
    setBulkFileName('');
    setErrors({});
    setServerError(null);
    setShowAccommodationTemplates(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.student_name.trim()) {
      newErrors.student_name = 'Student name is required';
    } else if (formData.student_name.length > MAX_STUDENT_NAME_LENGTH) {
      newErrors.student_name = 'Student name must be 100 characters or less';
    }

    if (formData.student_id && formData.student_id.length > MAX_STUDENT_ID_LENGTH) {
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

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await createStudent(classId, {
        student_name: formData.student_name.trim(),
        student_identifier: formData.student_id.trim() || undefined,
        has_neurodivergence: !!formData.neurodivergence_type,
        neurodivergence_type: (formData.neurodivergence_type || undefined) as any,
        accommodations: formData.accommodations.trim() || undefined,
        learning_notes: formData.learning_notes.trim() || undefined
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to add student');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating student:', error);
      if (error.message?.includes('maximum')) {
        setServerError('This class has reached the maximum limit of 35 students. Please remove inactive students or create a new class.');
      } else {
        setServerError(error.message || 'Failed to add student. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setEntryMode('bulk');
    setBulkFileName(file.name);
    setBulkStudents([]);
    setServerError(null);
    setIsParsing(true);

    try {
      const text = await parseDocumentContent(file);
      if (/^\[(Error|[A-Z0-9]+ Document:).*cannot be parsed/i.test(text)) {
        throw new Error(text.replace(/^\[|\]$/g, ''));
      }

      const drafts = extractStudentDrafts(text);
      if (drafts.length === 0) {
        throw new Error('No student names were detected. Try a PDF, DOCX, Excel, CSV, or text file with one student per row.');
      }

      setBulkStudents(drafts);
    } catch (error: any) {
      console.error('Error parsing student list:', error);
      setServerError(error.message || 'Failed to read the class list. Please try another file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleBulkSubmit = async () => {
    setServerError(null);

    const invalidIndex = bulkStudents.findIndex((student) => {
      const nameLength = student.student_name.trim().length;
      const idLength = student.student_identifier.trim().length;
      return nameLength === 0 || nameLength > MAX_STUDENT_NAME_LENGTH || idLength > MAX_STUDENT_ID_LENGTH;
    });

    if (invalidIndex >= 0) {
      setServerError('Please review the detected names. Names must be present and IDs must be 50 characters or less.');
      return;
    }

    if (validBulkStudents.length === 0) {
      setServerError('Upload a class list or add at least one student name before importing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await bulkCreateStudents(classId, validBulkStudents.map((student) => ({
        student_name: student.student_name.trim(),
        student_identifier: student.student_identifier.trim() || undefined
      })));

      if (!result.success) {
        throw new Error(result.error || 'Failed to add students');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error bulk creating students:', error);
      setServerError(error.message || 'Failed to import students. Please review the list and try again.');
    } finally {
      setIsSubmitting(false);
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

  const updateBulkStudent = (index: number, field: keyof BulkStudentDraft, value: string) => {
    setBulkStudents((prev) => prev.map((student, i) => (
      i === index ? { ...student, [field]: value } : student
    )));
    setServerError(null);
  };

  const removeBulkStudent = (index: number) => {
    setBulkStudents((prev) => prev.filter((_, i) => i !== index));
    setServerError(null);
  };

  const addAccommodationTemplate = (template: string) => {
    const current = formData.accommodations;
    const newValue = current ? `${current}\n• ${template}` : `• ${template}`;
    setFormData(prev => ({ ...prev, accommodations: newValue }));
    setShowAccommodationTemplates(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Add New Student</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting || isParsing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setEntryMode('single');
                setServerError(null);
              }}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                entryMode === 'single' ? 'bg-white text-greyed-navy shadow-sm' : 'text-gray-600 hover:text-greyed-navy'
              }`}
            >
              Single student
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('bulk');
                setServerError(null);
              }}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                entryMode === 'bulk' ? 'bg-white text-greyed-navy shadow-sm' : 'text-gray-600 hover:text-greyed-navy'
              }`}
            >
              Bulk upload
            </button>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{serverError}</p>
            </div>
          )}

          {entryMode === 'single' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={isSubmitting}
                    maxLength={MAX_STUDENT_NAME_LENGTH}
                    autoCapitalize="none"
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
                    disabled={isSubmitting}
                    maxLength={MAX_STUDENT_ID_LENGTH}
                  />
                  {errors.student_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.student_id}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-900">Neurodivergence Information (Optional)</h3>
                </div>
                <p className="text-sm text-gray-600">
                  This information helps provide appropriate support and accommodations for the student.
                </p>

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
                    disabled={isSubmitting}
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting}
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

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Add Student</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv,.xls,.xlsx"
                className="hidden"
                onChange={handleBulkFileChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isParsing}
                className="w-full rounded-lg border-2 border-dashed border-greyed-blue bg-greyed-blue/10 px-5 py-8 text-left hover:border-greyed-navy hover:bg-greyed-blue/20 transition-colors disabled:opacity-60"
              >
                <div className="flex items-start gap-4">
                  <span className="w-12 h-12 rounded-lg bg-white text-greyed-navy flex items-center justify-center shadow-sm">
                    {isParsing ? <Loader className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-greyed-navy">
                      {bulkFileName || 'Upload class list document'}
                    </span>
                    <span className="block text-sm text-greyed-black/60 mt-1">
                      PDF, DOCX, Excel, CSV, or text files are supported.
                    </span>
                  </span>
                </div>
              </button>

              {bulkStudents.length > 0 && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-greyed-navy" />
                      <h3 className="text-sm font-semibold text-greyed-navy">
                        Detected students ({validBulkStudents.length})
                      </h3>
                    </div>
                    <span className="text-xs text-gray-500">Maximum class size: 35</span>
                  </div>

                  <div className="max-h-[280px] overflow-y-auto divide-y divide-gray-100">
                    {bulkStudents.map((student, index) => (
                      <div key={`${student.student_name}-${index}`} className="grid grid-cols-[1fr_150px_36px] gap-3 px-4 py-3 items-center">
                        <input
                          type="text"
                          value={student.student_name}
                          onChange={(e) => updateBulkStudent(index, 'student_name', e.target.value)}
                          className="min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="Student name"
                          maxLength={MAX_STUDENT_NAME_LENGTH}
                          disabled={isSubmitting}
                        />
                        <input
                          type="text"
                          value={student.student_identifier}
                          onChange={(e) => updateBulkStudent(index, 'student_identifier', e.target.value)}
                          className="min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="ID"
                          maxLength={MAX_STUDENT_ID_LENGTH}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => removeBulkStudent(index)}
                          className="w-9 h-9 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
                          aria-label={`Remove ${student.student_name || 'student'}`}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isSubmitting || isParsing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={isSubmitting || isParsing || validBulkStudents.length === 0}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Import {validBulkStudents.length || ''} Students</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;
