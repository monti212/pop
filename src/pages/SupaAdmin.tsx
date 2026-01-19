import { Link } from 'react-router-dom';
import { Activity, TrendingUp, DollarSign, Zap } from 'lucide-react';

export default function SupaAdmin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">Supa Admin Dashboard</h1>
          <p className="text-slate-400 text-lg">System Monitoring & Analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/supa-admin/monitor"
            className="group bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-2xl p-8 transition-all shadow-2xl hover:shadow-green-500/20 hover:scale-105 transform duration-300"
          >
            <Activity className="w-12 h-12 text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Live System Monitor</h2>
            <p className="text-green-100">Real-time system health and performance monitoring</p>
          </Link>

          <Link
            to="/supa-admin/performance"
            className="group bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl p-8 transition-all shadow-2xl hover:shadow-purple-500/20 hover:scale-105 transform duration-300"
          >
            <TrendingUp className="w-12 h-12 text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Performance Analytics</h2>
            <p className="text-purple-100">Detailed performance metrics and analysis</p>
          </Link>

          <Link
            to="/supa-admin/token-cost"
            className="group bg-gradient-to-br from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-2xl p-8 transition-all shadow-2xl hover:shadow-yellow-500/20 hover:scale-105 transform duration-300"
          >
            <DollarSign className="w-12 h-12 text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Token Cost Tracking</h2>
            <p className="text-yellow-100">Monitor token usage and cost breakdown</p>
          </Link>

          <Link
            to="/supa-admin/live"
            className="group bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-2xl p-8 transition-all shadow-2xl hover:shadow-blue-500/20 hover:scale-105 transform duration-300"
          >
            <Zap className="w-12 h-12 text-white mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Live Command Center</h2>
            <p className="text-blue-100">Advanced live metrics and system controls</p>
          </Link>
        </div>

      </div>
    </div>
  );
}
