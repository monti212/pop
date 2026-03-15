import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Database } from 'lucide-react';

export default function SystemConfigurationDashboard() {
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [backupFrequency, setBackupFrequency] = useState('daily');

  const handleSave = () => {
    alert('Configuration saved successfully!');
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
      <div className="flex items-center space-x-4">
        <Link to="/supa-admin" className="p-2 rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Configuration</h1>
          <p className="text-gray-600 mt-1">Pencils of Promise - Admin Settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Alert Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Usage Alert Threshold
              </label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Alert when database usage exceeds this percentage</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Backup Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Frequency
              </label>
              <select
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <button onClick={handleSave} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
