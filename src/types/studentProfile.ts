export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' | 'multimodal';
export type WorkPace = 'fast' | 'moderate' | 'methodical' | 'variable';
export type ParticipationLevel = 'high' | 'moderate' | 'low' | 'selective';
export type CollaborationPreference = 'independent' | 'small-group' | 'large-group' | 'flexible';
export type IndependenceLevel = 'highly-independent' | 'moderate' | 'needs-support' | 'variable';
export type FocusDuration = 'extended' | 'average' | 'short' | 'variable';
export type EnergyLevel = 'high' | 'moderate' | 'low' | 'variable';
export type MotivationType = 'intrinsic' | 'extrinsic' | 'mixed' | 'goal-oriented';
export type StressResponse = 'calm' | 'anxious' | 'resilient' | 'overwhelmed';
export type PeerInteractionStyle = 'outgoing' | 'balanced' | 'reserved' | 'selective';
export type LeadershipQualities = 'natural-leader' | 'emerging' | 'supportive' | 'follower';
export type CommunicationStyle = 'verbal' | 'written' | 'visual' | 'multimodal';

export interface StudentPersonalityTraits {
  id: string;
  student_id: string;

  learning_style: LearningStyle;
  learning_style_notes: string | null;

  work_pace: WorkPace;
  participation_level: ParticipationLevel;
  collaboration_preference: CollaborationPreference;
  independence_level: IndependenceLevel;

  focus_duration: FocusDuration;
  energy_level: EnergyLevel;
  motivation_type: MotivationType;
  stress_response: StressResponse;

  peer_interaction_style: PeerInteractionStyle;
  leadership_qualities: LeadershipQualities;
  communication_style: CommunicationStyle;

  favorite_subjects: string[];
  challenging_subjects: string[];
  preferred_activities: string[];
  reward_preferences: string | null;

  teacher_observations: string | null;

  created_at: string;
  updated_at: string;
}

export interface EnhancedStudent {
  id: string;
  class_id: string;
  student_name: string;
  student_identifier: string | null;
  has_neurodivergence: boolean;
  neurodivergence_type: string | null;
  accommodations: string | null;
  learning_notes: string | null;

  current_gpa: number;
  parent_guardian_name: string | null;
  parent_guardian_email: string | null;
  parent_guardian_phone: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  interests: string | null;
  preferred_seating: string | null;
  profile_photo_url: string | null;

  active_status: boolean;
  created_at: string;
  updated_at: string;

  personality_traits?: StudentPersonalityTraits;
  recent_grades?: StudentGrade[];
  attendance_rate?: number;
}

export interface StudentBehaviorLog {
  id: string;
  student_id: string;
  class_id: string;
  incident_date: string;
  incident_time: string | null;
  behavior_type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  context: string | null;
  action_taken: string | null;
  follow_up_needed: boolean;
  follow_up_completed: boolean;
  parent_notified: boolean;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonPlanRequest {
  id: string;
  teacher_id: string;
  class_id: string | null;
  student_ids: string[];

  topic: string;
  subject: string | null;
  duration_minutes: number;
  lesson_date: string | null;

  differentiation_level: 'minimal' | 'moderate' | 'extensive';
  include_accommodations: boolean;
  focus_areas: string[];

  lesson_plan_content: string | null;
  document_id: string | null;

  status: 'pending' | 'generating' | 'completed' | 'failed';
  generated_at: string | null;
  effectiveness_rating: number | null;
  teacher_notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface CreatePersonalityTraitsData {
  student_id: string;
  learning_style?: LearningStyle;
  learning_style_notes?: string;
  work_pace?: WorkPace;
  participation_level?: ParticipationLevel;
  collaboration_preference?: CollaborationPreference;
  independence_level?: IndependenceLevel;
  focus_duration?: FocusDuration;
  energy_level?: EnergyLevel;
  motivation_type?: MotivationType;
  stress_response?: StressResponse;
  peer_interaction_style?: PeerInteractionStyle;
  leadership_qualities?: LeadershipQualities;
  communication_style?: CommunicationStyle;
  favorite_subjects?: string[];
  challenging_subjects?: string[];
  preferred_activities?: string[];
  reward_preferences?: string;
  teacher_observations?: string;
}

export interface CreateBehaviorLogData {
  student_id: string;
  class_id: string;
  incident_date: string;
  incident_time?: string;
  behavior_type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  context?: string;
  action_taken?: string;
  follow_up_needed?: boolean;
  parent_notified?: boolean;
}

export interface CreateLessonPlanRequestData {
  teacher_id: string;
  class_id?: string;
  student_ids: string[];
  topic: string;
  subject?: string;
  duration_minutes?: number;
  lesson_date?: string;
  differentiation_level?: 'minimal' | 'moderate' | 'extensive';
  include_accommodations?: boolean;
  focus_areas?: string[];
}

export interface UpdateStudentProfileData {
  parent_guardian_name?: string;
  parent_guardian_email?: string;
  parent_guardian_phone?: string;
  emergency_contact?: string;
  medical_notes?: string;
  strengths?: string;
  areas_for_improvement?: string;
  interests?: string;
  preferred_seating?: string;
  profile_photo_url?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import { StudentGrade } from './grades';
