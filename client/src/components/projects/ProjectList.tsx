import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../../services/api';

interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}) => {
  if (projects.length === 0) {
    return <div className="empty-state">No projects found.</div>;
  }

  return (
    <div className="project-grid">
      {projects.map((project) => (
        <div key={project.id} className="project-card">
          <div className="project-card-header">
            <Link to={`/projects/${project.id}`} className="project-title-link">
              <h3>{project.name}</h3>
            </Link>
          </div>

          <p className="project-desc">{project.description || 'No description provided.'}</p>

          <div className="project-card-footer">
            <div className="project-meta">
              {project.client?.name && (
                <span className="client-name">🏢 {project.client.name}</span>
              )}
              {project._count?.tasks !== undefined && (
                <span className="task-count">📋 {project._count.tasks} Tasks</span>
              )}
            </div>

            <div className="project-actions" style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to={`/projects/${project.id}`} className="btn-secondary btn-sm">
                Open Project
              </Link>
              {canEdit && onEdit && (
                <button className="btn-secondary btn-sm" onClick={() => onEdit(project)}>
                  Edit
                </button>
              )}
              {canDelete && onDelete && (
                <button className="btn-danger btn-sm" onClick={() => onDelete(project)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
