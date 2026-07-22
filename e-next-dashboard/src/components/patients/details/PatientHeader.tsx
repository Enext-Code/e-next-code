import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/patientdetails.module.css';
import { PatientData } from '../types';
import DischargeReportModal from './DischargeReportModal';


interface FluidData {
  patient_id: string;
  date: string;
  total_input: number;
  total_output: number;
  cumulative_balance: number;
}

interface Props {
  patient: PatientData;
  fluidData?: FluidData | null;
}

const BedIcon = ({ bedNumber }: { bedNumber: number }) => (
  <svg width="95" height="112" viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3.49219" y="0.507812" width="87.1043" height="86.4922" rx="14.1544" fill="#F4F4FF"/>
    <text x="47" y="85" textAnchor="middle" fill="#544EA8" fontSize="14" fontWeight="500">
      Bed No {bedNumber}
    </text>
    <circle cx="48.1347" cy="30.8788" r="18.5097" fill="white"/>
    <g clipPath="url(#clip0_6574_50612)">
      <path d="M48.6726 29.4036C51.0513 29.4036 52.9855 27.5418 52.9855 25.2534C52.9818 22.9614 51.0513 21.0996 48.6726 21.0996C46.2974 21.0996 44.3633 22.9614 44.3633 25.2498C44.3633 27.5382 46.2938 29.4036 48.6726 29.4036Z" fill="#544EA8"/>
      <path d="M52.0754 35.9774H51.0632V36.9535C51.0632 37.362 50.7342 37.691 50.3257 37.691C49.9172 37.691 49.5882 37.362 49.5882 36.9535V35.9774H48.576C48.1674 35.9774 47.8385 35.6484 47.8385 35.2399C47.8385 34.8314 48.1674 34.5024 48.576 34.5024H49.5882V33.5299C49.5882 33.1214 49.9172 32.7924 50.3257 32.7924C50.7342 32.7924 51.0632 33.1214 51.0632 33.5299V34.5024H52.0754C52.484 34.5024 52.8129 34.8314 52.8129 35.2399C52.8129 35.6484 52.484 35.9774 52.0754 35.9774ZM51.244 30.2871C50.4703 30.6631 49.5991 30.88 48.6736 30.88C47.7517 30.88 46.8804 30.6631 46.1032 30.2871C42.4699 31.303 39.8164 34.4084 39.8164 38.0778C39.8164 38.4863 40.1454 38.8153 40.5539 38.8153H56.7932C57.2017 38.8153 57.5307 38.4863 57.5307 38.0778C57.5307 34.4084 54.8772 31.303 51.244 30.2871Z" fill="#544EA8"/>
    </g>
    <defs>
      <clipPath id="clip0_6574_50612">
        <rect width="18.5097" height="18.5097" fill="white" transform="translate(39.4219 20.7031)"/>
      </clipPath>
    </defs>
  </svg>
);

