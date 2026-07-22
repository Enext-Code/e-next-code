'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import AnalysisHeader from '@/components/patients/investigation/AnalysisHeader';
import AnalysisTabs from '@/components/patients/investigation/AnalysisTabs';
import styles from '@/styles/investigationReportEdit.module.css';
import BloodAnalysisForm from '@/components/patients/investigation/BloodAnalysisForm';
import RadiologyForm from '@/components/patients/investigation/RadiologyForm';
import ArterialAnalysisForm from '@/components/patients/investigation/ArterialAnalysisForm';

const tabs = [
  { id: 'blood', label: 'Blood Analysis' },
  { id: 'radiology', label: 'Radiology' },
  { id: 'arterial', label: 'Arterial Analysis' },
  { id: 'microbiology', label: 'Microbiology' },
];

export default function InvestigationReportEditPage() {
  const [selectedDate, setSelectedDate] = useState('2025-03-22');
  const [selectedTime, setSelectedTime] = useState('20:35');
  const [activeTab, setActiveTab] = useState('blood');

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/patients/investigation-report" className={styles.backButton}>
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
          </div>

          <div className={styles.analysisSection}>
            <AnalysisHeader
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateChange={setSelectedDate}
              onTimeChange={setSelectedTime}
            />

            <AnalysisTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <div className={styles.analysisContent}>
              {activeTab === 'blood' && (
                <BloodAnalysisForm onSave={(data) => {}} />
              )}
              {activeTab === 'radiology' && (
                <RadiologyForm onSave={(data) => {}} />
              )}
              {activeTab === 'arterial' && (
                <ArterialAnalysisForm onSave={(data) => {}} />
              )}
              {activeTab === 'microbiology' && (
                <div className={styles.microbiology}>
                  {/* Microbiology form will go here */}
                </div>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.saveButton}>Save Changes</button>
            <Link href="/patients/investigation-report" className={styles.cancelButton}>
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 