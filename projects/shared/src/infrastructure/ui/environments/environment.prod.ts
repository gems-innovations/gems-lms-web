const API_BASE_URL = (globalThis as any).API_BASE_URL || 'http://localhost:8080/api';

export const environment = {
  production: true,
  apiBaseUrl: API_BASE_URL,
  apiUrls: {
    auth: {
      login: `${API_BASE_URL}/auth/login`,
    },
    admin: {
      institutions: `${API_BASE_URL}/admin/institutions`,
    },
  }
};
