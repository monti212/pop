import React, { useState } from 'react';
import { X, Sparkles, Users, Book, Clock, Target, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Student } from '../types/attendance';
import { CreateLessonPlanRequestData } from '../types/studentProfile';
import { createLessonPlanRequest, updateLessonPlanRequest } from '../services/studentProfileService';
import { getEnhancedStudentProfile } from '../services/studentProfileService';
import { useAuth } from '../context/AuthContext';
import { generateResponse } from '../services/chatService';
import { autoSaveLessonPlan } from '../services/lessonPlanService';
import StreamMarkdown from './StreamMarkdown';

interface LessonPlanGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lessonPlan: string, documentId?: string) => void;
  classId: string;
  className: string;
  students: Student[];
}

const LessonPlanGeneratorModal: React.FC<LessonPlanGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classId,
  className,
  students
}) => {
  const { user } = useAuth();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    topic: '',
    subject: '',
    duration_minutes: 45,
    lesson_date: '',
    differentiation_level: 'moderate' as 'minimal' | 'moderate' | 'extensive',
    include_accommodations: true,
    focus_areas: [] as string[]
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [lessonPlanRequestId, setLessonPlanRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleFocusAreaToggle = (area: string) => {
    setFormData(prev => ({
      ...prev,
      focus_areas: prev.focus_areas.includes(area)
        ? prev.focus_areas.filter(a => a !== area)
        : [...prev.focus_areas, area]
    }));
  };

  const handleGenerate = async () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }

    if (!formData.topic) {
      setError('Please enter a lesson topic');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationStatus('Preparing lesson plan...');

    try {
      // Step 1: Fetch student profiles
      setGenerationStatus('Loading student profiles...');
      const studentProfiles = await Promise.all(
        selectedStudents.map(id => getEnhancedStudentProfile(id))
      );

      const validProfiles = studentProfiles
        .filter(result => result.success && result.data)
        .map(result => result.data!);

      // Step 2: Build prompt
      const prompt = buildLessonPlanPrompt(validProfiles);

      // Step 3: Save request to database
      setGenerationStatus('Creating lesson plan request...');
      const requestData: CreateLessonPlanRequestData = {
        teacher_id: user.id,
        class_id: classId,
        student_ids: selectedStudents,
        topic: formData.topic,
        subject: formData.subject || undefined,
        duration_minutes: formData.duration_minutes,
        lesson_date: formData.lesson_date || undefined,
        differentiation_level: formData.differentiation_level,
        include_accommodations: formData.include_accommodations,
        focus_areas: formData.focus_areas
      };

      const requestResult = await createLessonPlanRequest(requestData);

      if (!requestResult.success || !requestResult.data) {
        throw new Error(requestResult.error || 'Failed to create lesson plan request');
      }

      // Store the request ID for later update
      const requestId = requestResult.data.id;
      setLessonPlanRequestId(requestId);

      // Update request status to 'generating'
      await updateLessonPlanRequest(requestId, {
        status: 'generating' as any
      });

      // Step 4: Generate lesson plan using AI
      setGenerationStatus('Generating personalized lesson plan with Uhuru AI...');
      setStep(3);

      const aiResponse = await generateResponse({
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational AI assistant specializing in creating personalized, differentiated lesson plans. Create comprehensive, practical lesson plans that address individual student needs.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        language: 'english',
        region: 'global',
        modelVersion: '2.0',
        onStatusUpdate: (status) => {
          setGenerationStatus(status);
        }
      });

      setGeneratedContent(aiResponse);
      setIsGenerating(false);

      // Step 5: Auto-save the lesson plan
      setIsSaving(true);
      setGenerationStatus('Saving lesson plan...');

      const saveResult = await autoSaveLessonPlan(
        aiResponse,
        user.id,
        undefined, // No conversation ID since this is from generator
        undefined  // No message ID
      );

      if (saveResult.success && saveResult.documentId) {
        setSavedDocumentId(saveResult.documentId);
        setGenerationStatus('Lesson plan saved successfully!');

        // Update the lesson plan request with the document ID and status
        if (requestId) {
          await updateLessonPlanRequest(requestId, {
            document_id: saveResult.documentId,
            status: 'completed' as any,
            generated_at: new Date().toISOString()
          });
        }

        // Notify parent component
        onSuccess(aiResponse, saveResult.documentId);
      } else {
        setError(saveResult.error || 'Failed to save lesson plan');

        // Update request status to failed if save failed
        if (requestId) {
          await updateLessonPlanRequest(requestId, {
            status: 'failed' as any,
            error_message: saveResult.error || 'Failed to save lesson plan'
          });
        }
      }

      setIsSaving(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate lesson plan');
      setIsGenerating(false);
      setIsSaving(false);

      // Update request status to failed if there was an error
      if (lessonPlanRequestId) {
        await updateLessonPlanRequest(lessonPlanRequestId, {
          status: 'failed' as any,
          error_message: err.message || 'Failed to generate lesson plan'
        });
      }
    }
  };

  const buildLessonPlanPrompt = (profiles: any[]): string => {
    const studentDetails = profiles.map(student => {
      const traits = student.personality_traits;
      return `
**${student.student_name}**
- Learning Style: ${traits?.learning_style || 'Not specified'}
- Work Pace: ${traits?.work_pace || 'Not specified'}
- Collaboration: ${traits?.collaboration_preference || 'Not specified'}
- Strengths: ${student.strengths || 'Not specified'}
- Areas for Improvement: ${student.areas_for_improvement || 'Not specified'}
- Accommodations: ${student.accommodations || 'None'}
${student.has_neurodivergence ? `- Neurodivergence: ${student.neurodivergence_type}` : ''}
      `.trim();
    }).join('\n\n');

    return `Please create a detailed, personalized lesson plan for the following class:

**Class Information:**
- Class: ${className}
- Topic: ${formData.topic}
${formData.subject ? `- Subject: ${formData.subject}` : ''}
- Duration: ${formData.duration_minutes} minutes
${formData.lesson_date ? `- Date: ${formData.lesson_date}` : ''}

**Differentiation Level:** ${formData.differentiation_level}
**Include Accommodations:** ${formData.include_accommodations ? 'Yes' : 'No'}
${formData.focus_areas.length > 0 ? `**Focus Areas:** ${formData.focus_areas.join(', ')}` : ''}

**Student Profiles:**
${studentDetails}

Please create a comprehensive lesson plan that:
1. Addresses each student's learning style and preferences
2. Incorporates appropriate differentiation strategies
3. Includes accommodations where needed
4. Provides specific activities tailored to their strengths
5. Offers support strategies for areas of improvement
6. Considers collaboration preferences for group activities
7. Adapts to the different work paces

Include:
- Learning objectives
- Materials needed
- Step-by-step lesson procedure
- Differentiation strategies for each student
- Assessment methods
- Extension activities
- Reflection questions`;
  };

  if (!isOpen) return null;

  const selectedStudentObjects = students.filter(s => selectedStudents.includes(s.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                <span>AI Lesson Plan Generator</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">{className}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isGenerating}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-teal-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-teal-100' : 'bg-gray-100'}`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-sm font-medium">Select Students</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200" />
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-teal-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-teal-100' : 'bg-gray-100'}`}>
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium">Lesson Details</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200" />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-teal-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-teal-100' : 'bg-gray-100'}`}>
                {savedDocumentId ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="text-sm font-medium">Generate & Save</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Select Students for Personalized Plan</span>
                </h3>
                <p className="text-sm text-gray-600">
                  Choose students whose needs should be considered in the lesson plan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {students.map(student => (
                  <label
                    key={student.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedStudents.includes(student.id)
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{student.student_name}</p>
                      {student.has_neurodivergence && student.neurodivergence_type && (
                        <p className="text-xs text-purple-600 mt-1">{student.neurodivergence_type}</p>
                      )}
                    </div>
                    {selectedStudents.includes(student.id) && (
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                    )}
                  </label>
                ))}
              </div>

              {students.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No students in this class yet</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <Book className="w-5 h-5 text-teal-600" />
                  <span>Lesson Details</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Selected {selectedStudentObjects.length} student{selectedStudentObjects.length !== 1 ? 's' : ''}: {' '}
                  {selectedStudentObjects.map(s => s.student_name).join(', ')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Topic *
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Introduction to Fractions"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Mathematics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Date
                  </label>
                  <input
                    type="date"
                    value={formData.lesson_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, lesson_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Differentiation Level
                  </label>
                  <select
                    value={formData.differentiation_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, differentiation_level: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="minimal">Minimal - Basic adaptations</option>
                    <option value="moderate">Moderate - Tailored activities</option>
                    <option value="extensive">Extensive - Highly individualized</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Areas
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Learning Styles', 'Accommodations', 'Strengths', 'Interests', 'Collaboration', 'Pacing'].map(area => (
                    <label
                      key={area}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.focus_areas.includes(area)
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.focus_areas.includes(area)}
                        onChange={() => handleFocusAreaToggle(area)}
                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.include_accommodations}
                  onChange={(e) => setFormData(prev => ({ ...prev, include_accommodations: e.target.checked }))}
                  className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Include Accommodations</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Incorporate specific accommodations for students with documented needs
                  </p>
                </div>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span>Generated Lesson Plan</span>
                </h3>
                {generationStatus && (
                  <div className="flex items-center space-x-2 text-sm text-teal-600 mb-4">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>{generationStatus}</span>
                  </div>
                )}
              </div>

              {isGenerating && !generatedContent && (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600">Creating your personalized lesson plan...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                </div>
              )}

              {generatedContent && (
                <div className="bg-gray-50 rounded-lg p-6 max-h-[500px] overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <StreamMarkdown content={generatedContent} />
                  </div>
                </div>
              )}

              {savedDocumentId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">Lesson Plan Saved Successfully!</p>
                    <p className="text-xs text-green-700 mt-1">
                      Your personalized lesson plan has been saved to your documents and is ready to use.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          {step === 3 && savedDocumentId ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Done</span>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isGenerating || isSaving}
              >
                Cancel
              </button>

              <div className="flex items-center space-x-3">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={isGenerating || isSaving}
                  >
                    Back
                  </button>
                )}
                {step === 1 && (
                  <button
                    onClick={() => {
                      if (selectedStudents.length === 0) {
                        setError('Please select at least one student');
                        return;
                      }
                      setError(null);
                      setStep(2);
                    }}
                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedStudents.length === 0}
                  >
                    Next
                  </button>
                )}
                {step === 2 && (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || isSaving || !formData.topic}
                    className="px-6 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating || isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isSaving ? 'Saving...' : 'Generating...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Lesson Plan</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonPlanGeneratorModal;
