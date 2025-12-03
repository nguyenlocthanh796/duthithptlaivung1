/**
 * API Statistics - Thống kê API usage
 */
import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../ui';
import { LoadingSpinner } from '../common';

interface APIStatsProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const APIStats: React.FC<APIStatsProps> = ({ showToast }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // TODO: Implement API stats endpoint
      // const data = await adminAPI.getAPIStats();
      // setStats(data);
      
      // Placeholder
      setStats({
        total_requests: 0,
        requests_per_minute: 0,
        average_response_time: 0,
        error_rate: 0,
      });
    } catch (error: any) {
      showToast('Không thể tải thống kê API: ' + (error.message || 'Lỗi không xác định'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" text="Đang tải thống kê API..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-neutral-900">Thống kê API</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Tổng Requests</p>
              <p className="text-3xl font-bold text-neutral-900">{stats?.total_requests || 0}</p>
            </div>
            <Activity className="text-primary-600" size={32} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Requests/phút</p>
              <p className="text-3xl font-bold text-neutral-900">{stats?.requests_per_minute || 0}</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Response Time</p>
              <p className="text-3xl font-bold text-neutral-900">{stats?.average_response_time || 0}ms</p>
            </div>
            <Clock className="text-blue-600" size={32} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Error Rate</p>
              <p className="text-3xl font-bold text-neutral-900">{stats?.error_rate || 0}%</p>
            </div>
            <AlertCircle className="text-red-600" size={32} />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <p className="text-neutral-600 text-center">
          Tính năng đang phát triển. Sẽ có thống kê chi tiết về API usage.
        </p>
      </Card>
    </div>
  );
};

export default APIStats;

