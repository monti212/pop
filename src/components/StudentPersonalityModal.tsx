import React, { useState, useEffect } from 'react';
import { X, Save, Brain, Users, Zap, Target, AlertCircle, CheckCircle } from 'lucide-react';
import {
  CreatePersonalityTraitsData,
  LearningStyle,
  WorkPace,
  ParticipationLevel,
  CollaborationPreference,
  IndependenceLevel,
  FocusDuration,
  EnergyLevel,
  MotivationType,
  StressResponse,
  PeerInteractionStyle,
  LeadershipQualities,
  CommunicationStyle
} from '../types/studentProfile';
import { createOrUpdatePersonalityTraits } from '../services/studentProfileService';

interface StudentPersonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId: string;
  studentName: string;
  existingTraits?: any;
}

const StudentPersonalityModal: React.FC<StudentPersonalityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  studentName,
  existingTraits
}) => {
  const [activeTab, setActiveTab] = useState<'learning' | 'personality' | 'behavioral' | 'social' | 'academic'>('learning');
  const [formData, setFormData] = useState<CreatePersonalityTraitsData>({
    student_id: studentId,
    learning_style: 'visual',
    work_pace: 'moderate',
    participation_level: 'moderate',
    collaboration_preference: 'flexible',
    independence_level: 'moderate',
    focus_duration: 'average',
    energy_level: 'moderate',
    motivation_type: 'intrinsic',
    stress_response: 'calm',
    peer_interaction_style: 'balanced',
    leadership_qualities: 'emerging',
    communication_style: 'verbal',
    favorite_subjects: [],
    challenging_subjects: [],
    preferred_activities: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingTraits) {
      setFormData({
        student_id: studentId,
        ...existingTraits
      });
    }
  }, [existingTraits, studentId]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setServerError(null);
  };

  const handleArrayChange = (field: string, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await createOrUpdatePersonalityTraits(formData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save personality traits');
      }

      setSuccessMessage('Personality profile saved successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error saving personality traits:', error);
      setServerError(error.message || 'Failed to save personality profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'learning', label: 'Learning Style', icon: Brain },
    { id: 'personality', label: 'Work Style', icon: Target },
    { id: 'behavioral', label: 'Behavioral', icon: Zap },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'academic', label: 'Academic', icon: CheckCircle }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Student Personality Profile</h2>
              <p className="text-sm text-gray-600 mt-1">{studentName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {serverError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{serverError}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {activeTab === 'learning' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Learning Style
                </label>
                <select
                  value={formData.learning_style}
                  onChange={(e) => handleChange('learning_style', e.target.value as LearningStyle)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="visual">Visual - Learns best with images, diagrams, and spatial understanding</option>
                  <option value="auditory">Auditory - Learns best through listening and verbal instruction</option>
                  <option value="kinesthetic">Kinesthetic - Learns best through hands-on activities and movement</option>
                  <option value="reading-writing">Reading/Writing - Learns best through written words and note-taking</option>
                  <option value="multimodal">Multimodal - Uses multiple learning styles effectively</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Style Notes
                </label>
                <textarea
                  value={formData.learning_style_notes || ''}
                  onChange={(e) => handleChange('learning_style_notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Additional observations about this student's learning preferences..."
                />
              </div>
            </div>
          )}

          {activeTab === 'personality' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Pace
                </label>
                <select
                  value={formData.work_pace}
                  onChange={(e) => handleChange('work_pace', e.target.value as WorkPace)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="fast">Fast - Completes tasks quickly</option>
                  <option value="moderate">Moderate - Steady, balanced pace</option>
                  <option value="methodical">Methodical - Takes time to ensure quality</option>
                  <option value="variable">Variable - Pace depends on task and context</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participation Level
                </label>
                <select
                  value={formData.participation_level}
                  onChange={(e) => handleChange('participation_level', e.target.value as ParticipationLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="high">High - Frequently volunteers and engages</option>
                  <option value="moderate">Moderate - Participates when called upon</option>
                  <option value="low">Low - Rarely participates verbally</option>
                  <option value="selective">Selective - Participates for preferred topics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collaboration Preference
                </label>
                <select
                  value={formData.collaboration_preference}
                  onChange={(e) => handleChange('collaboration_preference', e.target.value as CollaborationPreference)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="independent">Independent - Prefers working alone</option>
                  <option value="small-group">Small Group - Works best with 2-3 peers</option>
                  <option value="large-group">Large Group - Thrives in larger collaborative settings</option>
                  <option value="flexible">Flexible - Adapts to various group sizes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Independence Level
                </label>
                <select
                  value={formData.independence_level}
                  onChange={(e) => handleChange('independence_level', e.target.value as IndependenceLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="highly-independent">Highly Independent - Self-directed learner</option>
                  <option value="moderate">Moderate - Balances independence and guidance</option>
                  <option value="needs-support">Needs Support - Benefits from frequent check-ins</option>
                  <option value="variable">Variable - Depends on task difficulty</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'behavioral' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Duration
                </label>
                <select
                  value={formData.focus_duration}
                  onChange={(e) => handleChange('focus_duration', e.target.value as FocusDuration)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="extended">Extended - Can focus for long periods</option>
                  <option value="average">Average - Standard attention span</option>
                  <option value="short">Short - Benefits from frequent breaks</option>
                  <option value="variable">Variable - Depends on interest level</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Energy Level
                </label>
                <select
                  value={formData.energy_level}
                  onChange={(e) => handleChange('energy_level', e.target.value as EnergyLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="high">High - Very active and energetic</option>
                  <option value="moderate">Moderate - Balanced energy</option>
                  <option value="low">Low - Calm and reserved demeanor</option>
                  <option value="variable">Variable - Energy fluctuates</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivation Type
                </label>
                <select
                  value={formData.motivation_type}
                  onChange={(e) => handleChange('motivation_type', e.target.value as MotivationType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="intrinsic">Intrinsic - Motivated by personal interest</option>
                  <option value="extrinsic">Extrinsic - Motivated by external rewards</option>
                  <option value="mixed">Mixed - Combination of both</option>
                  <option value="goal-oriented">Goal-Oriented - Driven by achievement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stress Response
                </label>
                <select
                  value={formData.stress_response}
                  onChange={(e) => handleChange('stress_response', e.target.value as StressResponse)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="calm">Calm - Handles stress well</option>
                  <option value="anxious">Anxious - Becomes worried under pressure</option>
                  <option value="resilient">Resilient - Bounces back quickly</option>
                  <option value="overwhelmed">Overwhelmed - Struggles with high-stress situations</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peer Interaction Style
                </label>
                <select
                  value={formData.peer_interaction_style}
                  onChange={(e) => handleChange('peer_interaction_style', e.target.value as PeerInteractionStyle)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="outgoing">Outgoing - Very social and friendly</option>
                  <option value="balanced">Balanced - Mix of social and independent time</option>
                  <option value="reserved">Reserved - Prefers smaller social circles</option>
                  <option value="selective">Selective - Chooses peers carefully</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leadership Qualities
                </label>
                <select
                  value={formData.leadership_qualities}
                  onChange={(e) => handleChange('leadership_qualities', e.target.value as LeadershipQualities)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="natural-leader">Natural Leader - Takes charge confidently</option>
                  <option value="emerging">Emerging - Showing leadership potential</option>
                  <option value="supportive">Supportive - Prefers supporting roles</option>
                  <option value="follower">Follower - Comfortable following others</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Style
                </label>
                <select
                  value={formData.communication_style}
                  onChange={(e) => handleChange('communication_style', e.target.value as CommunicationStyle)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="verbal">Verbal - Expresses ideas through speaking</option>
                  <option value="written">Written - Prefers written communication</option>
                  <option value="visual">Visual - Uses gestures and visual aids</option>
                  <option value="multimodal">Multimodal - Uses various communication methods</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favorite Subjects (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.favorite_subjects?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('favorite_subjects', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Math, Science, Art"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Challenging Subjects (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.challenging_subjects?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('challenging_subjects', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Reading, Writing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Activities (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.preferred_activities?.join(', ') || ''}
                  onChange={(e) => handleArrayChange('preferred_activities', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Group projects, Presentations, Labs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reward Preferences
                </label>
                <textarea
                  value={formData.reward_preferences || ''}
                  onChange={(e) => handleChange('reward_preferences', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="What motivates this student? (e.g., praise, responsibility, free time)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher Observations
                </label>
                <textarea
                  value={formData.teacher_observations || ''}
                  onChange={(e) => handleChange('teacher_observations', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Any additional observations or notes about this student..."
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
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
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentPersonalityModal;
