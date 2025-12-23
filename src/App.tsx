import React, { useState } from 'react';
import { AuthPage } from './components/AuthPage';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { LandingPage } from './components/landing/LandingPage';
import { HomeDashboard, Workspace } from './components/home/HomeDashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  // 1. Landing Page Flow
  if (showLanding) {
      return (
          <LandingPage 
            onStart={() => setShowLanding(false)} 
            onLogin={() => setShowLanding(false)}
          />
      );
  }

  // 2. Auth Flow
  if (!isAuthenticated) {
      return (
        <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
          <AuthPage onLogin={() => setIsAuthenticated(true)} />
        </div>
      );
  }

  // 3. Workspace View (If a workspace is selected)
  if (activeWorkspace) {
    return (
      <div className="min-h-screen font-sans text-slate-900 bg-slate-50">
         <WorkspaceLayout 
            workspaceName={activeWorkspace.name}
            onLogout={() => {
                // "Logout" from workspace goes back to Home Dashboard
                setActiveWorkspace(null);
            }} 
         />
      </div>
    );
  }

  // 4. Home Dashboard (Default Authenticated View)
  return (
      <HomeDashboard 
        onLogout={() => {
            setIsAuthenticated(false);
            setShowLanding(true);
        }}
        onEnterWorkspace={(ws) => setActiveWorkspace(ws)}
      />
  );
}
