'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumb from '@/components/common/Breadcrumb';
import { patientService, Patient } from '@/services/patientService';
import { progressSheetService, ProgressSheet, ApiErrorResponse, ProgressSheetEntry } from '@/services/progressSheetService';
import styles from '@/styles/hourly-progress.module.css';

type PageParams = {
    id: string;
    date: string;
  };

interface TimeSlot {
  hour: number;
  time: string;
  displayTime: string;
  disabled?: boolean;
}

export default function HourlyProgressPageClient() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [progressSheet, setProgressSheet] = useState<ProgressSheet | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [filledHours, setFilledHours] = useState<string[]>([]);
  const isEnsuringSheetRef = useRef(false);
  const hasEnsuredForDateRef = useRef<string | null>(null);
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
    loadPatientDetails();
  }, [params.id]);

  useEffect(() => {
    // Reset ensure flag when date changes
    hasEnsuredForDateRef.current = null;
    isEnsuringSheetRef.current = false;
    setProgressSheet(null);
    setFilledHours([]);
  }, [params.date]);

  useEffect(() => {
    // Only ensure if we have patient, haven't ensured this date, and not currently ensuring
    if (patient?.id && !isEnsuringSheetRef.current && hasEnsuredForDateRef.current !== params.date) {
      ensureProgressSheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id, params.date]);

  const loadPatientDetails = async () => {
    try {
      const response = await patientService.getById(params.id);
      if (response.success && response.data) {
        setPatient(response.data as Patient);
      }
    } catch (err) {
      console.error('Error loading patient details:', err);
      setError('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const ensureProgressSheet = async (): Promise<ProgressSheet | null> => {
    // Double check guard (in case function is called directly)
    if (!patient || isEnsuringSheetRef.current || hasEnsuredForDateRef.current === params.date) {
      return progressSheet;
    }

    try {
      // Set flags immediately to prevent duplicate calls
      isEnsuringSheetRef.current = true;
      hasEnsuredForDateRef.current = params.date;
      setLoadingSheet(true);
      
      // Use the new ensure API that retrieves or creates the sheet in one call
      const response = await progressSheetService.ensureByDate(
        patient.id,
        params.date,
        patient.organisation_id || null
      );
      
      if (response.success && response.data) {
        const sheet = response.data as unknown as ProgressSheet;
        setProgressSheet(sheet);
        if (response.data?.entries) {
          const hours = response.data.entries.map((entry: ProgressSheetEntry) => entry.time);
          setFilledHours(hours);
        } else {
          setFilledHours([]);
        }
        return sheet;
      } else {
        setError('Failed to ensure progress sheet');
        // Reset the ensure flag so user can retry
        hasEnsuredForDateRef.current = null;
        return null;
      }
    } catch (err) {
      console.error('Error ensuring progress sheet:', err);
      setError('Failed to ensure progress sheet. Please try again.');
      // Reset the ensure flag so user can retry
      hasEnsuredForDateRef.current = null;
      return null;
    } finally {
      setLoadingSheet(false);
      isEnsuringSheetRef.current = false;
    }
  };

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    // Get current time in IST
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const selectedDate = new Date(params.date + 'T00:00:00');
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // Generate all 24 hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      let displayTime;
      if (i === 0) {
        displayTime = '12 AM';
      } else if (i < 12) {
        displayTime = `${i} AM`;
      } else if (i === 12) {
        displayTime = '12 PM';
      } else {
        displayTime = `${i - 12} PM`;
      }

      // If it's today, disable future hours
      const disabled = isToday && i > now.getHours();

      slots.push({
        hour: i,
        time: `${hour}:00`,
        displayTime,
        disabled
      });
    }
    return slots;
  };

  const isHourFilled = (timeStr: string) => {
    return filledHours.includes(timeStr);
  };

  const handleHourSelect = async (slot: TimeSlot) => {
    if (slot.disabled) return;
    
    // Ensure sheet exists before proceeding
    let sheet = progressSheet;
    if (!sheet) {
      sheet = await ensureProgressSheet();
      if (!sheet) {
        // Failed to ensure sheet, error is already set
        return;
      }
    }
    
    setSelectedHour(slot.time);
    
    // Navigate to view page (same for both existing and new entries)
    router.push(`/patients/${params.id}/progress-sheet/date/${params.date}/${sheet.sheet_id}/view/${slot.time}`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error || !patient) {
    return <div className={styles.error}>{error || 'Patient not found'}</div>;
  }

  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'Progress Sheet', href: `/patients/${params.id}/progress-sheet` },
    { label: params.date }
  ];

  const timeSlots = generateTimeSlots();

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <div className={styles.pageContainer}>
        <div className={styles.header}>
          <h1>Patient Details</h1>
          <div className={styles.headerInfo}>
            <span>Date: {new Date(params.date + 'T00:00:00').toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
            <span>DAY: {params.date ? Math.ceil((new Date(params.date + 'T00:00:00').getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24)) : ''}</span>
          </div>
        </div>

        <div className={styles.patientCard}>
          <div className={styles.patientIcon}>
            {/* <span className={styles.bedIcon}>🛏️</span> */}
            <BedIcon bedNumber={patient.organisation_icu_bed_number || 0} />
          </div>
          <div className={styles.patientDetails}>
          <div className={styles.patientInfo}>
            <div className={styles.infoRow}>

                <label>Patient Name:</label>
                <span>{patient.first_name} {patient.last_name}</span>
            </div>
            <div className={styles.infoRow}>
                <label>Patient ID:</label>
                <span>{patient.unique_id}</span>
            </div>
            
            <div className={styles.infoRow}>
              {/* <div> */}
                <label>Admission Date:</label>
                <span>{new Date(patient.admission_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>

            </div>
            <div className={styles.infoRow}>
              <label>UID No:</label>
              <span>{patient.uid_number}</span>
            </div>

            {/* <div className={styles.infoRow}>
              <div>
                <label>Blood Group:</label>
                <span>AB+</span>
              </div>
            </div> */}
{/* 
            <div className={styles.allergies}>
              <div>
                <label>Drug Allergy:</label>
                <span>Cefixime, Metamorphine</span>
              </div>
              <div>
                <label>Food Allergy:</label>
                <span>Rice</span>
              </div>
            </div> */}
            </div>
          </div>
        </div>

        <div className={styles.hourlyProgressSection}>
          <h2>Add Hourly Progress</h2>
          {loadingSheet ? (
            <div className={styles.creatingSheet}>Loading progress sheet...</div>
          ) : (
            <div className={styles.timeGrid}>
              {timeSlots.map((slot, index) => {
                const isFilled = isHourFilled(slot.time);
                return (
                  <button
                    key={index}
                    className={`${styles.timeSlot} ${isFilled ? styles.filled : ''} ${selectedHour === slot.time ? styles.active : ''} ${slot.disabled ? styles.disabled : ''}`}
                    onClick={() => handleHourSelect(slot)}
                    disabled={slot.disabled || loadingSheet}
                  >
                   <img src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/Group+1321315459.svg" alt="clock" className={styles.clockIcon} />
                    {/* <span className={styles.clockIcon}>⏰</span> */}
                    <span className={styles.timeText}>{slot.displayTime}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 