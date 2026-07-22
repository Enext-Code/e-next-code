export interface PatientData {
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  criticality: string;
  triage: string;
  uid_number: string;
  ipid_number: string;
  admission_date: string;
  admission_time: string;
  tele_icu_date: string;
  mlc_or_non_mlc_number: string;
  organisation_icu_id: string;
  organisation_icu_bed_id: string;
  doctor_id: string;
  icd_code_id: string;
  status: string;
  id: string;
  unique_id: string;
  organisation_id: string;
  created_at: string;
  updated_at: string;
  organisation_icu_bed_number: number;
  organisation_icu_name: string;
  doctor_full_name: string;
  icd_code: {
    code: string;
    description: string;
    id: string;
    created_at: string;
    updated_at: string;
  };
  is_patient_past_medical_history: boolean;
  is_patient_heent: boolean;
  is_patient_investigation: boolean;
} 