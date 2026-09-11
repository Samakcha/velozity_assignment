import React, { useEffect, useState } from 'react';
import { FiFolder, FiPlus } from 'react-icons/fi';
import { useAuth } from '../auth/AuthContext';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectForm } from '../components/projects/ProjectForm';
import { apiProjects, Project } from '../services/api';

export const Projects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isDev = user?.role === 'DEVELOPER';

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await apiProjects.list();
      setProjects(data);
      setLoading(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load projects');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSaveProject = async (data: {
    name: string;
    description?: string;
    clientId: string;
  }) => {
    if (editingProject) {
      await apiProjects.update(editingProject.id, data);
    } else {
      await apiProjects.create(data);
    }
    await loadProjects();
    setShowModal(false);
    setEditingProject(null);
  };

  const handleDeleteProject = async (project: Project) => {
    if (
      window.confirm(
        'Are you sure you want to delete this project? This action cannot be undone.'
      )
    ) {
      try {
        await apiProjects.delete(project.id);
        await loadProjects();
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to delete project');
      }
    }
  };

  if (loading) {
    return <div className="page-loading">Loading Projects...</div>;
  }

  if (error) {
    return <div className="page-error">{error}</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><FiFolder style={{ color: '#3b82f6' }} /> Projects Directory</h1>
          <p className="page-subtitle">View and manage client projects and overall status.</p>
        </div>
        {!isDev && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> Create Project
          </button>
        )}
      </div>

      <ProjectList
        projects={projects}
        canEdit={!isDev}
        canDelete={!isDev}
        onEdit={(proj) => {
          setEditingProject(proj);
          setShowModal(true);
        }}
        onDelete={handleDeleteProject}
      />

      {showModal && (
        <ProjectForm
          initialProject={editingProject}
          onSave={handleSaveProject}
          onClose={() => {
            setShowModal(false);
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
};
