// central place for the backend URL so it only needs changing in one spot
// VITE_BACKEND_URL is set in Railway's environment variables for production
// falls back to localhost for local development

export const API = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";
