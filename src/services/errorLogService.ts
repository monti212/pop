import { supabase } from './authService';
import type {
  ObservabilityCategory,
  ObservabilitySeverity,
} from '../utils/logger';

export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'ignored' | 'observed' | 'regressed';

export interface ObservabilityIssue {
  id: string;
  fingerprint: string;
  title: string;
  summary: string | null;
  severity: ObservabilitySeverity;
  category: ObservabilityCategory;
  source: string;
  environment: 'development' | 'production';
  status: IssueStatus;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  latest_user_id: string | null;
  latest_route: string | null;
  latest_context: Record<string, string | number>;
  sample_stack: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeObservabilityEvent {
  fingerprint: string;
  title: string;
  summary: string | null;
  severity: ObservabilitySeverity;
  category: ObservabilityCategory;
  source: string;
  route: string | null;
  context: Record<string, string | number>;
  stack: string | null;
}

export interface IssueFilters {
  status?: IssueStatus | 'active';
  severity?: ObservabilitySeverity;
  category?: ObservabilityCategory;
  search?: string;
  owner?: 'all' | 'mine' | 'unassigned';
}

class ErrorLogService {
  async capture(event: SafeObservabilityEvent): Promise<void> {
    if (import.meta.env.DEV || !supabase) return;

    await supabase.rpc('record_observability_issue', {
      p_fingerprint: event.fingerprint,
      p_title: event.title,
      p_summary: event.summary,
      p_severity: event.severity,
      p_category: event.category,
      p_source: event.source,
      p_environment: 'production',
      p_route: event.route,
      p_context: event.context,
      p_stack: event.stack,
    });
  }

  async getIssues(limit = 500): Promise<{ issues: ObservabilityIssue[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('observability_issues')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(limit);

      if (error) return { issues: [], error: error.message };
      return { issues: (data || []) as ObservabilityIssue[] };
    } catch (error) {
      return { issues: [], error: error instanceof Error ? error.message : 'Unable to load issues' };
    }
  }

  async manageIssue(
    id: string,
    status: IssueStatus,
    resolutionNotes: string | null,
    assignment: 'keep' | 'claim' | 'unassign' = 'keep',
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('manage_observability_issue', {
        p_id: id,
        p_status: status,
        p_resolution_notes: resolutionNotes,
        p_assignment: assignment,
      });
      return error ? { success: false, error: error.message } : { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to update issue',
      };
    }
  }
}

export const errorLogService = new ErrorLogService();
