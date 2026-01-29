import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'loading' | 'not_installed';
}

interface Site {
  name: string;
  path: string;
  url: string;
  secured: boolean;
  php_version: string;
}

interface AppState {
  services: Service[];
  sites: Site[];
  activeVersions: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

type AppAction =
  | { type: 'LOADING_START' }
  | { type: 'LOADING_SUCCESS' }
  | { type: 'LOADING_ERROR'; payload: string }
  | {
    type: 'INITIAL_LOAD';
    payload: { services: Service[]; sites: Site[]; versions: Record<string, string> };
  }
  | { type: 'UPDATE_SERVICES'; payload: Service[] }
  | { type: 'UPDATE_SITES'; payload: Site[] }
  | { type: 'UPDATE_VERSIONS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERROR' };

const initialState: AppState = {
  services: [],
  sites: [],
  activeVersions: {},
  isLoading: false,
  error: null,
  lastUpdated: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null };
    case 'LOADING_SUCCESS':
      return { ...state, isLoading: false, lastUpdated: new Date() };
    case 'LOADING_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'INITIAL_LOAD':
      return {
        ...state,
        services: action.payload.services,
        sites: action.payload.sites,
        activeVersions: action.payload.versions,
        isLoading: false,
        lastUpdated: new Date(),
      };
    case 'UPDATE_SERVICES':
      return { ...state, services: action.payload };
    case 'UPDATE_SITES':
      return { ...state, sites: action.payload };
    case 'UPDATE_VERSIONS':
      return { ...state, activeVersions: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => null,
  refreshData: async () => { },
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const refreshData = async () => {
    dispatch({ type: 'LOADING_START' });
    try {
      const [services, sites, versions] = await Promise.all([
        invoke<Service[]>('get_all_services'),
        invoke<Site[]>('scan_sites'),
        invoke<Record<string, string>>('get_active_versions'),
      ]);

      dispatch({
        type: 'INITIAL_LOAD',
        payload: { services, sites, versions },
      });
    } catch (error) {
      dispatch({
        type: 'LOADING_ERROR',
        payload: error instanceof Error ? error.message : String(error),
      });
      toast.error(`Failed to load data: ${error}`);
    }
  };

  // Load initial data
  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, refreshData }}>{children}</AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
