export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `/api/v1/accounts/auth/login`,
    REFRESH_TOKEN: `/api/v1/accounts/auth/refresh-token`,
    LOGOUT: `/api/v1/accounts/auth/logout`,
  },
  REMOTE_CENTER: {
    LIST: `/api/v1/organisations/organisations`,
    CREATE: `/api/v1/organisations/organisations`,
    DETAIL: (id: string) => `/api/v1/organisations/organisations/?organisation_id=${id}`,
    MEMBERS: {
      CREATE: `/api/v1/organisations/organisation-members`,
      UPDATE: (id: string) => `/api/v1/organisations/organisation-members?organisation_member_id=${id}`,
    },
  },
  ICU: {
    LIST: `/api/v1/organisations/organisation-icus`,
    CREATE: `/api/v1/organisations/organisation-icus/with-beds`,
    DETAIL: (id: string) => `/api/v1/organisations/organisation-icus/?icu_id=${id}`,
    DELETE: (id: string) => `/api/v1/organisations/organisation-icus?organisation_icu_id=${id}`,
    BEDS: {
      AVAILABLE: (icuId: string) => `/api/v1/organisations/organisation-icu-beds/available-beds?organisation_icu_id=${icuId}`,
    },
  },
  PATIENT: {
    LIST: `/api/v1/patients/patients`,
    CREATE: `/api/v1/patients/patients`,
    DETAIL: (id: string) => `/api/v1/patients/patients/detail?patient_id=${id}`,
    HISTORY: {
      CREATE: `/api/v1/patients/patient-past-medical-history`,
    },
    HEENT: {
      CREATE: `/api/v1/patients/patient-heent`,
    },
    INVESTIGATION: {
      CREATE: `/api/v1/patients/patient-investigation`,
    },
    APACHE_II: {
      CALCULATE: `/api/v1/patients/apache-ii/calculate`,
      LAST: (patientId: string) => `/api/v1/patients/apache-ii/patient/${patientId}/last`,
    },
    DISCHARGE_REPORT: {
      GET: (patientId: string) => `/api/v1/patients/patients/${patientId}/discharge-report/data`,
      CREATE: (patientId: string) => `/api/v1/patients/patients/${patientId}/discharge-report/data?organisation_id=null`,
      DOWNLOAD: (patientId: string) => `/api/v1/patients/patients/${patientId}/discharge-report?organisation_id=null`,
    },
  },
  CRITICALITY: {
    LIST: `/api/v1/investigation-reports/patient-criticalities/list`,
  },
  PROGRESS_SHEET: {
    CREATE: `/api/v1/investigation-reports/progress-sheets/`,
    GET_BY_DATE: (patientId: string, date: string) => 
      `/api/v1/investigation-reports/progress-sheets/patient/${patientId}/date/${date}`,
    ENSURE_BY_DATE: (patientId: string, date: string) => 
      `/api/v1/investigation-reports/progress-sheets/patient/${patientId}/date/${date}/ensure`,
    GET_BY_SHEET_ID: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}`,
    UPDATE_ENTRY: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/entries`,
    UPDATE_CATHETER: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/catheter`,
    UPDATE_RESPIRATORY: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/respiratory`,
    UPDATE_BLOOD_GAS: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/blood-gas`,
    UPDATE_VITALS: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/vitals`,
    UPDATE_FLUID: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/fluid`,
    UPDATE_GCS: (sheetId: string) =>
      `/api/v1/investigation-reports/progress-sheets/${sheetId}/gcs`,
    FLUID_BY_DATE: (patientId: string, date: string) =>
      `/api/v1/investigation-reports/progress-sheets/patient/${patientId}/date/${date}/fluid`,
  },
  USER: {
    LIST: `/api/v1/accounts/users/list`,
    CREATE: `/api/v1/accounts/users`,
    CREATE_WITH_SIGNATURE: `/api/v1/accounts/users/with-signature`,
    DETAIL: (id: string) => `/api/v1/accounts/users/${id}`,
    DOCTORS: (organisationId: string) => `/api/v1/accounts/users/list?user_type=doctor&organisation_id=${organisationId}&is_active=true`,
    ACTIVATE: (id: string) => `/api/v1/accounts/users/${id}/activate`,
    DEACTIVATE: (id: string) => `/api/v1/accounts/users/${id}/deactivate`,
    SIGNATURE_URL: (id: string) => `/api/v1/accounts/users/${id}/signature-url`,
    UPDATE_SIGNATURE: (id: string) => `/api/v1/accounts/users/${id}/signature`,
  },
  MASTER: {
    ICD_CODES: `/api/v1/masters/icd-codes`,
  },
  DASHBOARD: {
    COUNTS: `/api/v1/dashboard/counts`,
  },
  OPD_PATIENT: {
    CREATE: `/api/v1/patients/opd-patients?organisation_id=null`,
    LIST: `/api/v1/patients/opd-patients`,
    DETAIL: (id: string) => `/api/v1/patients/opd-patients/${id}?organisation_id=null`,
    UPDATE: (id: string) => `/api/v1/patients/opd-patients/${id}?organisation_id=null`,
    DELETE: (id: string) => `/api/v1/patients/opd-patients/${id}?organisation_id=null`,
    REPORT: (id: string) => `/api/v1/patients/opd-patients/${id}/report?organisation_id=null`,
  }
} as const;

export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds 