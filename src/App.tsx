import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CrmProvider, useCrm } from './context/CrmContext';
import { Navbar } from './components/Navbar';
import { ChatInbox } from './components/ChatInbox';
import { CrmPipeline } from './components/CrmPipeline';
import { AITrainingCenter } from './components/AITrainingCenter';
import { IntegrationsSettings } from './components/IntegrationsSettings';
import { AnalyticsView } from './components/AnalyticsView';
import { LoginScreen } from './components/LoginScreen';

function MainApp() {
  const { isAuthenticated } = useAuth();
  const { setActiveLeadId } = useCrm();
  const [activeTab, setActiveTab] = useState<'inbox' | 'pipeline' | 'training' | 'settings' | 'analytics'>('inbox');

  // If not authenticated, show full login & register screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleOpenChatForLead = (leadId: string) => {
    setActiveLeadId(leadId);
    setActiveTab('inbox');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans select-none">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'inbox' && <ChatInbox />}
        {activeTab === 'pipeline' && (
          <CrmPipeline
            onOpenChat={handleOpenChatForLead}
          />
        )}
        {activeTab === 'training' && <AITrainingCenter />}
        {activeTab === 'settings' && <IntegrationsSettings />}
        {activeTab === 'analytics' && <AnalyticsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CrmProvider>
        <MainApp />
      </CrmProvider>
    </AuthProvider>
  );
}

