import React from 'react';
import styles from '@/styles/dashboard.module.css';
import Image from 'next/image';

interface Patient {
  id: string;
  name: string;
  role: string;
  avatar: string;
  age: number;
  gender: string;
  status: 'active' | 'inactive' | 'discharged';
  price: string;
}

interface PatientListProps {
  patients: Patient[];
}

const PatientList = ({ patients }: PatientListProps) => {
  return (
    <div className={styles.patientsTable}>
      <div className={styles.tableHeader}>
        <h2>Patients List <span className={styles.patientCount}>380 member</span></h2>
        <div className={styles.tableActions}>
          <button className={styles.moreOptionsBtn}>⋮</button>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Patients name</th>
            <th>Patient ID <span className={styles.sortIcon}>↓</span></th>
            <th>Age <span className={styles.sortIcon}>↓</span></th>
            <th>Sex</th>
            <th>Status <span className={styles.sortIcon}>↓</span></th>
            <th>Price <span className={styles.sortIcon}>↓</span></th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>
                <div className={styles.patientInfo}>
                  <div className={styles.patientAvatar}>
                    <Image 
                      src={patient.avatar} 
                      alt={patient.name}
                      width={40}
                      height={40}
                    />
                  </div>
                  <div>
                    <div className={styles.patientName}>{patient.name}</div>
                    <div className={styles.patientRole}>{patient.role}</div>
                  </div>
                </div>
              </td>
              <td>{patient.id}</td>
              <td>{patient.age}</td>
              <td>{patient.gender}</td>
              <td>
                <span className={`${styles.status} ${styles[patient.status]}`}>
                  {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                </span>
              </td>
              <td>{patient.price}</td>
              <td>
                <div className={styles.actionButtons}>
                  <button className={styles.viewBtn}>👁️</button>
                  <button className={styles.editBtn}>✏️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PatientList; 