'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import PatientHeader from './details/PatientHeader';
import PatientInfo from './details/PatientInfo';
import ActionCards from './details/ActionCards';
import styles from '@/styles/patientdetails.module.css';

interface FluidData {
  patient_id: string;
  date: string;
  total_input: number;
  total_output: number;
  cumulative_balance: number;
}

interface PatientData {
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
  remark: string;
  remark_datetime: string;
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

interface Props {
  patientId: string;
}

export default function PatientDetailsView({ patientId }: Props) {
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [fluidData, setFluidData] = useState<FluidData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientDetails();
    fetchFluidData();
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchApi<any>(
        API_ENDPOINTS.PATIENT.DETAIL(patientId)
      );

      let targetRecord: any = null;
      const dataPayload = response?.data ?? response;

      if (Array.isArray(dataPayload?.items)) {
        targetRecord =
          dataPayload.items.find(
            (item: any) => String(item.id) === String(patientId)
          ) ?? dataPayload.items[0];
      } else if (dataPayload && typeof dataPayload === 'object' && !dataPayload.items) {
        targetRecord = dataPayload;
      }

      if (targetRecord && (targetRecord.id || targetRecord.unique_id)) {
        setPatient(targetRecord);
      } else {
        setError('Failed to fetch patient details');
      }
    } catch (err) {
      console.error('Error fetching patient details:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching patient details'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFluidData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetchApi<FluidData>(
        API_ENDPOINTS.PROGRESS_SHEET.FLUID_BY_DATE(patientId, today)
      );
      if (response.success && response.data) {
        setFluidData(response.data);
      }
    } catch {
      // Silently handle — no fluid data available
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading patient details...</div>;
  }

  if (error || !patient) {
    return <div className={styles.error}>{error || 'Patient not found'}</div>;
  }

  return (
    <div className={styles.container}>

      <PatientHeader patient={patient} fluidData={fluidData} />
      <PatientInfo patient={patient} />
      <ActionCards patient={patient} />
    </div>
  );
} 


// 'use client';

// import React, { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { fetchApi } from '@/utils/api';
// import { API_ENDPOINTS } from '@/constants/api';
// import PatientHeader from './details/PatientHeader';
// import PatientInfo from './details/PatientInfo';
// import ActionCards from './details/ActionCards';
// import styles from '@/styles/patientdetails.module.css';

// interface FluidData {
//   patient_id: string;
//   date: string;
//   total_input: number;
//   total_output: number;
//   cumulative_balance: number;
// }

// interface PatientData {
//   first_name: string;
//   last_name: string;
//   gender: string;
//   age: number;
//   criticality: string;
//   triage: string;
//   uid_number: string;
//   ipid_number: string;
//   admission_date: string;
//   admission_time: string;
//   tele_icu_date: string;
//   mlc_or_non_mlc_number: string;
//   organisation_icu_id: string;
//   organisation_icu_bed_id: string;
//   doctor_id: string;
//   icd_code_id: string;
//   status: string;
//   remark: string;
//   remark_datetime: string;
//   id: string;
//   unique_id: string;
//   organisation_id: string;
//   created_at: string;
//   updated_at: string;
//   organisation_icu_bed_number: number;
//   organisation_icu_name: string;
//   doctor_full_name: string;
//   icd_code: {
//     code: string;
//     description: string;
//     id: string;
//     created_at: string;
//     updated_at: string;
//   };
//   is_patient_past_medical_history: boolean;
//   is_patient_heent: boolean;
//   is_patient_investigation: boolean;
// }

// interface Props {
//   patientId: string;
// }

// export default function PatientDetailsView({ patientId }: Props) {
//   const [patient, setPatient] = useState<PatientData | null>(null);
//   const [fluidData, setFluidData] = useState<FluidData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (patientId) {
//       fetchPatientDetails();
//       fetchFluidData();
//     }
//   }, [patientId]);

//   const fetchPatientDetails = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // const response = await fetchApi<any>(
//       //   `/api/v1/patients/patients/?patient_id=${patientId}`
//       // );

//       const response = await fetchApi<any>(
//         API_ENDPOINTS.PATIENT.DETAIL(patientId)
//       );
//       console.log("========== PATIENT RESPONSE ==========", response);

//       let targetRecord: any = null;

//       if (response) {
//         // Unbox payload envelope layers safely
//         const dataPayload = response.data || response;
//         const targetItems = dataPayload.items || (Array.isArray(dataPayload) ? dataPayload : null);

//         if (Array.isArray(targetItems)) {
//           // EXPLICIT SEARCH: Locate the unique matching profile
//           targetRecord = targetItems.find(
//             (item: any) => String(item.id) === String(patientId)
//           );
          
//           // Fallback array handling
//           if (!targetRecord && targetItems.length > 0) {
//             targetRecord = targetItems[0];
//           }
//         } else if (dataPayload && typeof dataPayload === 'object' && !dataPayload.items) {
//           targetRecord = dataPayload;
//         }
//       }

//       if (targetRecord && (targetRecord.id || targetRecord.unique_id)) {
//         // Privacy Safeguard: Redact raw national identification strings
//         if (targetRecord.uid_number) {
//           targetRecord.uid_number = '[Aadhaar Redacted]';
//         }
//         setPatient(targetRecord);
//       } else {
//         setError('No record matches the selected Patient ID.');
//       }
//     } catch (err) {
//       console.error('Error fetching patient details:', err);
//       setError(
//         err instanceof Error
//           ? err.message
//           : 'An error occurred while fetching patient details'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchFluidData = async () => {
//     try {
//       const today = new Date().toISOString().split('T')[0];
//       const response = await fetchApi<any>(
//         API_ENDPOINTS.PROGRESS_SHEET.FLUID_BY_DATE(patientId, today)
//       );
//       if (response && response.data) {
//         setFluidData(response.data);
//       }
//     } catch {
//       // Silently catch missing fluid payload allocations
//     }
//   };

//   if (loading) {
//     return <div className={styles.loading}>Loading patient details...</div>;
//   }

//   if (error || !patient) {
//     return <div className={styles.error}>{error || 'Patient not found'}</div>;
//   }

//   return (
//     <div className={styles.container}>
//       <PatientHeader patient={patient} fluidData={fluidData} />
//       <PatientInfo patient={patient} />
//       <ActionCards patient={patient} />
//     </div>
//   );
// }