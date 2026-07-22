// 'use client';

// import React from 'react';
// import styles from '@/styles/progressParameters.module.css';

// interface RespiratoryTabProps {
//   formData: {
//     respiratory: {
//       ventMode: string;
//       rate: string;
//       fio2: string;
//       peep: string;
//       mv: {
//         set: string;
//         deltaP (P Plat PEEP): string;
//         awPress: string;
//         insp: string;
//         peakPressure: string;
//         plateauPressure: string;
//         remarks: string;
//       };
//     };
//   };
//   isEditing: boolean;
//   onEdit: () => void;
//   onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
// }

// const RespiratoryTab: React.FC<RespiratoryTabProps> = ({ formData, isEditing, onEdit, onInputChange }) => {
//   if (!isEditing) {
//     return (
//       <div className={styles.viewMode}>
//         <div className={styles.viewHeader}>
//           <h3>Respiratory</h3>
//           <button onClick={onEdit} className={styles.editButton}>
//             <span>✏️</span> Edit Details
//           </button>
//         </div>

//         <div className={styles.viewContent}>
//           <div className={styles.respiratorySection}>
//             <div className={styles.viewRow}>
//               <label>Vent Mode:</label>
//               <span>{formData.respiratory.ventMode}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>Rate:</label>
//               <span>{formData.respiratory.rate}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>FiO2:</label>
//               <span>{formData.respiratory.fio2}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>PEEP:</label>
//               <span>{formData.respiratory.peep}</span>
//             </div>

//             <h4>MV</h4>
//             <div className={styles.viewRow}>
//               <label>Set:</label>
//               <span>{formData.respiratory.mv.set}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>Dalta P (P Plat PEEP):</label>
//               <span>{formData.respiratory.mv.daltaP (P Plat PEEP)}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>AW Pressure:</label>
//               <span>{formData.respiratory.mv.awPress}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>Insp %:</label>
//               <span>{formData.respiratory.mv.insp}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>Peak Pressure:</label>
//               <span>{formData.respiratory.mv.peakPressure}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>Plateau Pressure:</label>
//               <span>{formData.respiratory.mv.plateauPressure}</span>
//             </div>
//             <div className={styles.viewRow}>
//               <label>Remarks:</label>
//               <span>{formData.respiratory.mv.remarks}</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.editMode}>
//       {/* Edit mode form fields */}
//     </div>
//   );
// };

// export default RespiratoryTab; 