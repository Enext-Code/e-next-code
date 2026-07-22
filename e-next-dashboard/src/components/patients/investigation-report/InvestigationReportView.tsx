'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { patientService, Patient } from '@/services/patientService';
import styles from '@/styles/investigation-report/investigation-report.module.css';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function InvestigationReportView() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  const { user } = useAuth();
  
  const [selectedPatient, setSelectedPatient] = useState(patientId || '');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })
  );
  const [selectedDay, setSelectedDay] = useState('1');
  const [daysSinceAdmission, setDaysSinceAdmission] = useState(1);
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
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
  // First load the initial patient details
  useEffect(() => {
    if (patientId) {
      loadPatientDetails(patientId);
    }
  }, [patientId]);

  // Then load all patients once we have the organization ID
  useEffect(() => {
    if (patientDetails?.organisation_id) {
      loadPatients(patientDetails.organisation_id);
    }
  }, [patientDetails?.organisation_id]);

  // Handle patient selection changes
  useEffect(() => {
    if (selectedPatient && selectedPatient !== patientId) {
      loadPatientDetails(selectedPatient);
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (patientDetails?.admission_date) {
      let referenceDate: Date;
      let endDate: Date;
      
      // If status is not "admission", use status_change_datetime as end date
      if (patientDetails.status !== 'admission' && patientDetails.status_change_datetime) {
        // Backend provides IST dates, parse them directly
        referenceDate = new Date(patientDetails.admission_date);
        endDate = new Date(patientDetails.status_change_datetime);
      } else {
        // If status is "admission", use admission_date to today (in IST)
        referenceDate = new Date(patientDetails.admission_date);
        // Get current date in IST
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        endDate = new Date(now.getTime() + istOffset);
      }
      
      // Calculate difference in IST days
      const refDateOnly = new Date(referenceDate.toISOString().split('T')[0]);
      const endDateOnly = new Date(endDate.toISOString().split('T')[0]);
      const diffTime = Math.abs(endDateOnly.getTime() - refDateOnly.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      setDaysSinceAdmission(diffDays);
      setSelectedDay(diffDays.toString());
    }
  }, [patientDetails]);

  const loadPatients = async (organisationId: string) => {
    try {
      setLoading(true);
      const response = await patientService.list({
        organisation_id: organisationId,
        limit: 1000,
        sort_order: 'desc',
        page: 1
      });
      
      if (response.success && response.data?.items) {
        setPatients(response.data.items);
      } else {
        setError('Failed to load patients');
      }
    } catch (err) {
      console.error('Error loading patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await patientService.getById(id);
      if (response.success && response.data) {
        // Validate and cast gender
        const validGenders = ['male', 'female', 'other'] as const;
        const gender = validGenders.includes(response.data.gender as any) 
          ? response.data.gender as 'male' | 'female' | 'other'
          : 'other';

        // Validate and cast criticality
        const validCriticality = ['red', 'yellow', 'green', 'black'] as const;
        const criticality = validCriticality.includes(response.data.criticality as any)
          ? response.data.criticality as 'red' | 'yellow' | 'green' | 'black'
          : 'red';

        // Validate and cast triage
        const validTriage = ['emergent', 'urgent', 'non-urgent'] as const;
        const triage = validTriage.includes(response.data.triage as any)
          ? response.data.triage as 'emergent' | 'urgent' | 'non-urgent'
          : 'emergent';
          
        setPatientDetails({
          ...response.data,
          gender,
          criticality,
          triage
        } as Patient);
      } else {
        setError('Failed to load patient details');
      }
    } catch (err) {
      console.error('Error loading patient details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const getDateForDay = (daysAgo: number) => {
    if (!patientDetails?.admission_date) return '';
    
    // Backend provides IST dates, parse them directly
    const referenceDate = new Date(patientDetails.admission_date);
    
    // Calculate the actual date for the selected day
    const dayIndex = daysSinceAdmission - daysAgo - 1; // -1 because we want 0-based index
    const date = new Date(referenceDate);
    date.setDate(date.getDate() + dayIndex);
    
    // Return date in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  };

  const handleDaySelect = (daysAgo: number) => {
    if (!selectedPatient) {
      setError('Please select a patient first');
      return;
    }
    const selectedDate = getDateForDay(daysAgo);
    setSelectedDate(selectedDate);
    setSelectedDay((daysSinceAdmission - daysAgo).toString());
    router.push(`/patients/${selectedPatient}/investigation-report/date/${selectedDate}`);
  };

  // Handle patient selection from dropdown
  const handlePatientChange = (newPatientId: string) => {
    setSelectedPatient(newPatientId);
    // Update URL to reflect new patient selection
    router.push(`/patients/${newPatientId}/investigation-report`);
  };

  if (loading && !patientDetails) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Patient Selector */}
        <div className={styles.selector}>
          <label>Select Patient</label>
          <select 
            value={selectedPatient}
            onChange={(e) => handlePatientChange(e.target.value)}
          >
            <option value="">Select a patient</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.unique_id} - {patient.first_name} {patient.last_name} - Bed no {patient.organisation_icu_bed_number}
              </option>
            ))}
          </select>
        </div>

        {/* Patient Details Card */}
        {patientDetails && (
          <div className={styles.patientCard}>
            <div className={styles.patientIcon}>
              {/* <span className={styles.bedIcon}>🛏️</span> */}
              <BedIcon bedNumber={patientDetails.organisation_icu_bed_number || 0} />
            </div>
            
            <div className={styles.patientInfo}>
              <div className={styles.infoRow}>
                  <label>Patient Name:</label>
                  <span>{patientDetails.first_name} {patientDetails.last_name}</span>
              </div>
              <div className={styles.infoRow}>
                
                  <label>Patient ID:</label>
                  <span>{patientDetails.unique_id}</span>
                </div>
              <div className={styles.infoRow}>
                  <label>Admission Date:</label>
                  <span>{new Date(patientDetails.admission_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
                
              </div>
              
              <div className={styles.infoRow}>
                  <label>UID No:</label>
                  <span>{patientDetails.uid_number}</span>
                </div>
            </div>
          </div>
        )}

        {/* Date Selector */}
        {patientDetails && (
          <>
            <div className={styles.dateSelector}>
              <div className={styles.dateHeader}>
                <span>Select Day</span>
                <div>
                  <span>Date: {selectedDate}</span>
                  <span>Day: {selectedDay}</span>
                </div>
              </div>
              
              <div className={styles.dateTabs}>
                {Array.from({ length: Math.min(daysSinceAdmission, 100) }, (_, i) => {
                  const dayNumber = daysSinceAdmission - i;
                  
                  // Get the actual date for this button
                  const actualDate = getDateForDay(i);
                  const dateObj = new Date(actualDate);
                  
                  // Determine button text based on patient status
                  let buttonText: string;
                  if (patientDetails.status === 'admission') {
                    // For admission status, use traditional labels
                    buttonText = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `Day ${dayNumber}`;
                  } else {
                    // For non-admission status, show actual dates
                    buttonText = dateObj.toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: '2-digit',
                      year: 'numeric'
                    });
                  }
                  
                  const isActive = selectedDay === dayNumber.toString();
                  return (
                    <button 
                      key={i}
                      className={isActive ? styles.dateTabActive : ''}
                      onClick={() => handleDaySelect(i)}
                    >
                      <Image 
                        src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/Group+1321315459(1).svg" 
                        alt="calendar" 
                        width={48} 
                        height={48} 
                      />
                      {buttonText}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            {/* <div className={styles.quickActions}>
              <h3>Quick Actions</h3>
              <div className={styles.actionGrid}>
                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>📊</div>
                  <span>Investigation Report</span>
                  <button className={styles.actionButton}>↗</button>
                </div>
                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>📝</div>
                  <span>Daily Round Sheet</span>
                  <button className={styles.actionButton}>↗</button>
                </div>
                <div className={styles.actionCard}>
                  <div className={styles.actionIcon}>📤</div>
                  <span>Discharge</span>
                  <button className={styles.actionButton}>↗</button>
                </div>
              </div>
            </div> */}
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
} 