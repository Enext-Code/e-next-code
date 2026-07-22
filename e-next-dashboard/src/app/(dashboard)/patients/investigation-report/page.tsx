'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import styles from '@/styles/investigationReport.module.css';
import { useRouter } from 'next/navigation';

interface TimeSlot {
  time: string;
  isSelected: boolean;
}

export default function InvestigationReportPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('Today - 14:04:25');
  
  const timeSlots: TimeSlot[] = [
    { time: '2 PM', isSelected: true },
    { time: '12 PM', isSelected: false },
    { time: '10 AM', isSelected: false },
    { time: '8 AM', isSelected: false },
    { time: '6 AM', isSelected: false },
  ];

  const bloodAnalysisData = [
    { test: 'Hemoglobin (Hb)', result: '8.3 Low', reference: '12.0 - 15.0', units: 'g/dL' },
    { test: 'Red Blood Cell (RBC) Count', result: '3.83 Low', reference: '3.80 - 4.80', units: 'mill/µL' },
    { test: 'Hematocrit (PVC)', result: '28.8 Low', reference: '36.0 - 46.0', units: '%' },
    { test: 'Mean Corpuscular Volume (MCV)', result: '82.1 Low', reference: '83 - 101', units: 'fL' },
    { test: 'Mean Corpuscular Hemoglobin (MCH)', result: '22.9 Low', reference: '27.0 - 32.0', units: 'pg' },
    { test: 'Mean Corpuscular Hemoglobin Concentration (MCHC)', result: '18.8 High', reference: '11.60 - 14.0', units: '%' },
    { test: 'Mean Platelet Volume (MPV)', result: '11.8 High', reference: '6.80 - 10.50', units: 'fL' },
    { test: 'Platelet Count', result: '228', reference: '150 - 410', units: 'thou/µL' },
    { test: 'White Blood Cell (WBC) Count', result: '14.74 High', reference: '4.0 - 10.0', units: 'thou/µL' },
  ];

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/patients" className={styles.backButton}>
            <span>←</span> Investigation Report
          </Link>
          <div className={styles.dateInfo}>
            <span>Date: 22 Mar 2025</span>
            <span>Day: 06</span>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.patientCard}>
            <div className={styles.bedInfo}>
              <span className={styles.bedIcon}>🛏️</span>
              <span>Bed No.02</span>
            </div>
            
            <div className={styles.patientInfo}>
              <div className={styles.infoRow}>
                <div>
                  <label>Patient Name:</label>
                  <span>Rahul Menon</span>
                </div>
                <div>
                  <label>Patient ID:</label>
                  <span>AZ537189191</span>
                </div>
              </div>
              
              <div className={styles.infoRow}>
                <div>
                  <label>Admission Date:</label>
                  <span>28/03/2025</span>
                </div>
              </div>
            </div>

            <div className={styles.dateSelector}>
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                <option value="Today - 14:04:25">Today - 14:04:25</option>
              </select>
            </div>

            <button className={styles.addButton}>+ Add New Report</button>
          </div>

          <div className={styles.timeSelection}>
            {timeSlots.map((slot, index) => (
              <button
                key={index}
                className={`${styles.timeSlot} ${slot.isSelected ? styles.selected : ''}`}
              >
                {slot.time}
              </button>
            ))}
          </div>

          <div className={styles.reportDate}>
            <p>Date: 18 April 2025</p>
            <p>Time: 12:14</p>
            <Link href="/patients/investigation-report/edit" className={styles.editButton}>
              Edit/ Update
            </Link>
          </div>

          <div className={styles.sections}>
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Blood Analysis</h3>
                <button className={styles.expandButton}>-</button>
              </div>
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <div>Tests</div>
                  <div>Results</div>
                  <div>Bio. Reference Interval</div>
                  <div>Units</div>
                </div>
                {bloodAnalysisData.map((item, index) => (
                  <div key={index} className={styles.tableRow}>
                    <div>{item.test}</div>
                    <div className={item.result.includes('Low') || item.result.includes('High') ? styles.alert : ''}>
                      {item.result}
                    </div>
                    <div>{item.reference}</div>
                    <div>{item.units}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Radiology</h3>
                <button className={styles.expandButton}>+</button>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Arterial Analysis</h3>
                <button className={styles.expandButton}>+</button>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Microbiology</h3>
                <button className={styles.expandButton}>+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 