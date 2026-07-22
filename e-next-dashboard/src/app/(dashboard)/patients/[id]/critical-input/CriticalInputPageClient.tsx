'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { criticalityService, CriticalityItem } from '@/services/criticalityService';
import { patientService } from '@/services/patientService';
import Breadcrumb from '@/components/common/Breadcrumb';
import styles from '@/styles/patient-details/criticality/criticality.module.css';
import CriticalityCard from '@/components/patients/criticality/CriticalityCard';
import AddCriticalInputButton from '@/components/patients/criticality/AddCriticalInputButton';
import CriticalInputModal from '@/components/patients/criticality/CriticalInputModal';

type PageParams = {
  id: string;
};

export default function CriticalInputPageClient() {
  const params = useParams<PageParams>();
  const [criticalityData, setCriticalityData] = useState<CriticalityItem[]>([]);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const breadcrumbItems = [
    { label: 'Patients', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'Critical Input' }
  ];
  const BedIcon = ({ bedNumber }: { bedNumber: number }) => (
    <svg width="95" height="112" viewBox="0 0 95 112" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch patient data
        const patientResponse = await patientService.getById(params.id);
        setPatientData(patientResponse.data);

        // Fetch criticality data
        const criticalityResponse = await criticalityService.list({
          patient_id: params.id,
          page: 1,
          limit: 50,
          sort_order: 'desc'
        });
        
        setCriticalityData(criticalityResponse.data.items);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load criticality data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleModalOpen = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    // Refresh the criticality data after successful creation
    const fetchData = async () => {
      try {
        const criticalityResponse = await criticalityService.list({
          patient_id: params.id,
          page: 1,
          limit: 50,
          sort_order: 'desc'
        });
        
        setCriticalityData(criticalityResponse.data.items);
      } catch (err) {
        console.error('Error fetching updated data:', err);
      }
    };

    fetchData();
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading criticality data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <h2 style={{ fontSize: '24px', fontWeight: '500' }}>Critical Input</h2>
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Daily Round Sheet Style Header */}
      {patientData && (
        <>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.dateInfo}>
                <span>Date: {new Date().toLocaleDateString()}</span>
                <span>Day: {Math.ceil((new Date().getTime() - new Date(patientData.admission_date).getTime()) / (1000 * 60 * 60 * 24))}</span>
              </div>
            </div>
            <AddCriticalInputButton patientId={params.id} onClick={handleModalOpen} />
          </div>

          <div className={styles.patientCard}>
            <div className={styles.patientIcon}>
              <BedIcon bedNumber={patientData.organisation_icu_bed_number || 0} />
            </div>
            
            <div className={styles.patientInfo}>
              <div className={styles.infoRow}>
                <label>Patient Name:</label>
                <span>{patientData.first_name} {patientData.last_name}</span>
              </div>
              <div className={styles.infoRow}>
                <label>Patient ID:</label>
                <span>{patientData.unique_id}</span>
              </div>
              <div className={styles.infoRow}>
                <label>Admission Date:</label>
                <span>{new Date(patientData.admission_date).toLocaleDateString()}</span>
              </div>
              <div className={styles.infoRow}>
                <label>Latest Entry Date:</label>
                <span>{criticalityData.length > 0 ? new Date(criticalityData[0].date).toLocaleDateString() : 'No entries'}</span>
              </div>
              <div className={styles.infoRow}>
                <label>Latest Entry Time:</label>
                <span>{criticalityData.length > 0 ? new Date(criticalityData[0].date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'No entries'}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Critical Entries */}
      <div className={styles.criticalEntriesContainer}>
        {criticalityData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>No critical entries found for this patient.</p>
          </div>
        ) : (
          criticalityData.map((entry, index) => (
            <CriticalityCard 
              key={entry.id} 
              entry={entry} 
              entryNumber={index + 1}
            />
          ))
        )}
      </div>

      {/* Critical Input Modal */}
      <CriticalInputModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        patientId={params.id}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
