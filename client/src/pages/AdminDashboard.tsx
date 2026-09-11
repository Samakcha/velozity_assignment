import React, { useEffect, useState } from 'react';
import { FiShield, FiBriefcase, FiFolder, FiCheckSquare, FiSearch, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { StatCard } from '../components/dashboard/StatCard';
import { ActiveUsers } from '../components/dashboard/ActiveUsers';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { ProjectList } from '../components/projects/ProjectList';
import { TaskList } from '../components/tasks/TaskList';
import { apiProjects, apiTasks, apiClients, Project, Task, TaskStatus } from '../services/api';
import { connectSocket } from '../socket/socket';

export const AdminDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const [clientCount, setClientCount] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [clientsData, projectsData, tasksData] = await Promise.all([
        apiClients.list(),
        apiProjects.list(),
        apiTasks.listAll(),
      ]);

      setClientCount(clientsData.length);
      setProjects(projectsData);
      setTasks(tasksData);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load admin dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Real-time task/activity update listener for Admin Overview
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleTaskActivity = () => {
      loadAdminData();
    };

    socket.on('activity_event', handleTaskActivity);

    return () => {
      socket.off('activity_event', handleTaskActivity);
    };
  }, [accessToken]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await apiTasks.update(taskId, { status: newStatus });
    // Re-fetch tasks after update
    const updatedTasks = await apiTasks.listAll();
    setTasks(updatedTasks);
  };

  const handleDeleteProject = async (project: Project) => {
    if (
      window.confirm(
        'Are you sure you want to delete this project? This will also delete its associated tasks and activity logs.'
      )
    ) {
      try {
        await apiProjects.delete(project.id);
        await loadAdminData();
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to delete project');
      }
    }
  };

  if (loading) {
    return <div className="page-loading">Loading Admin Dashboard...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  const totalProjectsCount = projects.length;
  const inReviewTasksCount = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const overdueTasksCount = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
  ).length;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FiShield style={{ color: '#ef4444' }} /> Admin System Overview</h1>
          <p className="page-subtitle">
            Global view across all clients, projects, tasks, and real-time operations.
          </p>
        </div>
        <ActiveUsers />
      </div>

      <div className="stats-grid">
        <StatCard title="Total Clients" value={clientCount} icon={<FiBriefcase />} color="#8b5cf6" />
        <StatCard title="Total Projects" value={totalProjectsCount} icon={<FiFolder />} color="#3b82f6" />
        <StatCard title="Total Tasks" value={tasks.length} icon={<FiCheckSquare />} color="#10b981" />
        <StatCard title="In Review" value={inReviewTasksCount} icon={<FiSearch />} color="#f59e0b" />
        <StatCard title="Overdue Tasks" value={overdueTasksCount} icon={<FiAlertTriangle />} color="#ef4444" />
      </div>

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Recent Projects</h2>
            </div>
            <ProjectList
              projects={projects.slice(0, 6)}
              canDelete={true}
              onDelete={handleDeleteProject}
            />
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>System Tasks Overview</h2>
            </div>
            <TaskList tasks={tasks.slice(0, 8)} onStatusChange={handleStatusChange} canManageTasks={true} />
          </section>
        </div>

        <aside className="dashboard-sidebar">
          <ActivityFeed limit={15} />
        </aside>
      </div>
    </div>
  );
};
