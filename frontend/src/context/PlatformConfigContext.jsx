import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { getApiData } from '../utils/apiResponse';

const PlatformConfigContext = createContext({ support_email: 'support@careerhub.io', maintenance_enabled: false });

export function PlatformConfigProvider({ children }) {
  const [config, setConfig] = useState({ support_email: 'support@careerhub.io', maintenance_enabled: false });
  useEffect(() => {
    let active = true;
    const load = () => api.get('/platform-config').then((response) => { if (active) setConfig(getApiData(response)); }).catch(() => {});
    load();
    window.addEventListener('careerhub:platform-config-updated', load);
    return () => { active = false; window.removeEventListener('careerhub:platform-config-updated', load); };
  }, []);
  return <PlatformConfigContext.Provider value={config}>{children}</PlatformConfigContext.Provider>;
}

export function usePlatformConfig() { return useContext(PlatformConfigContext); }
