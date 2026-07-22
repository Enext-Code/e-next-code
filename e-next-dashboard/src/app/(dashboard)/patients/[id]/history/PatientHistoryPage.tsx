'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumb from '@/components/common/Breadcrumb';
import BasicInfoTab from '@/components/patients/history/BasicInfoTab';
import PastMedicalHistoryTab from '@/components/patients/history/PastMedicalHistoryTab';
import PhysicalExamTab from '@/components/patients/history/PhysicalExamTab';
import InvestigationTab from '@/components/patients/history/InvestigationTab';
import { patientService, PatientInfoResponse } from '@/services/patientService';
import styles from '@/styles/patient-details/patient-history.module.css';

interface PageParams {
  id: string;
}

type TabType = 'basic' | 'history' | 'physical' | 'investigation';

export default function PatientHistoryPage({ params }: { params: PageParams }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [patientInfo, setPatientInfo] = useState<PatientInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Get current date in DD-MM-YYYY format (IST)
  const currentDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  
  // Calculate days since admission (using IST)
  const calculateDays = (admissionDate: string) => {
    // Backend provides IST dates
    const admission = new Date(admissionDate);
    // Get current date in IST
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const admissionDateOnly = new Date(admission.toISOString().split('T')[0]);
    const todayDateOnly = new Date(today.toISOString().split('T')[0]);
    const diffTime = Math.abs(todayDateOnly.getTime() - admissionDateOnly.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const data = await patientService.getPatientInfo(params.id);
        if (data.success) {
          setPatientInfo(data.data);
        } else {
          setError(data.message || 'Failed to load patient information');
        }
      } catch (err) {
        console.error('Error fetching patient details:', err);
        setError('Failed to load patient information');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [params.id]);

  const handleSectionClick = (section: 'past_medical_history' | 'heent' | 'investigation', path: string) => {
    if (!patientInfo) return;

    const sectionData = patientInfo[section];
    if (sectionData._id === null) {
      setPopupMessage(`Please create ${section.replace(/_/g, ' ')} first`);
      setShowPopup(true);
      setTimeout(() => {
        router.push(`/patients/${params.id}/history/add`);
      }, 2000);
    } else {
      router.push(path);
    }
  };

  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'History Sheet' }
  ];

  if (loading) {
    return (
      <>
        <div className={styles.loading}>Loading patient history...</div>
      </>
    );
  }

  if (error || !patientInfo) {
    return (
      <>
        <div className={styles.error}>{error || 'Patient not found'}</div>
      </>
    );
  }

  const day = calculateDays(patientInfo.basic_details.admission_date).toString().padStart(2, '0');

  return (
    <>
      <div className={styles.pageContainer}>
        <h2 style={{fontSize: '24px', fontWeight: '600'}}>Patient History</h2>
        <Breadcrumb 
          items={breadcrumbItems}
          date={currentDate}
          day={day}
        />
        
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tab} ${activeTab === 'basic' ? styles.active : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Patient Basic Info
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => {
              if (patientInfo?.past_medical_history._id === null) {
                setPopupMessage('Please create past medical history first');
                setShowPopup(true);
                setTimeout(() => {
                  router.push(`/patients/${params.id}/history/add?tab=history`);
                }, 2000);
              } else {
                setActiveTab('history');
              }
            }}
          >
            Past Medical History
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'physical' ? styles.active : ''}`}
            onClick={() => {
              if (patientInfo?.heent._id === null) {
                setPopupMessage('Please create physical examination first');
                setShowPopup(true);
                setTimeout(() => {
                  router.push(`/patients/${params.id}/history/add?tab=physical`);
                }, 2000);
              } else {
                setActiveTab('physical');
              }
            }}
          >
            Physical Examination
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'investigation' ? styles.active : ''}`}
            onClick={() => {
              if (patientInfo?.investigation._id === null) {
                setPopupMessage('Please create investigation first');
                setShowPopup(true);
                setTimeout(() => {
                  router.push(`/patients/${params.id}/history/add?tab=investigation`);
                }, 2000);
              } else {
                setActiveTab('investigation');
              }
            }}
          >
            Investigation
          </button>
        </div>

        <div className={styles.contentContainer}>
          {activeTab === 'basic'  && <BasicInfoTab patient={patientInfo.basic_details} patientId={params.id} />}
          {activeTab === 'history'  && <PastMedicalHistoryTab history={patientInfo.past_medical_history} patientId={params.id} />}
          {activeTab === 'physical' && <PhysicalExamTab heent={patientInfo.heent} patientId={params.id} />}
          {activeTab === 'investigation' && <InvestigationTab investigation={patientInfo.investigation} patientId={params.id} />}
        </div>

        {showPopup && (
          <div className={styles.popup}>
            <div className={styles.popupContent}>
              <p>{popupMessage}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 