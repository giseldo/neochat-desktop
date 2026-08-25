import React, { createContext, useState, useContext, useCallback, useEffect, useMemo } from 'react';

export const ProjectContext = createContext();

const PROJECTS_STORAGE_KEY = 'neochat_projects_fallback';

function getLocalStorageProjects() {
  try {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalStorageProjects(list) {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving projects to localStorage:', e);
  }
}

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState(getLocalStorageProjects);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Modal states for creating/editing projects
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState('create'); // 'create' | 'edit'
  const [editingProject, setEditingProject] = useState(null);

  // Modal state for moving chat to project
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [chatToMove, setChatToMove] = useState(null);

  // Modal state for Knowledge Base / RAG
  const [isKnowledgeBaseModalOpen, setIsKnowledgeBaseModalOpen] = useState(false);

  // Load all projects from backend (or fallback to localStorage)
  const loadProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true);
      if (window.electron?.projects?.list) {
        const list = await window.electron.projects.list();
        if (Array.isArray(list) && list.length > 0) {
          setProjects(list);
          saveLocalStorageProjects(list);
          return;
        }
      }
      const local = getLocalStorageProjects();
      setProjects(local || []);
    } catch (error) {
      console.error('[ProjectContext] Error loading projects:', error);
      const local = getLocalStorageProjects();
      setProjects(local || []);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Active project object
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // Create a new project
  const createProject = useCallback(async (projectData) => {
    try {
      let created = null;
      if (window.electron?.projects?.create) {
        try {
          created = await window.electron.projects.create(projectData);
        } catch (ipcErr) {
          console.warn('[ProjectContext] Electron IPC create failed, using local fallback:', ipcErr);
        }
      }
      
      if (!created || !created.id) {
        created = {
          id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: (projectData.name || '').trim(),
          description: (projectData.description || '').trim(),
          color: projectData.color || '#f55036',
          icon: projectData.icon || '📁',
          customPrompt: (projectData.customPrompt || '').trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      setProjects(prev => {
        const updated = [created, ...prev.filter(p => p.id !== created.id)];
        saveLocalStorageProjects(updated);
        return updated;
      });

      // Set as active project
      setActiveProjectId(created.id);
      return created;
    } catch (error) {
      console.error('[ProjectContext] Error creating project:', error);
      const created = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: (projectData.name || '').trim(),
        description: (projectData.description || '').trim(),
        color: projectData.color || '#f55036',
        icon: projectData.icon || '📁',
        customPrompt: (projectData.customPrompt || '').trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProjects(prev => {
        const updated = [created, ...prev];
        saveLocalStorageProjects(updated);
        return updated;
      });
      setActiveProjectId(created.id);
      return created;
    }
  }, []);

  // Update an existing project
  const updateProject = useCallback(async (id, updates) => {
    try {
      let updated = null;
      if (window.electron?.projects?.update) {
        try {
          updated = await window.electron.projects.update(id, updates);
        } catch (ipcErr) {
          console.warn('[ProjectContext] Electron IPC update failed, using local fallback:', ipcErr);
        }
      }

      setProjects(prev => {
        const next = prev.map(p => {
          if (p.id === id) {
            return updated || {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString()
            };
          }
          return p;
        });
        saveLocalStorageProjects(next);
        return next;
      });
      return updated || { id, ...updates };
    } catch (error) {
      console.error('[ProjectContext] Error updating project:', error);
      setProjects(prev => {
        const next = prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p);
        saveLocalStorageProjects(next);
        return next;
      });
      return { id, ...updates };
    }
  }, []);

  // Delete a project
  const deleteProject = useCallback(async (id) => {
    try {
      if (window.electron?.projects?.delete) {
        await window.electron.projects.delete(id);
      }
    } catch (error) {
      console.error('[ProjectContext] Error deleting project via IPC:', error);
    }

    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      saveLocalStorageProjects(next);
      return next;
    });
    return true;
  }, [activeProjectId]);

  // Modal helpers
  const openCreateProjectModal = useCallback(() => {
    setEditingProject(null);
    setProjectModalMode('create');
    setIsProjectModalOpen(true);
  }, []);

  const openEditProjectModal = useCallback((project) => {
    setEditingProject(project);
    setProjectModalMode('edit');
    setIsProjectModalOpen(true);
  }, []);

  const openMoveModal = useCallback((chat) => {
    setChatToMove(chat);
    setIsMoveModalOpen(true);
  }, []);

  const closeMoveModal = useCallback(() => {
    setIsMoveModalOpen(false);
    setChatToMove(null);
  }, []);

  const openKnowledgeBaseModal = useCallback(() => {
    setIsKnowledgeBaseModalOpen(true);
  }, []);

  const closeKnowledgeBaseModal = useCallback(() => {
    setIsKnowledgeBaseModalOpen(false);
  }, []);

  const value = {
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    isLoadingProjects,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    // Modal states
    isProjectModalOpen,
    setIsProjectModalOpen,
    projectModalMode,
    editingProject,
    openCreateProjectModal,
    openEditProjectModal,
    // Move chat modal states
    isMoveModalOpen,
    setIsMoveModalOpen,
    chatToMove,
    openMoveModal,
    closeMoveModal,
    // Knowledge Base / RAG modal states
    isKnowledgeBaseModalOpen,
    setIsKnowledgeBaseModalOpen,
    openKnowledgeBaseModal,
    closeKnowledgeBaseModal,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
