import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { formatTimeAgo } from '../utils/formatters';

const TYPE_ICONS = {
  timesheet_approved: { icon: CheckCircle, color: 'text-success bg-green-50' },
  timesheet_rejected: { icon: XCircle, color: 'text-error bg-red-50' },
  timesheet_submitted: { icon: Info, color: 'text-info bg-blue-50' },
  timesheet_reminder: { icon: AlertTriangle, color: 'text-warning bg-amber-50' },
  leave_approved: { icon: CheckCircle, color: 'text-success bg-green-50' },
  leave_rejected: { icon: XCircle, color: 'text-error bg-red-50' },
  leave_applied: { icon: Info, color: 'text-info bg-blue-50' },
  approval_pending: { icon: AlertTriangle, color: 'text-warning bg-amber-50' },
  system_alert: { icon: Info, color: 'text-primary bg-primary-50' },
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

const NotificationList = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotificationStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('all');

  const handleMarkAll = async () => {
    await markAllAsRead(user?.id);
    toast.success('All notifications marked as read');
  };

  const filteredNotifications = notifications.filter(n =>
    filter === 'unread' ? !n.is_read : true
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
          <p className="text-xs text-text-secondary mt-0.5">{unreadCount} unread</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {['all', 'unread'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize
                  ${filter === f ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                {f}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="secondary" icon={CheckCheck} onClick={handleMarkAll}>
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <Card padding={false}>
        {filteredNotifications.length === 0 ? (
          <EmptyState icon={Bell} message="No notifications" description="You're all caught up!" />
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map(n => {
              const typeConfig = TYPE_ICONS[n.type] || { icon: Info, color: 'text-primary bg-primary-50' };
              const Icon = typeConfig.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50/70 transition-colors
                    ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm text-text-primary ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {n.priority && n.priority !== 'normal' && (
                          <Badge className={PRIORITY_COLORS[n.priority]}>{n.priority}</Badge>
                        )}
                        {!n.is_read && <span className="w-2 h-2 bg-info rounded-full flex-shrink-0" />}
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-text-secondary mt-1.5">{formatTimeAgo(n.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationList;
