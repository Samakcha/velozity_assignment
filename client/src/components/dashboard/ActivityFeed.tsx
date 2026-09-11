import React, { useEffect, useState } from 'react';
import { FiActivity } from 'react-icons/fi';
import { useAuth } from '../../auth/AuthContext';
import { apiActivity, ActivityItem } from '../../services/api';
import { connectSocket, SocketActivityEvent } from '../../socket/socket';

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ projectId, limit = 15 }) => {
  const { accessToken } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch from REST API
    apiActivity
      .list({ projectId, limit })
      .then((data) => {
        setActivities(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load activity feed');
        setLoading(false);
      });

    // Real-Time Socket Connection
    if (accessToken) {
      const socket = connectSocket(accessToken);

      const handleNewActivity = (event: SocketActivityEvent) => {
        // If feed is scoped to a specific project, ignore other projects
        if (projectId && event.projectId !== projectId) return;

        const newActivity: ActivityItem = {
          id: event.id,
          projectId: event.projectId,
          taskId: event.taskId,
          userId: event.user?.id || '',
          action: event.action,
          previousStatus: event.previousStatus as ActivityItem['previousStatus'],
          newStatus: event.newStatus as ActivityItem['newStatus'],
          createdAt: event.createdAt,
          user: event.user ? { id: event.user.id, name: event.user.name, email: '' } : undefined,
          task: event.task ? { id: event.task.id, title: event.task.title } : undefined,
          project: event.project ? { id: event.project.id, name: event.project.name } : undefined,
        };

        setActivities((prev) => [newActivity, ...prev.filter((a) => a.id !== newActivity.id).slice(0, limit - 1)]);
      };

      const handleMissedActivity = (data: { activities: SocketActivityEvent[] }) => {
        if (data && Array.isArray(data.activities)) {
          const formatted: ActivityItem[] = data.activities.map((event) => ({
            id: event.id,
            projectId: event.projectId,
            taskId: event.taskId,
            userId: event.user?.id || '',
            action: event.action,
            previousStatus: event.previousStatus as ActivityItem['previousStatus'],
            newStatus: event.newStatus as ActivityItem['newStatus'],
            createdAt: event.createdAt,
            user: event.user ? { id: event.user.id, name: event.user.name, email: '' } : undefined,
            task: event.task ? { id: event.task.id, title: event.task.title } : undefined,
            project: event.project ? { id: event.project.id, name: event.project.name } : undefined,
          }));

          setActivities((prev) => {
            if (prev.length === 0) return formatted.slice(0, limit);
            const map = new Map<string, ActivityItem>();
            [...prev, ...formatted].forEach((item) => map.set(item.id, item));
            return Array.from(map.values())
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, limit);
          });
        }
      };

      socket.on('activity_event', handleNewActivity);
      socket.on('activity:new', handleNewActivity);
      socket.on('missed_activity', handleMissedActivity);

      // Fetch missed/recent activity over socket
      socket.emit('get_missed_activity', { limit });

      return () => {
        socket.off('activity_event', handleNewActivity);
        socket.off('activity:new', handleNewActivity);
        socket.off('missed_activity', handleMissedActivity);
      };
    }
  }, [accessToken, projectId, limit]);

  const formatActivitySentence = (item: ActivityItem) => {
    const userName = item.user?.name || 'A user';
    const taskTitle = item.task?.title ? `'${item.task.title}'` : 'a task';
    const prev = item.previousStatus ? item.previousStatus.replace('_', ' ') : '';
    const next = item.newStatus ? item.newStatus.replace('_', ' ') : '';

    if (item.action === 'STATUS_CHANGED') {
      return `${userName} moved Task ${taskTitle} from ${prev} → ${next}`;
    }

    if (item.action === 'TASK_OVERDUE' || item.newStatus === 'TO_DO' && prev === '') {
      return `System flagged Task ${taskTitle} as OVERDUE`;
    }

    return `${userName} updated Task ${taskTitle}`;
  };

  const formatTimeAgo = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(elapsedMs / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return <div className="feed-loading">Loading real-time activity...</div>;
  }

  if (error) {
    return <div className="feed-error">{error}</div>;
  }

  return (
    <div className="activity-feed-container">
      <div className="feed-header">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiActivity style={{ color: '#6366f1' }} /> Real-Time Activity Feed</h3>
        <span className="badge-live">Live</span>
      </div>

      {activities.length === 0 ? (
        <div className="feed-empty">No activity logs recorded yet.</div>
      ) : (
        <ul className="activity-list">
          {activities.map((item) => (
            <li key={item.id} className="activity-item">
              <div className="activity-bullet"></div>
              <div className="activity-content">
                <div className="activity-sentence">{formatActivitySentence(item)}</div>
                <div className="activity-meta">
                  {item.project?.name && <span className="project-tag">{item.project.name}</span>}
                  <span className="activity-time">{formatTimeAgo(item.createdAt)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