export default function PatientHeader({ patient, fluidData }: Props) {
  const router = useRouter();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleHistorySheetClick = () => {
    router.push(`/patients/${patient.id}/history`);
  };

  const handleApacheScoreClick = () => {
    router.push(`/patients/${patient.id}/apache-score`);
  };

  const handleCriticalInputClick = () => {
    router.push(`/patients/${patient.id}/critical-input`);
  };

  const handleStatusChangeClick = () => {
    router.push(`/patients/${patient.id}/status-change`);
  };

  const handleGenerateReportClick = () => {
    setIsReportModalOpen(true);
  };

  return (
    <div className={styles.patientHeader}>
      <div className={styles.patientFullInfo}>
        <div className={styles.bedInfo}>
            <BedIcon bedNumber={patient.organisation_icu_bed_number} />
          {/* <span className={styles.icuName}>{patient.organisation_icu_name}</span> */}
        </div>
        <div className={styles.patientBasicInfo}>
        <div className={styles.infoItem}>
          <h2>Patient Name:</h2>
          <span>{`${patient.first_name} ${patient.last_name}`}</span>
        </div>
        <div className={styles.infoItem}>
          <h2>Patient ID:</h2>
          <span className={styles.patientId}>{patient.unique_id}</span>
        </div>
        <div className={styles.infoItem}>
            <h2>Admission Date:</h2>
            <span>{new Date(patient.admission_date).toLocaleDateString()}</span>
          </div>
          <div className={styles.infoItem}>
            <h2>UID No:</h2>
            <span>{patient.uid_number}</span>
          </div>
          {fluidData && (
            <div className={styles.infoItem}>
              <h2>Input/Output - Cumulative Balance:</h2>
              <span>{fluidData.cumulative_balance} ({new Date(fluidData.date).toLocaleDateString()})</span>
            </div>
          )}
        {/* <div className={styles.admissionInfo}> */}
          
          
          {/* <div className={styles.infoItem}>
            <label>Blood Group:</label>
            <span>AB+</span>
          </div>
        </div>
        <div className={styles.medicalInfo}>
          <div className={styles.infoItem}>
            <label>Allergies:</label>
            <span>Cefixime, Metamorphine</span>
          </div>
          <div className={styles.infoItem}>
            <label>Food Allergy:</label>
            <span>Rice</span>
          </div> */}
        {/* </div> */}
      </div>
      </div>
      {/* <div className={styles.statusTags}>
        <span className={`${styles.tag} ${styles[patient.criticality]}`}>
          {patient.criticality.toUpperCase()}
        </span>
        <span className={`${styles.tag} ${styles[patient.triage]}`}>
          {patient.triage.toUpperCase()}
        </span>
      </div> */}
      <div className={styles.patientInfoButtons}>
      <div className={styles.actionButtons}>
        <button 
          className={styles.actionButton}
          onClick={handleApacheScoreClick}
        >
          <span>Apache Score</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={handleHistorySheetClick}
        >
          <span>History Sheet</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={handleCriticalInputClick}
        >
          <span>Critical input</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={handleStatusChangeClick}
        >
          <span>Status Change</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={handleGenerateReportClick}
        >
          <span>Generate Report</span>
        </button>
      </div>
      </div>

      <DischargeReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        patientId={patient.id}
        patientName={`${patient.first_name}_${patient.last_name}`}
      />
    </div>

  );
} 


// 'use client';

// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import styles from '@/styles/patientdetails.module.css';
// import { PatientData } from '../types';
// import DischargeReportModal from './DischargeReportModal';

// interface FluidData {
//   patient_id: string;
//   date: string;
//   total_input: number;
//   total_output: number;
//   cumulative_balance: number;
// }

// interface Props {
//   patient: PatientData | any;
//   fluidData?: FluidData | null;
// }

// const BedIcon = ({ bedNumber }: { bedNumber: number }) => (
//   <svg width="95" height="112" viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <rect x="3.49219" y="0.507812" width="87.1043" height="86.4922" rx="14.1544" fill="#F4F4FF"/>
//     <text x="47" y="85" textAnchor="middle" fill="#544EA8" fontSize="14" fontWeight="500">
//       Bed No {bedNumber ?? 'N/A'}
//     </text>
//     <circle cx="48.1347" cy="30.8788" r="18.5097" fill="white"/>
//     <g clipPath="url(#clip0_6574_50612)">
//       <path d="M48.6726 29.4036C51.0513 29.4036 52.9855 27.5418 52.9855 25.2534C52.9818 22.9614 51.0513 21.0996 48.6726 21.0996C46.2974 21.0996 44.3633 22.9614 44.3633 25.2498C44.3633 27.5382 46.2938 29.4036 48.6726 29.4036Z" fill="#544EA8"/>
//       <path d="M52.0754 35.9774H51.0632V36.9535C51.0632 37.362 50.7342 37.691 50.3257 37.691C49.9172 37.691 49.5882 37.362 49.5882 36.9535V35.9774H48.576C48.1674 35.9774 47.8385 35.6484 47.8385 35.2399C47.8385 34.8314 48.1674 34.5024 48.576 34.5024H49.5882V33.5299C49.5882 33.1214 49.9172 32.7924 50.3257 32.7924C50.7342 32.7924 51.0632 33.1214 51.0632 33.5299V34.5024H52.0754C52.484 34.5024 52.8129 34.8314 52.8129 35.2399C52.8129 35.6484 52.484 35.9774 52.0754 35.9774ZM51.244 30.2871C50.4703 30.6631 49.5991 30.88 48.6736 30.88C47.7517 30.88 46.8804 30.6631 46.1032 30.2871C42.4699 31.303 39.8164 34.4084 39.8164 38.0778C39.8164 38.4863 40.5539 38.8153 40.5539 38.8153H56.7932C57.2017 38.8153 57.5307 38.4863 57.5307 38.0778C57.5307 34.4084 54.8772 31.303 51.244 30.2871Z" fill="#544EA8"/>
//     </g>
//     <defs>
//       <clipPath id="clip0_6574_50612">
//         <rect width="18.5097" height="18.5097" fill="white" transform="translate(39.4219 20.7031)"/>
//       </clipPath>
//     </defs>
//   </svg>
// );

