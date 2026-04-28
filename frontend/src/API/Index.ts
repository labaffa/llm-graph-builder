import axios from 'axios';
import { url } from '../utils/Utils';
import { UserCredentials } from '../types';

const api = axios.create({
  baseURL: url(),
  data: {},
});

const EXPLORER_MODE = (import.meta.env.VITE_EXPLORER_MODE ?? 'false') === 'true';
const EXPLORER_MODE_WRITE_BLOCKED_ENDPOINTS = new Set([
  '/url/scan',
  '/extract',
  '/post_processing',
  '/upload',
  '/delete_document_and_entities',
  '/cancelled_job',
  '/populate_graph_schema',
  '/delete_unconnected_nodes',
  '/merge_duplicate_nodes',
  '/drop_create_vector_index',
  '/retry_processing',
  '/change_embedding_model',
]);

const normalizePath = (requestUrl?: string): string => {
  if (!requestUrl) return '';
  if (requestUrl.startsWith('http://') || requestUrl.startsWith('https://')) {
    try {
      return new URL(requestUrl).pathname;
    } catch {
      return requestUrl;
    }
  }
  return requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`;
};

// Store credentials globally for the interceptor
let globalCredentials: UserCredentials | null = null;

export const createDefaultFormData = (userCredentials: UserCredentials) => {
  // Store credentials for interceptor use
  globalCredentials = { ...userCredentials };

  // Clear existing interceptors to avoid duplicates
  api.interceptors.request.clear();

  // Add interceptor to automatically inject credentials into all requests
  api.interceptors.request.use(
    (config) => {
      if (EXPLORER_MODE && EXPLORER_MODE_WRITE_BLOCKED_ENDPOINTS.has(normalizePath(config.url))) {
        return Promise.reject(
          new Error(
            `Explorer mode is enabled. Write operation '${normalizePath(
              config.url
            )}' is blocked. Disable VITE_EXPLORER_MODE to re-enable write features.`
          )
        );
      }

      if (globalCredentials && config.data instanceof FormData) {
        // Add credentials to FormData if not already present
        if (globalCredentials.uri && !config.data.has('uri')) {
          config.data.append('uri', globalCredentials.uri);
        }
        if (globalCredentials.database && !config.data.has('database')) {
          config.data.append('database', globalCredentials.database);
        }
        if (globalCredentials.userName && !config.data.has('userName')) {
          config.data.append('userName', globalCredentials.userName);
        }
        if (globalCredentials.password && !config.data.has('password')) {
          config.data.append('password', globalCredentials.password);
        }
        if (globalCredentials.email && !config.data.has('email')) {
          config.data.append('email', globalCredentials.email);
        }
      } else if (globalCredentials && !(config.data instanceof FormData)) {
        // Convert plain object to FormData and add credentials
        const formData = new FormData();

        // Add credentials first
        if (globalCredentials.uri) {
          formData.append('uri', globalCredentials.uri);
        }
        if (globalCredentials.database) {
          formData.append('database', globalCredentials.database);
        }
        if (globalCredentials.userName) {
          formData.append('userName', globalCredentials.userName);
        }
        if (globalCredentials.password) {
          formData.append('password', globalCredentials.password);
        }
        if (globalCredentials.email) {
          formData.append('email', globalCredentials.email);
        }

        // Add other data fields
        for (const [key, value] of Object.entries(config.data || {})) {
          formData.append(key, value as any);
        }

        config.data = formData;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Return a FormData with credentials for direct use if needed
  return createCredentialsFormData(userCredentials);
};

export const createCredentialsFormData = (userCredentials: UserCredentials): FormData => {
  const formData = new FormData();
  if (userCredentials?.uri) {
    formData.append('uri', userCredentials.uri);
  }
  if (userCredentials?.database) {
    formData.append('database', userCredentials.database);
  }
  if (userCredentials?.userName) {
    formData.append('userName', userCredentials.userName);
  }
  if (userCredentials?.password) {
    formData.append('password', userCredentials.password);
  }
  if (userCredentials?.email) {
    formData.append('email', userCredentials.email);
  }
  return formData;
};

export default api;
