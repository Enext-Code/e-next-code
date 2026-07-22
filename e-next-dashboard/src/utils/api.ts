// import { ApiResponse } from '@/types/auth';
// import { AuthService } from '@/services/auth.service';

// class ApiError extends Error {
//   constructor(
//     message: string,
//     public status?: number,
//     public data?: any
//   ) {
//     super(message);
//     this.name = 'ApiError';
//   }
// }

// export async function fetchApi<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<ApiResponse<T>> {
//   const authService = AuthService.getInstance();
//   const accessToken = authService.getAccessToken();
// debugger
//     console.log("========== FETCH API ==========");
//   console.log("Endpoint:", endpoint);
//   console.log("Access Token:", accessToken);

//   const defaultHeaders: HeadersInit = {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json',
//     ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
//     ...options.headers,
//   };
//   console.log("Headers:", defaultHeaders);
//   const config: RequestInit = {
//     ...options,
//     headers: defaultHeaders,
//     credentials: 'include', // Always include credentials
//   };

//   try {
//     console.log("Sending Request...");

//     const response = await fetch(endpoint, config);
//      console.log("Response Status:", response.status);
//     console.log("Response URL:", response.url);
//     const data: ApiResponse<T> = await response.json();

//     // Check if we need to handle a redirect
//     if (response.redirected) {
//       window.location.href = response.url;
//       return data;
//     }

//     // Handle authentication errors
//     if (response.status === 401) {
//       const refreshToken = authService.getRefreshToken();
//       if (refreshToken && authService.shouldRefreshToken()) {
//         try {
//           await authService.refreshToken(refreshToken);
//           // Retry the original request with new token
//           return fetchApi(endpoint, options);
//         } catch (error) {
//           // If refresh fails, redirect to login
//           window.location.href = '/auth/login';
//           throw new ApiError('Authentication required', response.status, data);
//         }
//       } else {
//         window.location.href = '/auth/login';
//         throw new ApiError('Authentication required', response.status, data);
//       }
//     }

//     if (!response.ok) {
//       throw new ApiError(
//         data.message || 'An error occurred',
//         response.status,
//         data
//       );
//     }

//     return data;
//   } catch (error) {
//     if (error instanceof ApiError) {
//       throw error;
//     }
//     throw new ApiError(
//       error instanceof Error ? error.message : 'Network error occurred'
//     );
//   }
// } 

// // export async function fetchApi<T>(
// //   endpoint: string,
// //   options: RequestInit = {}
// // ): Promise<ApiResponse<T>> {
// //   const authService = AuthService.getInstance();
// //   const accessToken = authService.getAccessToken();

// //   const defaultHeaders: HeadersInit = {
// //     Accept: "application/json",
// //     "Content-Type": "application/json",
// //     ...(accessToken
// //       ? { Authorization: `Bearer ${accessToken}` }
// //       : {}),
// //     ...(options.headers || {}),
// //   };

// //   const config: RequestInit = {
// //     ...options,
// //     headers: defaultHeaders,
// //     credentials: "include",
// //   };

// //   console.log("========== FETCH API ==========");
// //   console.log("Endpoint:", endpoint);
// //   console.log("Access Token:", accessToken);
// //   console.log("Headers:", defaultHeaders);

// //   try {
// //     const response = await fetch(endpoint, config);

// //     console.log("Response Status:", response.status);
// //     console.log("Response URL:", response.url);
// //     console.log("Redirected:", response.redirected);

// //     // Read response body once
// //     const responseText = await response.text();

// //     console.log("========== RAW RESPONSE ==========");
// //     console.log(responseText);

// //     let data: any = {};

// //     if (responseText.trim()) {
// //       try {
// //         data = JSON.parse(responseText);
// //       } catch {
// //         // Keep raw text if response isn't JSON
// //         data = { message: responseText };
// //       }
// //     }

// //     console.log("========== PARSED RESPONSE ==========");
// //     console.log(data);

// //     /**
// //      * Handle browser redirects only when redirected
// //      * to a frontend route instead of another API endpoint.
// //      */
// //     if (response.redirected) {
// //       console.log("Redirect URL:", response.url);

// //       if (!new URL(response.url).pathname.startsWith("/api")) {
// //         window.location.href = response.url;
// //         return data as ApiResponse<T>;
// //       }
// //     }

