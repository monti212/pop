import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, UserCheck, UserX,
  RefreshCw, AlertTriangle, Loader, Calendar, Clock, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';

interface AdminData {
  totalUsers: number;
  activeUsers: number;
  dormantUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
}

const UserAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch admin data.');
      }

      const data: AdminData = await response.json();
      setAdminData(data);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  // Calculate week-on-week growth percentage
  const calculateWeekOnWeekGrowth = () => {
    if (!adminData) return 0;
    const { newUsersLast7Days, newUsersLast30Days } = adminData;
    const previousWeekUsers = newUsersLast30Days - newUsersLast7Days;
    if (previousWeekUsers === 0) return newUsersLast7Days > 0 ? 100 : 0;
    return ((newUsersLast7Days - previousWeekUsers) / previousWeekUsers) * 100;
  };

  const weekOnWeekGrowth = calculateWeekOnWeekGrowth();

  const [activeSection, setActiveSection] = useState('header');

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

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
          <Users className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scrollToSection('metrics')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'metrics' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Key Metrics"
        >
          <TrendingUp className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scrollToSection('growth')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'growth' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Growth Metrics"
        >
          <Calendar className="w-5 h-5" />
        </button>
        
        <button
          onClick={() => scrollToSection('engagement')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeSection === 'engagement' ? 'bg-teal text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="Engagement"
        >
          <UserCheck className="w-5 h-5" />
        </button>
      </div>
      
      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div id="header">
            <div className="p-6 overflow-y-auto">
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
                    <h2 className="text-2xl font-bold text-navy">Detailed User Analytics</h2>
                    <p className="text-navy/70 text-sm">Comprehensive insights into user registration, activity, and engagement patterns</p>
                  </div>
                </div>
                
                <button
                  onClick={fetchAdminData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh Data</span>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="flex items-center gap-3">
                <Loader className="w-6 h-6 animate-spin text-teal" />
                <p className="text-lg text-navy">Loading user analytics...</p>
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
                    onClick={fetchAdminData}
                    className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm hover:bg-red-200 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : adminData ? (
            <div className="space-y-8 pb-8">
              {/* Key Metrics Grid */}
              <div id="metrics">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <motion.div 
                    className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-teal/10 rounded-full mr-4">
                        <Users className="w-6 h-6 text-teal" />
                      </div>
                      <div>
                        <p className="text-sm text-navy/70 font-medium">Total Users</p>
                        <h3 className="text-3xl font-bold text-navy">{adminData.totalUsers.toLocaleString()}</h3>
                        <p className="text-xs text-navy/50 mt-1">All registered users</p>
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
                      <div className="p-3 bg-green-500/10 rounded-full mr-4">
                        <UserCheck className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-navy/70 font-medium">Active Users</p>
                        <h3 className="text-3xl font-bold text-navy">{adminData.activeUsers.toLocaleString()}</h3>
                        <p className="text-xs text-green-600 mt-1">
                          {adminData.totalUsers > 0 ? Math.round((adminData.activeUsers / adminData.totalUsers) * 100) : 0}% of total users
                        </p>
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
                      <div className="p-3 bg-red-500/10 rounded-full mr-4">
                        <UserX className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm text-navy/70 font-medium">Dormant Users</p>
                        <h3 className="text-3xl font-bold text-navy">{adminData.dormantUsers.toLocaleString()}</h3>
                        <p className="text-xs text-red-600 mt-1">
                          {adminData.totalUsers > 0 ? Math.round((adminData.dormantUsers / adminData.totalUsers) * 100) : 0}% inactive 30+ days
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Growth Metrics */}
              <div id="growth">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div 
                    className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-orange-500/10 rounded-full mr-4">
                        <Calendar className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-navy/70 font-medium">New Users (7 days)</p>
                        <h3 className="text-3xl font-bold text-navy">{adminData.newUsersLast7Days.toLocaleString()}</h3>
                        <div className="flex items-center mt-1">
                          <span className={`text-xs font-medium ${weekOnWeekGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {weekOnWeekGrowth >= 0 ? '+' : ''}{weekOnWeekGrowth.toFixed(1)}% WoW
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-500/10 rounded-full mr-4">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-navy/70 font-medium">New Users (30 days)</p>
                        <h3 className="text-3xl font-bold text-navy">{adminData.newUsersLast30Days.toLocaleString()}</h3>
                        <p className="text-xs text-blue-600 mt-1">
                          {adminData.totalUsers > 0 ? Math.round((adminData.newUsersLast30Days / adminData.totalUsers) * 100) : 0}% of total
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                  >
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-500/10 rounded-full mr-4">
                        <Clock className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-navy/70 font-medium">Daily Average</p>
                        <h3 className="text-3xl font-bold text-navy">
                          {Math.round(adminData.newUsersLast30Days / 30).toLocaleString()}
                        </h3>
                        <p className="text-xs text-purple-600 mt-1">new users/day (30d avg)</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Engagement Summary */}
              <div id="engagement">
                <motion.div 
                  className="bg-gradient-to-br from-teal/5 to-teal/10 rounded-xl p-6 border border-teal/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  <h3 className="text-lg font-semibold text-navy mb-4">User Engagement Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-teal mb-2">
                        {adminData.totalUsers > 0 ? Math.round((adminData.activeUsers / adminData.totalUsers) * 100) : 0}%
                      </div>
                      <p className="text-sm text-navy/70">Engagement Rate</p>
                      <p className="text-xs text-navy/50">active in last 30 days</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange mb-2">
                        {weekOnWeekGrowth >= 0 ? '+' : ''}{weekOnWeekGrowth.toFixed(1)}%
                      </div>
                      <p className="text-sm text-navy/70">Growth Rate</p>
                      <p className="text-xs text-navy/50">week-over-week</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-navy mb-2">
                        {adminData.totalUsers > 0 ? Math.round(((adminData.totalUsers - adminData.dormantUsers) / adminData.totalUsers) * 100) : 0}%
                      </div>
                      <p className="text-sm text-navy/70">Retention Rate</p>
                      <p className="text-xs text-navy/50">users not dormant</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Additional Analytics Cards */}
              <div id="additional">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div 
                    className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.8 }}
                  >
                    <h4 className="text-lg font-semibold text-navy mb-4">User Registration Trends</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-navy">Last 7 days</span>
                        <span className="text-lg font-bold text-blue-600">{adminData.newUsersLast7Days}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-navy">Last 30 days</span>
                        <span className="text-lg font-bold text-green-600">{adminData.newUsersLast30Days}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-navy">All time</span>
                        <span className="text-lg font-bold text-navy">{adminData.totalUsers}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="bg-white rounded-xl p-6 border border-teal/10 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.9 }}
                  >
                    <h4 className="text-lg font-semibold text-navy mb-4">User Activity Status</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-navy">Active Users</span>
                        </div>
                        <span className="font-medium text-navy">{adminData.activeUsers}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-navy">Dormant Users</span>
                        </div>
                        <span className="font-medium text-navy">{adminData.dormantUsers}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${adminData.totalUsers > 0 ? (adminData.activeUsers / adminData.totalUsers) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-navy/50 text-center">
                        Active vs Dormant User Ratio
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Quick Stats Footer */}
              <div id="footer">
                <motion.div 
                  className="bg-navy rounded-xl p-6 text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 1.0 }}
                >
                  <div className="text-center">
                    <h4 className="text-lg font-semibold mb-2">Platform Health Score</h4>
                    <div className="text-4xl font-bold text-teal mb-2">
                      {adminData.totalUsers > 0 ? Math.round(((adminData.activeUsers / adminData.totalUsers) * 0.7 + (weekOnWeekGrowth > 0 ? 0.3 : 0)) * 100) : 0}
                    </div>
                    <p className="text-white/70 text-sm">
                      Based on engagement rate and growth trends
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            <div id="no-data" className="text-center py-12">
              <p className="text-navy/70">No user analytics data available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;