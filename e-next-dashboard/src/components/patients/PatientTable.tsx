'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Pagination from './Pagination';
import { patientData } from '@/data/patients';
import styles from '@/styles/patients.module.css';

const PatientTable = () => {
  const router = useRouter();

  const handlePatientClick = (bedNo: string) => {
    router.push(`/patients/${bedNo}`);
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.patientsTable}>
        <thead>
          <tr>
            <th>Bed No</th>
            <th>Name</th>
            <th>Age</th>
            <th>Patient ID</th>
            <th>Admission Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {patientData.map((patient) => (
            <tr 
              key={patient.bedNo}
              onClick={() => handlePatientClick(patient.bedNo)}
              className={styles.clickableRow}
            >
              <td>{patient.bedNo}</td>
              <td>{patient.name}</td>
              <td>{patient.age}</td>
              <td>{patient.patientId}</td>
              <td>{patient.admissionDate}</td>
              <td>
                <span className={`${styles.status} ${styles[patient.status.toLowerCase()]}`}>
                  {patient.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination />
    </div>
  );
};

export default PatientTable; 