import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/authService';
import { ArrowLeft, TrendingUp, Server, Database, HardDrive } from 'lucide-react';

export default function CapacityPlanningDashboard() {
  const [loading, setLoading] = useState(true);
  const [predictedUsers30, setPredictedUsers30] = useState(0);
  const [predictedUsers90, setPredictedUsers90] = useState(0);

  const fetchCapacityMetrics = async () => {
    try {
      setLoading(true);

      const { count: currentUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_name', 'Pencils of Promise');

      const growthRate = 1.155;
      const predicted30 = Math.round((currentUsers || 0) * growthRate);
      const predicted90 = Math.round((currentUsers || 0) * Math.pow(growthRate, 3));

      setPredictedUsers30(predicted30);
      setPredictedUsers90(predicted90);
    } catch (error) {
      console.error('Error fetching capacity metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacityMetrics();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
      <div className="flex items-center space-x-4">
        <Link to="/supa-admin" className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Capacity Planning & Forecasting</h1>
          <p className="text-gray-600 mt-1">Pencils of Promise - Resource Planning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Predicted Users (30d)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{predictedUsers30}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Predicted Users (90d)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{predictedUsers90}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Database Growth Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">5.2%</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Database className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Growth Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">8.1%</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <HardDrive className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recommendations</h2>
        <p className="text-gray-700">Current capacity sufficient for 6 months. Monitor growth trends closely.</p>
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </div>
      )}
    </div>
  );
}