// //     /**
// //      * Handle Unauthorized
// //      */
// //     if (response.status === 401) {
// //       const refreshToken = authService.getRefreshToken();

// //       if (
// //         refreshToken &&
// //         authService.shouldRefreshToken() &&
// //         !endpoint.includes("/refresh")
// //       ) {
// //         try {
// //           await authService.refreshToken(refreshToken);

// //           // Retry once
// //           return fetchApi<T>(endpoint, options);
// //         } catch (refreshError) {
// //           console.error("Token refresh failed:", refreshError);
// //         }
// //       }

// //       window.location.href = "/auth/login";

// //       throw new ApiError(
// //         data.message || "Authentication required",
// //         401,
// //         data
// //       );
// //     }

// //     /**
// //      * Handle API Errors
// //      */
// //     if (!response.ok) {
// //       throw new ApiError(
// //         data.message ||
// //           data.detail ||
// //           response.statusText ||
// //           "Request failed",
// //         response.status,
// //         data
// //       );
// //     }

// //     /**
// //      * Success
// //      */
// //     return data as ApiResponse<T>;
// //   } catch (error) {
// //     console.error("========== FETCH ERROR ==========");
// //     console.error(error);

// //     if (error instanceof ApiError) {
// //       throw error;
// //     }

// //     throw new ApiError(
// //       error instanceof Error ? error.message : "Network error occurred"
// //     );
// //   }
// // }

// export async function uploadApi<T>(
//   endpoint: string,
//   formData: FormData,
//   options: Omit<RequestInit, 'body'> = {}
// ): Promise<ApiResponse<T>> {
//   const authService = AuthService.getInstance();
//   const accessToken = authService.getAccessToken();

//   const defaultHeaders: HeadersInit = {
//     'Accept': 'application/json',
//     ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
//     ...options.headers,
//   };

//   const config: RequestInit = {
//     ...options,
//     method: 'POST',
//     headers: defaultHeaders,
//     credentials: 'include',
//     body: formData
//   };

//   try {
//     const response = await fetch(endpoint, config);
//     const data: ApiResponse<T> = await response.json();

//     // Check if we need to handle a redirect
//     if (response.redirected) {
//       window.location.href = response.url;
//       return data;
//     }

//     // Handle authentication errors
//     if (response.status === 401) {
//       const refreshToken = authService.getRefreshToken();
//       if (refreshToken && authService.shouldRefreshToken()) {
//         try {
//           await authService.refreshToken(refreshToken);
//           // Retry the original request with new token
//           return uploadApi(endpoint, formData, options);
//         } catch (error) {
//           // If refresh fails, redirect to login
//           window.location.href = '/auth/login';
//           throw new ApiError('Authentication required', response.status, data);
//         }
//       } else {
//         window.location.href = '/auth/login';
//         throw new ApiError('Authentication required', response.status, data);
//       }
//     }

//     if (!response.ok) {
//       throw new ApiError(
//         data.message || 'An error occurred',
//         response.status,
//         data
//       );
//     }

//     return data;
//   } catch (error) {
//     if (error instanceof ApiError) {
//       throw error;
//     }
//     throw new ApiError(
//       error instanceof Error ? error.message : 'Network error occurred'
//     );
//   }
// }

// export async function downloadApi(
//   endpoint: string,
//   filename: string,
//   options: Omit<RequestInit, 'body'> = {}
// ): Promise<void> {
//   const authService = AuthService.getInstance();
//   const accessToken = authService.getAccessToken();

//   const defaultHeaders: HeadersInit = {
//     ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
//     ...options.headers,
//   };

//   const config: RequestInit = {
//     ...options,
//     method: 'GET',
//     headers: defaultHeaders,
//     credentials: 'include',
//   };

//   try {
//     const response = await fetch(endpoint, config);

//     // Handle authentication errors
//     if (response.status === 401) {
//       const refreshToken = authService.getRefreshToken();
//       if (refreshToken && authService.shouldRefreshToken()) {
//         try {
//           await authService.refreshToken(refreshToken);
//           // Retry the original request with new token
//           return downloadApi(endpoint, filename, options);
//         } catch {
//           window.location.href = '/auth/login';
//           throw new Error('Authentication required');
//         }
//       } else {
//         window.location.href = '/auth/login';
//         throw new Error('Authentication required');
//       }
//     }

