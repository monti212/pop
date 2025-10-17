import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, TrendingUp, Users, Clock,
  RefreshCw, AlertTriangle, Loader, Calendar, Hash, Send, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';

interface MessageData {
  totalMessages: number;
  todayMessages: number;
  last7DaysMessages: number;
  last30DaysMessages: number;
  averageMessagesPerUser: number;
  dailyMessageCounts: Array<{
    date: string;
    count: number;
  }>;
  hourlyMessageCounts: Array<{
    hour: number;
    count: number;
  }>;
  messagesByRole: {
    user: number;
    assistant: number;
  };
}

const MessageAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [messageData, setMessageData] = useState<MessageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('header');

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  const fetchMessageData = async () => {
    if (!user) {
      setError('User not authenticated.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session.');
      }

      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const last7Days = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      const last30Days = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Fetch total messages count
      const { count: totalMessages, error: totalError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Fetch today's messages
      const { count: todayMessages, error: todayError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      if (todayError) throw todayError;

      // Fetch last 7 days messages
      const { count: last7DaysMessages, error: week7Error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last7Days.toISOString());

      if (week7Error) throw week7Error;

      // Fetch last 30 days messages
      const { count: last30DaysMessages, error: month30Error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      if (month30Error) throw month30Error;

      // Fetch user count for average calculation
      const { count: totalUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Calculate average messages per user
      const averageMessagesPerUser = totalUsers > 0 ? Math.round((totalMessages || 0) / totalUsers) : 0;

      // Fetch daily message counts for the last 7 days
      const dailyPromises = [];
      for (let i = 6; i >= 0; i--) {
        const targetDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        const nextDate = new Date(targetDate.getTime() + (24 * 60 * 60 * 1000));
        
        dailyPromises.push(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', targetDate.toISOString())
            .lt('created_at', nextDate.toISOString())
        );
      }

      const dailyResults = await Promise.all(dailyPromises);
      const dailyMessageCounts = dailyResults.map((result, index) => {
        const date = new Date(now.getTime() - ((6 - index) * 24 * 60 * 60 * 1000));
        return {
          date: date.toISOString().split('T')[0],
          count: result.count || 0
        };
      });

      // Fetch hourly message counts for today
      const hourlyPromises = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(today);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1, 0, 0, 0);
        
        hourlyPromises.push(
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', hourStart.toISOString())
            .lt('created_at', hourEnd.toISOString())
        );
      }

      const hourlyResults = await Promise.all(hourlyPromises);
      const hourlyMessageCounts = hourlyResults.map((result, index) => ({
        hour: index,
        count: result.count || 0
      }));

      // Get message counts by role
      const { count: userMessages, error: userMsgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      const { count: assistantMessages, error: assistantMsgError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'assistant');

      const data: MessageData = {
        totalMessages: totalMessages || 0,
        todayMessages: todayMessages || 0,
        last7DaysMessages: last7DaysMessages || 0,
        last30DaysMessages: last30DaysMessages || 0,
        averageMessagesPerUser,
        dailyMessageCounts,
        hourlyMessageCounts,
        messagesByRole: {
          user: userMessages || 0,
          assistant: assistantMessages || 0
        }
      };

      setMessageData(data);
    } catch (err: any) {
      console.error('Error fetching message data:', err);
      setError(err.message || 'Failed to load message analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessageData();
  }, [user]);

  return (
    <div className="h-screen bg-sand flex">
      {/* Navigation Scrollbar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-2">
        <button
          onClick={() => scrollToSection('header')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'header' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Header"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scrollToSection('metrics')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'metrics' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Key Metrics"
        >
          <Hash className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scrollToSection('trends')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'trends' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Message Trends"
        >
          <TrendingUp className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scrollToSection('users')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'users' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Top Users"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>
      
      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div id="header">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/dashboard"
            className="p-2 rounded-lg text-navy hover:text-teal hover:bg-teal/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-navy">Message Analytics</h2>
            <p className="text-navy/70 text-sm">Real-time insights into user messaging patterns and engagement</p>
          </div>
        </div>
        
        <button
          onClick={fetchMessageData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

          </div>

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <Loader className="w-6 h-6 animate-spin text-teal" />
            <p className="text-lg text-navy">Loading message analytics...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-lg p-6 max-w-2xl mx-auto my-8">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-medium text-lg">Data Loading Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchMessageData}
                className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      ) : messageData ? (
        <div className="space-y-8 pb-8">
          {/* Key Metrics Grid */}
          <div id="metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-teal/10 rounded-full mr-4">
                  <MessageSquare className="w-6 h-6 text-teal" />
                </div>
                <div>
                  <p className="text-sm text-navy/70 font-medium">Total Messages</p>
                  <h3 className="text-3xl font-bold text-navy">{messageData.totalMessages.toLocaleString()}</h3>
                  <p className="text-xs text-navy/50 mt-1">All time messages</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-blue-500/10 rounded-full mr-4">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-navy/70 font-medium">Today</p>
                  <h3 className="text-3xl font-bold text-navy">{messageData.todayMessages.toLocaleString()}</h3>
                  <p className="text-xs text-blue-600 mt-1">messages today</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-orange-500/10 rounded-full mr-4">
                  <Calendar className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-navy/70 font-medium">Last 7 Days</p>
                  <h3 className="text-3xl font-bold text-navy">{messageData.last7DaysMessages.toLocaleString()}</h3>
                  <p className="text-xs text-orange-600 mt-1">this week</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <div className="flex items-center">
                <div className="p-3 bg-purple-500/10 rounded-full mr-4">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-navy/70 font-medium">Avg per User</p>
                  <h3 className="text-3xl font-bold text-navy">{messageData.averageMessagesPerUser.toLocaleString()}</h3>
                  <p className="text-xs text-purple-600 mt-1">messages/user</p>
                </div>
              </div>
            </motion.div>
          </div>
          </div>

          {/* Message Trends Chart */}
          <div id="trends">
          <motion.div 
            className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-navy mb-4">Daily Message Trends (Last 7 Days)</h3>
            <div className="grid grid-cols-7 gap-2 h-32">
              {messageData.dailyMessageCounts.map((day, index) => {
                const maxCount = Math.max(...messageData.dailyMessageCounts.map(d => d.count));
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="flex-1 flex items-end">
                      <div 
                        className="w-full bg-teal rounded-t"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                        title={`${day.count} messages`}
                      ></div>
                    </div>
                    <p className="text-xs text-navy/70 mt-2">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-xs font-medium text-navy">{day.count}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
          </div>

          {/* Hourly Message Distribution */}
          <div id="users">
          <motion.div 
            className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <h3 className="text-lg font-semibold text-navy mb-4">Today's Message Activity by Hour</h3>
            <div className="grid grid-cols-12 gap-1 h-24 mb-4">
              {messageData.hourlyMessageCounts.map((hourData, index) => {
                const maxCount = Math.max(...messageData.hourlyMessageCounts.map(h => h.count));
                const height = maxCount > 0 ? (hourData.count / maxCount) * 100 : 0;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="flex-1 flex items-end">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${hourData.count} messages at ${hourData.hour}:00`}
                      ></div>
                    </div>
                    <p className="text-xs text-navy/70 mt-1">
                      {hourData.hour.toString().padStart(2, '0')}
                    </p>
                  </div>
                );
              })}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy">User Messages</span>
                  <span className="text-lg font-bold text-blue-600">{messageData.messagesByRole.user.toLocaleString()}</span>
                </div>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy">AI Responses</span>
                  <span className="text-lg font-bold text-teal">{messageData.messagesByRole.assistant.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
          </div>

          {/* Message Volume Analysis */}
          <div id="volume">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div 
              className="bg-gradient-to-br from-teal/5 to-teal/10 rounded-xl p-6 border border-teal/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              <h3 className="text-lg font-semibold text-navy mb-4">Weekly Growth</h3>
              <div className="text-center">
                <div className="text-4xl font-bold text-teal mb-2">
                  {messageData.last7DaysMessages > 0 && messageData.last30DaysMessages > messageData.last7DaysMessages ? 
                    '+' + Math.round(((messageData.last7DaysMessages - (messageData.last30DaysMessages - messageData.last7DaysMessages)) / (messageData.last30DaysMessages - messageData.last7DaysMessages)) * 100) :
                    '0'
                  }%
                </div>
                <p className="text-sm text-navy/70">vs previous week</p>
              </div>
            </motion.div>

            <motion.div 
              className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
            >
              <h3 className="text-lg font-semibold text-navy mb-4">Message Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-navy">Today</span>
                  <span className="font-medium text-navy">{messageData.todayMessages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-navy">This week</span>
                  <span className="font-medium text-navy">{messageData.last7DaysMessages}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-navy">This month</span>
                  <span className="font-medium text-navy">{messageData.last30DaysMessages}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium text-navy">Total</span>
                  <span className="font-bold text-navy">{messageData.totalMessages}</span>
                </div>
              </div>
            </motion.div>
          </div>
          </div>

          {/* Note about data limitations */}
          <div id="note">
          <motion.div 
            className="bg-blue-50 border border-blue-200 rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.9 }}
          >
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Data Note</h4>
                <p className="text-sm text-blue-700">
                  Some analytics (like top active users and trends) use mock data for demonstration. 
                  In a production environment, these would be calculated using dedicated analytics Edge Functions 
                  to avoid performance issues with large datasets.
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </div>
      ) : (
        <div id="no-data" className="text-center py-12">
          <p className="text-navy/70">No message analytics data available.</p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default MessageAnalytics;