// export default function PatientHeader({ patient: rawPatient, fluidData }: Props) {
//   const router = useRouter();
//   const [isReportModalOpen, setIsReportModalOpen] = useState(false);

//   // Unbox API wrapper structures cleanly
//   const patient: PatientData | null = React.useMemo(() => {
//     if (!rawPatient) return null;
//     if (rawPatient.data) {
//       if (Array.isArray(rawPatient.data.items) && rawPatient.data.items.length > 0) {
//         return rawPatient.data.items[0];
//       }
//       return rawPatient.data;
//     }
//     if (Array.isArray(rawPatient.items) && rawPatient.items.length > 0) {
//       return rawPatient.items[0];
//     }
//     return rawPatient;
//   }, [rawPatient]);

//   if (!patient || Object.keys(patient).length === 0) {
//     return (
//       <div className={styles.patientHeader} style={{ textAlign: 'center', padding: '20px' }}>
//         <h2>Loading Clinical Header...</h2>
//       </div>
//     );
//   }

//   const handleHistorySheetClick = () => {
//     router.push(`/patients/${patient.id}/history`);
//   };

//   const handleApacheScoreClick = () => {
//     router.push(`/patients/${patient.id}/apache-score`);
//   };

//   const handleCriticalInputClick = () => {
//     router.push(`/patients/${patient.id}/critical-input`);
//   };

//   const handleStatusChangeClick = () => {
//     router.push(`/patients/${patient.id}/status-change`);
//   };

//   const handleGenerateReportClick = () => {
//     setIsReportModalOpen(true);
//   };

//   const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'N/A';
  
//   const formattedDate = patient.admission_date 
//     ? new Date(patient.admission_date).toLocaleDateString() 
//     : 'N/A';

//   return (
//     <div className={styles.patientHeader}>
//       <div className={styles.patientFullInfo}>
//         <div className={styles.bedInfo}>
//           <BedIcon bedNumber={patient.organisation_icu_bed_number} />
//         </div>
//         <div className={styles.patientBasicInfo}>
//           <div className={styles.infoItem}>
//             <h2>Patient Name:</h2>
//             <span>{fullName}</span>
//           </div>
//           <div className={styles.infoItem}>
//             <h2>Patient ID:</h2>
//             <span className={styles.patientId}>{patient.unique_id || 'N/A'}</span>
//           </div>
//           <div className={styles.infoItem}>
//             <h2>Admission Date:</h2>
//             <span>{formattedDate}</span>
//           </div>
//           <div className={styles.infoItem}>
//             <h2>UID No:</h2>
//             <span>{patient.uid_number || 'N/A'}</span>
//           </div>
//           {fluidData && (
//             <div className={styles.infoItem}>
//               <h2>Input/Output - Cumulative Balance:</h2>
//               <span>
//                 {fluidData.cumulative_balance} ({fluidData.date ? new Date(fluidData.date).toLocaleDateString() : 'N/A'})
//               </span>
//             </div>
//           )}
//         </div>
//       </div>

//       <div className={styles.patientInfoButtons}>
//         <div className={styles.actionButtons}>
//           <button className={styles.actionButton} onClick={handleApacheScoreClick}>
//             <span>Apache Score</span>
//           </button>
//           <button className={styles.actionButton} onClick={handleHistorySheetClick}>
//             <span>History Sheet</span>
//           </button>
//           <button className={styles.actionButton} onClick={handleCriticalInputClick}>
//             <span>Critical input</span>
//           </button>
//           <button className={styles.actionButton} onClick={handleStatusChangeClick}>
//             <span>Status Change</span>
//           </button>
//           <button className={styles.actionButton} onClick={handleGenerateReportClick}>
//             <span>Generate Report</span>
//           </button>
//         </div>
//       </div>

//       <DischargeReportModal
//         isOpen={isReportModalOpen}
//         onClose={() => setIsReportModalOpen(false)}
//         patientId={patient.id}
//         patientName={`${patient.first_name || 'Patient'}_${patient.last_name || 'Record'}`}
//       />
//     </div>
//   );
// }