//     if (!response.ok) {
//       throw new Error('Failed to download file');
//     }

//     const blob = await response.blob();
//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     window.URL.revokeObjectURL(url);
//   } catch (error) {
//     throw new Error(
//       error instanceof Error ? error.message : 'Download failed'
//     );
//   }
// }

// export async function deleteApi<T>(
//   endpoint: string,
//   options: Omit<RequestInit, 'body' | 'method'> = {}
// ): Promise<ApiResponse<T>> {
//   const authService = AuthService.getInstance();
//   const accessToken = authService.getAccessToken();

//   const defaultHeaders: HeadersInit = {
//     'Accept': '*/*',
//     ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
//     ...options.headers,
//   };

//   const config: RequestInit = {
//     ...options,
//     method: 'DELETE',
//     headers: defaultHeaders,
//     credentials: 'include'
//   };

//   try {
//     const response = await fetch(endpoint, config);

//     // Check if we need to handle a redirect
//     if (response.redirected) {
//       window.location.href = response.url;
//       return { success: true, data: null as T, message: 'Success', error: null };
//     }

//     // Handle authentication errors
//     if (response.status === 401) {
//       const refreshToken = authService.getRefreshToken();
//       if (refreshToken && authService.shouldRefreshToken()) {
//         try {
//           await authService.refreshToken(refreshToken);
//           // Retry the original request with new token
//           return deleteApi(endpoint, options);
//         } catch (error) {
//           // If refresh fails, redirect to login
//           window.location.href = '/auth/login';
//           throw new ApiError('Authentication required', response.status);
//         }
//       } else {
//         window.location.href = '/auth/login';
//         throw new ApiError('Authentication required', response.status);
//       }
//     }

//     // Handle 204 No Content (successful delete)
//     if (response.status === 204) {
//       return { success: true, data: null as T, message: 'Successfully deleted', error: null };
//     }

//     if (!response.ok) {
//       // Try to parse error response, but handle cases where there's no JSON
//       let errorData;
//       try {
//         errorData = await response.json();
//       } catch {
//         errorData = { message: 'An error occurred' };
//       }
//       throw new ApiError(
//         errorData.message || 'An error occurred',
//         response.status,
//         errorData
//       );
//     }

//     // Parse JSON response for other successful status codes
//     const data: ApiResponse<T> = await response.json();
//     return data;
//   } catch (error) {
//     if (error instanceof ApiError) {
//       throw error;
//     }
//     throw new ApiError(
//       error instanceof Error ? error.message : 'Network error occurred'
//     );
//   }
// } 

import { ApiResponse } from '@/types/auth';
import { AuthService } from '@/services/auth.service';

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Convert backend/Next redirect Location to same-origin /api path */
function toSameOriginApiUrl(location: string | null): string | null {
  if (!location) return null;
  try {
    if (location.startsWith('/')) return location;
    const url = new URL(location, window.location.origin);
    // Always stay on frontend origin so Authorization header is kept
    return `${url.pathname}${url.search}`;
  } catch {
    const stripped = location.replace(/^https?:\/\/[^/]+/, '');
    return stripped.startsWith('/') ? stripped : null;
  }
}

function stripTrailingSlashBeforeQuery(endpoint: string): string {
  return endpoint.replace(/\/\?/, '?').replace(/\/$/, '');
}

function addTrailingSlashBeforeQuery(endpoint: string): string {
  if (endpoint.includes('/?') || endpoint.endsWith('/')) return endpoint;
  if (endpoint.includes('?')) return endpoint.replace('?', '/?');
  return `${endpoint}/`;
}

function isRedirectResponse(response: Response): boolean {
  return (
    response.type === 'opaqueredirect' ||
    response.status === 301 ||
    response.status === 302 ||
    response.status === 303 ||
    response.status === 307 ||
    response.status === 308
  );
}

function getErrorMessage(data: any, status: number): string {
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (typeof data?.detail === 'string' && data.detail) return data.detail;
  if (typeof data?.detail?.message === 'string') return data.detail.message;
  if (status === 0 || status === 301 || status === 302 || status === 307 || status === 308) {
    return `Redirect handling failed (${status}). Check API URL trailing slash.`;
  }
  return `Request failed (${status})`;
}

