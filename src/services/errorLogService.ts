import { supabase } from './authService';

export interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: 'runtime' | 'network' | 'database' | 'authentication' | 'validation' | 'unknown';
  error_message: string;
  error_stack: string | null;
  error_context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  environment: 'development' | 'production';
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateErrorLog {
  error_type: ErrorLog['error_type'];
  error_message: string;
  error_stack?: string | null;
  error_context?: Record<string, any>;
  severity: ErrorLog['severity'];
}

export interface ResolveErrorLog {
  id: string;
  resolution_notes: string;
}

export interface ErrorLogFilters {
  error_type?: string;
  severity?: string;
  environment?: string;
  resolved?: boolean;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

class ErrorLogService {
  /**
   * Get the current environment
   */
  private getEnvironment(): 'development' | 'production' {
    return import.meta.env.MODE === 'production' ? 'production' : 'development';
  }

  /**
   * Get browser context information
   */
  private getBrowserContext(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  /**
   * Log an error to the database
   */
  async logError(errorData: CreateErrorLog): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const errorLog = {
        user_id: user?.id || null,
        error_type: errorData.error_type,
        error_message: errorData.error_message,
        error_stack: errorData.error_stack || null,
        error_context: {
          ...this.getBrowserContext(),
          ...(errorData.error_context || {}),
        },
        severity: errorData.severity,
        environment: this.getEnvironment(),
      };

      const { error } = await supabase
        .from('error_logs')
        .insert(errorLog);

      if (error) {
        console.error('Failed to log error to database:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Exception while logging error:', err);
      return { success: false, error: String(err) };
    }
  }

  /**
   * Log a JavaScript error
   */
  async logJSError(error: Error, severity: ErrorLog['severity'] = 'medium'): Promise<void> {
    await this.logError({
      error_type: 'runtime',
      error_message: error.message,
      error_stack: error.stack || null,
      severity,
    });
  }

  /**
   * Log a network error
   */
  async logNetworkError(
    message: string,
    context?: Record<string, any>,
    severity: ErrorLog['severity'] = 'medium'
  ): Promise<void> {
    await this.logError({
      error_type: 'network',
      error_message: message,
      error_context: context,
      severity,
    });
  }

  /**
   * Log a database error
   */
  async logDatabaseError(
    message: string,
    context?: Record<string, any>,
    severity: ErrorLog['severity'] = 'high'
  ): Promise<void> {
    await this.logError({
      error_type: 'database',
      error_message: message,
      error_context: context,
      severity,
    });
  }

  /**
   * Log an authentication error
   */
  async logAuthError(
    message: string,
    context?: Record<string, any>,
    severity: ErrorLog['severity'] = 'medium'
  ): Promise<void> {
    await this.logError({
      error_type: 'authentication',
      error_message: message,
      error_context: context,
      severity,
    });
  }

  /**
   * Get all error logs (with filters)
   */
  async getErrorLogs(filters?: ErrorLogFilters, limit = 100, offset = 0): Promise<{
    logs: ErrorLog[];
    count: number;
    error?: string;
  }> {
    try {
      let query = supabase
        .from('error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.error_type) {
        query = query.eq('error_type', filters.error_type);
      }

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters?.environment) {
        query = query.eq('environment', filters.environment);
      }

      if (filters?.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return { logs: [], count: 0, error: error.message };
      }

      return { logs: data || [], count: count || 0 };
    } catch (err) {
      return { logs: [], count: 0, error: String(err) };
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(): Promise<{
    total: number;
    unresolved: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byEnvironment: Record<string, number>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('error_type, severity, environment, resolved');

      if (error) {
        return {
          total: 0,
          unresolved: 0,
          byType: {},
          bySeverity: {},
          byEnvironment: {},
          error: error.message,
        };
      }

      const stats = {
        total: data.length,
        unresolved: data.filter((log) => !log.resolved).length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byEnvironment: {} as Record<string, number>,
      };

      data.forEach((log) => {
        stats.byType[log.error_type] = (stats.byType[log.error_type] || 0) + 1;
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
        stats.byEnvironment[log.environment] = (stats.byEnvironment[log.environment] || 0) + 1;
      });

      return stats;
    } catch (err) {
      return {
        total: 0,
        unresolved: 0,
        byType: {},
        bySeverity: {},
        byEnvironment: {},
        error: String(err),
      };
    }
  }

  /**
   * Resolve an error
   */
  async resolveError(data: ResolveErrorLog): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: data.resolution_notes,
        })
        .eq('id', data.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Unresolve an error
   */
  async unresolveError(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: false,
          resolved_by: null,
          resolved_at: null,
          resolution_notes: null,
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Delete an error log
   */
  async deleteError(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Bulk delete errors
   */
  async bulkDeleteErrors(ids: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .in('id', ids);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export const errorLogService = new ErrorLogService();
