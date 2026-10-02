// Base del api-gateway (gems-lms-api). Se puede sobreescribir en tiempo de ejecución
// definiendo globalThis.API_BASE_URL antes de arrancar la app.
const API_BASE_URL = (globalThis as any).API_BASE_URL || 'http://localhost:8080/api/v1';

export const environment = {
  production: true,
  apiBaseUrl: API_BASE_URL,
  apiUrls: {
    auth: {
      login: `${API_BASE_URL}/auth/login`,
      register: `${API_BASE_URL}/auth/register`,
    },
    users: `${API_BASE_URL}/users`,
    admin: {
      institutions: `${API_BASE_URL}/institutions`,
      branding: `${API_BASE_URL}/branding`,
    },
    education: {
      courses: `${API_BASE_URL}/courses`,
      students: `${API_BASE_URL}/students`,
      enrollments: `${API_BASE_URL}/enrollments`,
      learningPaths: `${API_BASE_URL}/learning-paths`,
      quizzes: `${API_BASE_URL}/quizzes`,
      submissions: `${API_BASE_URL}/submissions`,
      activity: `${API_BASE_URL}/activity/me`,
      groups: `${API_BASE_URL}/groups`,
    },
  }
};