async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function handleRedirect(
  response: Response,
  endpoint: string,
  config: RequestInit
): Promise<Response> {
  if (!isRedirectResponse(response)) return response;

  const candidates = [
    toSameOriginApiUrl(response.headers.get('Location')),
    // OPD/list routes often need the trailing slash; try add before strip
    addTrailingSlashBeforeQuery(endpoint),
    stripTrailingSlashBeforeQuery(endpoint),
  ].filter((url): url is string => !!url && url !== endpoint);

  const tried = new Set<string>();
  let last = response;

  for (const url of candidates) {
    if (tried.has(url)) continue;
    tried.add(url);
    last = await fetch(url, config);
    if (!isRedirectResponse(last)) return last;
  }

  return last;
}

async function handleUnauthorized(
  endpoint: string,
  retryFn: () => Promise<any>
): Promise<never | any> {
  const authService = AuthService.getInstance();
  const refreshToken = authService.getRefreshToken();

  if (refreshToken && !endpoint.includes('/refresh-token')) {
    try {
      await authService.refreshToken(refreshToken);
      return retryFn();
    } catch {
      window.location.href = '/auth/login';
    }
  } else {
    window.location.href = '/auth/login';
  }
  throw new ApiError('Authentication required', 401);
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authService = AuthService.getInstance();
  const accessToken = authService.getAccessToken();

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers: defaultHeaders,
    credentials: 'include',
    redirect: 'manual',
  };

  try {
    let response = await fetch(endpoint, config);
    response = await handleRedirect(response, endpoint, config);

    const data = await parseJsonSafe(response);

    if (response.status === 401) {
      return handleUnauthorized(endpoint, () => fetchApi<T>(endpoint, options));
    }

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(data, response.status),
        response.status,
        data
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export async function uploadApi<T>(
  endpoint: string,
  formData: FormData,
  options: Omit<RequestInit, 'body'> = {}
): Promise<ApiResponse<T>> {
  const authService = AuthService.getInstance();
  const accessToken = authService.getAccessToken();

  const defaultHeaders: HeadersInit = {
    Accept: 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    method: 'POST',
    headers: defaultHeaders,
    credentials: 'include',
    redirect: 'manual',
    body: formData,
  };

  try {
    let response = await fetch(endpoint, config);
    response = await handleRedirect(response, endpoint, config);

    const data = await parseJsonSafe(response);

    if (response.status === 401) {
      return handleUnauthorized(endpoint, () =>
        uploadApi<T>(endpoint, formData, options)
      );
    }

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(data, response.status),
        response.status,
        data
      );
    }

    return data as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

export async function downloadApi(
  endpoint: string,
  filename: string,
  options: Omit<RequestInit, 'body'> = {}
): Promise<void> {
  const authService = AuthService.getInstance();
  const accessToken = authService.getAccessToken();

  const defaultHeaders: HeadersInit = {
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    method: 'GET',
    headers: defaultHeaders,
    credentials: 'include',
    redirect: 'manual',
  };

  try {
    let response = await fetch(endpoint, config);
    response = await handleRedirect(response, endpoint, config);

    if (response.status === 401) {
      await handleUnauthorized(endpoint, () =>
        downloadApi(endpoint, filename, options)
      );
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Download failed');
  }
}

export async function deleteApi<T>(
  endpoint: string,
  options: Omit<RequestInit, 'body' | 'method'> = {}
): Promise<ApiResponse<T>> {
  const authService = AuthService.getInstance();
  const accessToken = authService.getAccessToken();

  const defaultHeaders: HeadersInit = {
    Accept: '*/*',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    method: 'DELETE',
    headers: defaultHeaders,
    credentials: 'include',
    redirect: 'manual',
  };

  try {
    let response = await fetch(endpoint, config);
    response = await handleRedirect(response, endpoint, config);

    if (response.status === 401) {
      return handleUnauthorized(endpoint, () => deleteApi<T>(endpoint, options));
    }

    if (response.status === 204) {
      return {
        success: true,
        data: null as T,
        message: 'Successfully deleted',
        error: null,
      };
    }

    if (!response.ok) {
      const errorData = await parseJsonSafe(response);
      throw new ApiError(
        errorData.message || errorData.detail || 'An error occurred',
        response.status,
        errorData
      );
    }

    return (await parseJsonSafe(response)) as ApiResponse<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}