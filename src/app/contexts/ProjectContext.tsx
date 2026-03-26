import React, { createContext, useContext, useEffect, useState } from "react";

/* ===== PROJECT TYPE ===== */

export interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  spent: number;
  progress: number;
  status: "planning" | "in-progress" | "completed" | "on-hold";
  clientId: string;
  teamMembers: string[];
  milestones: any[];
  startDate: string;
  endDate: string | null;
}

/* ===== CONTEXT TYPE ===== */

interface ProjectContextType {
  projects: Project[];
  addProject: (p: Project) => void;
}

/* ===== CONTEXT ===== */

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

/* ===== PROVIDER ===== */

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("projects");
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("projects", JSON.stringify(projects));
  }, [projects]);

  const addProject = (p: Project) => {
    setProjects(prev => [...prev, p]);
  };

  return (
    <ProjectContext.Provider value={{ projects, addProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

/* ===== HOOK ===== */

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used inside ProjectProvider");
  return ctx;
};
