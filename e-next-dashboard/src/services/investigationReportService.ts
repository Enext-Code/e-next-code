import { Parameter, RadiologyType } from '@/types/investigation';
import { fetchApi , uploadApi } from '@/utils/api';

// Base interfaces for API responses
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

// Investigation Report List Item
export interface InvestigationReportListItem {
  id: string;
  report_id: string;
  patient_id: string;
  analysis_date: string;
  has_blood_analysis: boolean;
  has_radiology: boolean;
  has_arterial_analysis: boolean;
  has_microbiology: boolean;
  blood_parameters_count: number;
  radiology_images_count: number;
  arterial_parameters_count: number;
  microbiology_parameters_count: number;
  created_at: string;
  updated_at: string;
}

// Investigation Report Interfaces for Detailed View
interface RecordedValue {
  parameter: string;
  value: string;
  recorded_at: string;
  recorded_by: string;
}

interface AnalysisValues {
  [key: string]: RecordedValue;
}

interface RadiologyItem {
  radiology_type: 'X-Ray' | string;
  subtype: string;
  file_keys: string[];
  number_of_images: number;
  reported_at: string;
  reported_by: string;
}

export interface InvestigationReportData {
  id: string;
  report_id: string;
  patient_id: string;
  analysis_date: string;
  blood_analysis: {
    values: AnalysisValues;
  };
  radiology_list: RadiologyItem[];
  arterial_analysis: {
    values: AnalysisValues;
  };
  microbiology: {
    values: AnalysisValues;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  presigned_urls: {
    [key: string]: string;
  };
}

// Response types for different API endpoints
export interface InvestigationResponseReportListData {
  items: InvestigationReportListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface InvestigationReportCreateResponse {
  success: boolean;
  message: string;
  report_id: string;
  analysis_date: string;
  created_at: string;
  error: string | null;
}

// Request parameter types
export interface ListInvestigationReportsParams {
  page?: number;
  limit?: number;
  sort_order?: 'asc' | 'desc';
  organisation_id?: string | null;
  from_date?: string;
  to_date?: string;
}

export interface CreateInvestigationReportParams {
  patient_id: string;
  analysis_date: string;
}

export interface UpdateInvestigationReportParams {
  blood_analysis?: {
    values: AnalysisValues;
  };
  radiology_list?: RadiologyItem[];
  arterial_analysis?: {
    values: AnalysisValues;
  };
  microbiology?: {
    values: AnalysisValues;
  };
}

export interface AvailableParametersResponse {
  blood_parameters: Parameter[];
  arterial_parameters: Parameter[];
  radiology_types: RadiologyType[];
  microbiology_parameters: Parameter[];
}

// The service class
export const investigationReportService = {
  // List investigation reports for a patient
  listInvestigationReports: async (patientId: string, params: ListInvestigationReportsParams = {}) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 100).toString(),
      sort_order: params.sort_order || 'desc',
      patient_id: patientId,
      ...(params.from_date && { from_date: params.from_date }),
      ...(params.to_date && { to_date: params.to_date }),
      ...(params.organisation_id === null ? { organisation_id: 'null' } : params.organisation_id ? { organisation_id: params.organisation_id } : {})
    });

    return fetchApi<InvestigationResponseReportListData>(
      `/api/v1/investigation-reports/investigation-reports?${queryParams.toString()}`
    );
  },

  // Get a single investigation report by ID
  getInvestigationReport: async (reportId: string) => {
    return fetchApi<ApiResponse<InvestigationReportData>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}`
    );
  },

  // Create a new investigation report
  createInvestigationReport: async (data: CreateInvestigationReportParams, organisationId: string | null = null ) => {
    return fetchApi<InvestigationReportCreateResponse>(
      `/api/v1/investigation-reports/investigation-reports/?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  },

  // Update an existing investigation report
  updateInvestigationReport: async (reportId: string, data: UpdateInvestigationReportParams) => {
    return fetchApi<ApiResponse<InvestigationReportData>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  },

  // Delete an investigation report
  deleteInvestigationReport: async (reportId: string) => {
    return fetchApi<ApiResponse<null>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}`,
      {
        method: 'DELETE'
      }
    );
  },

  // Upload files for radiology
  uploadRadiologyFiles: async (reportId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return fetchApi<ApiResponse<{ file_keys: string[] }>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
  },

  getAvailableParameters: async () => {
    return fetchApi<AvailableParametersResponse>(
      `/api/v1/investigation-reports/investigation-reports/parameters/available`,
      {
        method: 'GET'
      }
    );
  },

  updateBloodAnalysis: async (reportId: string, organisationId: string, parameters: any[]) => {
    return fetchApi<ApiResponse<InvestigationReportData>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}/blood-analysis/bulk?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters })
      }
    );
  },

  updateArterialAnalysis: async (reportId: string, organisationId: string, parameters: any[]) => {
    return fetchApi<ApiResponse<InvestigationReportData>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}/arterial-analysis/bulk?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters })
      }
    );
  },

  updateMicrobiology: async (reportId: string, organisationId: string, data: { tests: any[] }) => {
    return fetchApi<ApiResponse<InvestigationReportData>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}/microbiology/bulk?organisation_id=${organisationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)  // Send data directly without wrapping in parameters
      }
    );
  },

  uploadRadiologyImages: async (reportId: string, organisationId: string, formData: FormData) => {
    return uploadApi<ApiResponse<{ file_keys: string[] }>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}/radiology/bulk-upload?organisation_id=${organisationId}`,
      formData,
      {
        method: 'POST'
      }
    );
  },

  deleteRadiologyImage: async (reportId: string, organisationId: string, fileKey: string) => {
    return fetchApi<ApiResponse<null>>(
      `/api/v1/investigation-reports/investigation-reports/${reportId}/radiology/images?organisation_id=${organisationId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_keys: [fileKey]
        })
      }
    );
  },

  // Get daily round sheets list for a patient
  getDailyRoundSheetsList: async (patientId: string, params: {
    page?: number;
    limit?: number;
    sort_order?: 'asc' | 'desc';
  } = {}) => {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      limit: (params.limit || 100).toString(),
      sort_order: params.sort_order || 'desc',
      patient_id: patientId
    });

    return fetchApi<{
      success: boolean;
      message: string;
      data: {
        items: {
          id: string;
          sheet_id: string;
          patient_id: string;
          date: string;
          prescription: string;
          progress_sheet_id: string;
          progress_sheet_datetime: string;
          investigation_report_id: string;
          current_issue: string;
          current_treatment: string;
          created_at: string;
          updated_at: string;
        }[];
        total: number;
        page: number;
        limit: number;
        pages: number;
        has_next: boolean;
        has_prev: boolean;
      };
      error: null;
    }>(
      `/api/v1/investigation-reports/daily-round-sheets/list?${queryParams.toString()}`
    );
  },

  // Create daily round sheet
  createDailyRoundSheet: async (organisationId: string | null, data: {
    patient_id: string;
    date: string;
    prescription: string;
    current_issue: string;
    current_treatment: string;
    progress_sheet_id: string;
    progress_sheet_datetime: string;
    investigation_report_id: string;
  }) => {
    const orgIdParam = organisationId === null ? 'null' : organisationId;
    return fetchApi<ApiResponse<{
      id: string;
      sheet_id: string;
      patient_id: string;
      date: string;
      prescription: string;
      progress_sheet_id: string;
      progress_sheet_datetime: string;
      investigation_report_id: string;
      current_issue: string;
      current_treatment: string;
      created_at: string;
      updated_at: string;
    }>>(
      `/api/v1/investigation-reports/daily-round-sheets?organisation_id=${orgIdParam}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  },

  // Get daily round sheet by sheet_id
  getDailyRoundSheetBySheetId: async (sheetId: string) => {
    return fetchApi<ApiResponse<{
      id: string;
      sheet_id: string;
      patient_id: string;
      date: string;
      prescription: string;
      progress_sheet_id: string;
      progress_sheet_datetime: string;
      investigation_report_id: string;
      current_issue: string;
      current_treatment: string;
      created_at: string;
      updated_at: string;
    }>>(
      `/api/v1/investigation-reports/daily-round-sheets/?sheet_id=${sheetId}`
    );
  },

  // Update daily round sheet
  updateDailyRoundSheet: async (sheetId: string, data: {
    prescription?: string;
    current_issue?: string;
    current_treatment?: string;
  }) => {
    return fetchApi<ApiResponse<{
      id: string;
      sheet_id: string;
      patient_id: string;
      date: string;
      prescription: string;
      progress_sheet_id: string;
      progress_sheet_datetime: string;
      investigation_report_id: string;
      current_issue: string;
      current_treatment: string;
      created_at: string;
      updated_at: string;
    }>>(
      `/api/v1/investigation-reports/daily-round-sheets?sheet_id=${sheetId}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );
  }
};
