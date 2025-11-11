import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AlertsIncidentsDashboard() {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link to="/supa-admin" className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alerts & Incidents</h1>
            <p className="text-gray-600 mt-1">Pencils of Promise - System Health & Incident Management</p>
          </div>
        </div>
        <button onClick={() => setLastUpdate(new Date())} className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
          <RefreshCw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <Bell className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">MTTR</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">45m</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">All Systems Operational</span>
            </div>
            <span className="text-sm text-gray-600">Last checked: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
