const API_BASE_URL = ''; // Relative path leverages Vite proxy (/api -> http://127.0.0.1:8080)

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...customOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem('uconnect_token');

  const headers = new Headers(customHeaders);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(customOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...customOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    let errorData = null;
    try {
      const json = await response.json();
      errorData = json;
      if (json.error) {
        errorMessage = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      } else if (json.message) {
        errorMessage = json.message;
      }
    } catch {
      // response wasn't JSON
    }
    throw new ApiError(response.status, errorMessage, errorData);
  }

  // Handle empty responses or blob
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function downloadBlob(endpoint: string, params?: Record<string, any>): Promise<Blob> {
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem('uconnect_token');
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Failed to download file: ${response.statusText}`);
  }

  return response.blob();
}
