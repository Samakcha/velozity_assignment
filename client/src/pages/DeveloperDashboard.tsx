import React, { useEffect, useState } from 'react';
import { FiCode, FiFileText, FiSettings, FiSearch, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TaskList } from '../components/tasks/TaskList';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { apiTasks, Task, TaskFilters as TaskFilterType, TaskStatus } from '../services/api';
import { connectSocket } from '../socket/socket';

export const DeveloperDashboard: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilterType>({});

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevTasks = async (activeFilters: TaskFilterType = {}) => {
    try {
      setLoading(true);
      const taskData = await apiTasks.listAll(activeFilters);
      setTasks(taskData);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load assigned tasks');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevTasks(filters);
  }, [filters]);

  // Real-time task update listener for Developer Workspace
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleTaskActivity = () => {
      apiTasks
        .listAll(filters)
        .then((data) => setTasks(data))
        .catch((err) => console.error('Failed to update live dev tasks:', err));
    };

    socket.on('activity_event', handleTaskActivity);
    socket.on('notification:new', handleTaskActivity);

    return () => {
      socket.off('activity_event', handleTaskActivity);
      socket.off('notification:new', handleTaskActivity);
    };
  }, [accessToken, filters]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await apiTasks.update(taskId, { status: newStatus });
    await loadDevTasks(filters);
  };

  if (loading) {
    return <div className="page-loading">Loading Developer Workspace...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  const devAssignedTasks = user?.id
    ? tasks.filter((t) => !t.assignedToId || t.assignedToId === user.id || t.assignedTo?.id === user.id)
    : tasks;

  const todoCount = devAssignedTasks.filter(
    (t) => t.status === 'TO_DO' || (t.status as string) === 'TODO'
  ).length;
  const inProgressCount = devAssignedTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReviewCount = devAssignedTasks.filter((t) => t.status === 'IN_REVIEW').length;
  const doneCount = devAssignedTasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FiCode style={{ color: '#10b981' }} /> Developer Task Portal</h1>
          <p className="page-subtitle">
            Welcome, {user?.name}. Manage your assigned task status updates and track progress.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="To Do" value={todoCount} icon={<FiFileText />} color="#6b7280" />
        <StatCard title="In Progress" value={inProgressCount} icon={<FiSettings />} color="#3b82f6" />
        <StatCard title="In Review" value={inReviewCount} icon={<FiSearch />} color="#8b5cf6" />
        <StatCard title="Completed (Done)" value={doneCount} icon={<FiCheckCircle />} color="#10b981" />
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="dashboard-section">
            <div className="section-header">
              <h2>My Assigned Tasks</h2>
            </div>

            <TaskFilters
              filters={filters}
              onChange={(f) => setFilters(f)}
              onClear={() => setFilters({})}
            />

            <TaskList
              tasks={tasks}
              onStatusChange={handleStatusChange}
              canManageTasks={false}
            />
          </section>
        </div>

        <aside className="dashboard-sidebar">
          <ActivityFeed limit={15} />
        </aside>
      </div>
    </div>
  );
};
