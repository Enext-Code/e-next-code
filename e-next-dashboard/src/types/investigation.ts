export interface Parameter {
  value: string;
  display_name: string;
}

export interface RadiologyType extends Parameter {
  subtypes: string[];
}

export interface AvailableParameters {
  blood_parameters: Parameter[];
  arterial_parameters: Parameter[];
  radiology_types: RadiologyType[];
  microbiology_parameters: Parameter[];
}

export interface RecordedValue {
  parameter: string;
  value: string | number;
  recorded_at: string;
  recorded_by: string | null;
}

export interface BloodAnalysisValues {
  [key: string]: RecordedValue;
}

export interface ArterialAnalysisValues {
  [key: string]: RecordedValue;
}

export interface MicrobiologyTest {
  test_type: string;
  specimen_source: string;
  remarks: string;
  organisms: {
    organism_name: string;
    sensitivity_tests: {
      antibiotic: string;
      result: string;
      sensitivity_power: number | null;
    }[];
  }[];
  recorded_at?: string;
  recorded_by?: string;
}

export interface MicrobiologyValues {
  tests: MicrobiologyTest[];
  values: Record<string, any>;
}

export interface RadiologyImage {
  radiology_type: string;

  subtype: string;
  file_keys: string[];
  number_of_images: number;
  reported_at: string;
  reported_by: string;
}

export interface InvestigationReport {
  id: string;
  report_id: string;
  patient_id: string;
  analysis_date: string;
  blood_analysis: {
    values: BloodAnalysisValues;
  };
  arterial_analysis: {
    values: ArterialAnalysisValues;
  };
  microbiology: MicrobiologyValues;
  radiology_list: RadiologyImage[];
  presigned_urls: {
    [key: string]: string;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
} 