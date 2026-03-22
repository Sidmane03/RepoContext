import { useState } from 'react';
import type { AppState, Profile, View } from './type';
import HomeView from './views/HomeView';
import ConfigureView from './views/ConfigureView';
import PreviewView from './views/PreviewVIew';

const initialProfile: Profile = {
  projectName: '',
  sourceType: 'github',
  repoUrl: '',
  includePatterns: [],
  excludePatterns: ['node_modules', '.git', 'dist', '*.lock', '*.log'],
  outputFilename: '',
  version: ''
};

const initialState: AppState = {
  view: 'home',
  profile: initialProfile,
  generatedMd: '',
  fileCount: 0,
  isLoading: false,
  loadingMessage: '',
  error: null
};

export default function App() {
  const [state, setState] = useState<AppState>(initialState);

  const setView = (view: View) => setState(prev => ({ ...prev, view }));
  const setProfile = (profile: Profile) => setState(prev => ({ ...prev, profile }));
  const setGeneratedData = (generatedMd: string, fileCount: number) => 
    setState(prev => ({ ...prev, generatedMd, fileCount, view: 'preview' }));
  const setLoading = (isLoading: boolean, loadingMessage = '') => 
    setState(prev => ({ ...prev, isLoading, loadingMessage }));
  const setError = (error: string | null) => 
    setState(prev => ({ ...prev, error }));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', color: '#111', fontFamily: 'system-ui, sans-serif' }}>
      {state.view === 'home' && (
        <HomeView 
          state={state} 
          setView={setView} 
          setProfile={setProfile} 
        />
      )}
      {state.view === 'configure' && (
        <ConfigureView 
          state={state} 
          setProfile={setProfile}
          setView={setView}
          setLoading={setLoading}
          setError={setError}
          setGeneratedData={setGeneratedData}
        />
      )}
      {state.view === 'preview' && (
        <PreviewView 
          state={state} 
          setView={setView} 
        />
      )}
    </div>
  );
}
