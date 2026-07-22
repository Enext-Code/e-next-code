'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import jsPDF from "jspdf";
import Link from 'next/link';

import Breadcrumb from '@/components/common/Breadcrumb';
import { patientService, Patient } from '@/services/patientService';
import { progressSheetService, ProgressSheet, ProgressSheetEntry, ProgressSheetListParams } from '@/services/progressSheetService';
import { catheterService, CatheterEntry } from '@/services/catheterService';
import { investigationReportService } from '@/services/investigationReportService';
import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';

interface DailyRoundSheetData {
  id: string;
  sheet_id: string;
  patient_id: string;
  date: string;
  prescription: string;
  progress_sheet_id: string;
  progress_sheet_datetime: string;
  investigation_report_id: string;
  current_issue: string;
  current_treatment: string;
  created_at: string;
  updated_at: string;
}
import FluidForm, { FluidData } from '@/components/forms/FluidForm';
import VitalsForm, { VitalsData } from '@/components/daily-round-progress-sheet/VitalsForm';
import RespiratoryForm, { RespiratoryData } from '@/components/daily-round-progress-sheet/RespiratoryForm';
import CatheterForm, { CatheterData } from '@/components/daily-round-progress-sheet/CatheterForm';
import CatheterEditModal from '@/components/forms/CatheterEditModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import styles from '@/styles/components/daily-round-sheet/daily-round-sheet.module.css';
import planStyles from '@/styles/plan-fields.module.css';
import GCSForm, { GCSData } from '@/components/forms/GCSForm';

type PageParams = {
    id: string;
    date: string;
    sheetId: string;
    time: string;
  };
  
export default function ProgressSheetViewPageTimeClient() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [entry, setEntry] = useState<ProgressSheetEntry | null>(null);
  const [catheterData, setCatheterData] = useState<CatheterData | null>(null);
  const [editingCatheter, setEditingCatheter] = useState<CatheterEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [catheterToDelete, setCatheterToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [planData, setPlanData] = useState<DailyRoundSheetData[]>([]);
  const planFormRef = useRef<HTMLDivElement>(null);

  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [planFormData, setPlanFormData] = useState({
    prescription: '',
    current_issue: '',
    current_treatment: ''
  });
  const [editFormData, setEditFormData] = useState({
    prescription: '',
    current_issue: '',
    current_treatment: ''
  });
  const [savingPlan, setSavingPlan] = useState(false);
  const [latestInvestigationReportDate, setLatestInvestigationReportDate] = useState<string | null>(null);
  const [apacheScore, setApacheScore] = useState<{ apache_ii_score: number; predicted_mortality_percent: number } | null>(null);
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
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load patient details
      const patientResponse = await patientService.getById(params.id);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data as unknown as Patient);
      }

      // Load latest progress sheet for the patient
      const sheetResponse = await progressSheetService.list({
        patient_id: params.id,
        page: 1,
        limit: 1,
        sort_order: 'desc'
      });
      
      if (sheetResponse.success && sheetResponse.data && sheetResponse.data.items.length > 0) {
        const latestSheet = sheetResponse.data.items[0];
        // // console.log('Latest progress sheet:', latestSheet);
        
        // Get the latest entry from the sheet
        if (latestSheet.entries && latestSheet.entries.length > 0) {
          const latestEntry = latestSheet.entries[latestSheet.entries.length - 1];
          setEntry(latestEntry);
        } else {
          // Initialize with empty entry if no entries exist (IST time)
          const emptyEntry: ProgressSheetEntry = {
            time: new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Kolkata'
            }),
            recorded_by: null,
            recorded_at: null,
            gcs: null,
            fluid: null,
            vitals: null,
            blood_gas: null,
            respiratory: null,
            catheter: null
          };
          setEntry(emptyEntry);
        }
      } else {
        // Initialize with empty entry if no sheet exists (IST time)
        const emptyEntry: ProgressSheetEntry = {
          time: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
          }),
          recorded_by: null,
          recorded_at: null,
          gcs: null,
          fluid: null,
          vitals: null,
          blood_gas: null,
          respiratory: null,
          catheter: null
        };
        setEntry(emptyEntry);
      }

      // Load catheter data separately
      await reloadCatheterData();

      // Load plan data (investigation report)
      await loadPlanData();

      // Load latest investigation report date for link
      await loadLatestInvestigationReportDate();

      // Load last Apache score
      await loadApacheScore();
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadApacheScore = async () => {
    try {
      const response = await fetchApi<{ apache_ii_score: number; predicted_mortality_percent: number }>(
        API_ENDPOINTS.PATIENT.APACHE_II.LAST(params.id),
        { method: 'GET' }
      );
      if (response.success && response.data) {
        setApacheScore(response.data as unknown as { apache_ii_score: number; predicted_mortality_percent: number });
      }
    } catch {
      // No Apache score available — that's fine
    }
  };

  const loadPlanData = async () => {
    try {
      const planResponse = await investigationReportService.getDailyRoundSheetsList(params.id, {
        page: 1,
        limit: 100,
        sort_order: 'desc'
      });
      
      if (planResponse.success && planResponse.data) {
        const responseData = planResponse.data as any;
        if (responseData.items) {
          setPlanData(responseData.items as DailyRoundSheetData[]);
          // // console.log('Plan data loaded:', responseData.items);
        }
      }
    } catch (err) {
      console.error('Error loading plan data:', err);
      // Don't set error state for plan data as it's optional
    }
  };

  const loadLatestInvestigationReportDate = async () => {
    try {
      const investigationResponse = await investigationReportService.listInvestigationReports(params.id, {
        page: 1,
        limit: 1,
        sort_order: 'desc'
      });

      if (investigationResponse.success && investigationResponse.data?.items?.[0]) {
        const latestReport = investigationResponse.data.items[0];
        // Extract date from analysis_date (format: YYYY-MM-DD)
        if (latestReport.analysis_date) {
          // Check if already in YYYY-MM-DD format
          if (/^\d{4}-\d{2}-\d{2}$/.test(latestReport.analysis_date)) {
            setLatestInvestigationReportDate(latestReport.analysis_date);
          } else {
            // Parse ISO date string and extract YYYY-MM-DD
            const date = new Date(latestReport.analysis_date);
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            setLatestInvestigationReportDate(formattedDate);
          }
        }
      }
    } catch (err) {
      console.error('Error loading latest investigation report date:', err);
      // Don't set error state as this is optional
    }
  };

  const reloadCatheterData = async () => {
    try {
      const catheterResponse = await catheterService.getByPatientId(params.id);
      // // console.log('Reloading catheter data:', catheterResponse);
      if (catheterResponse.success && catheterResponse.data) {
        // The API response has nested data structure: response.data.data.items
        const items = catheterResponse.data.items || [];
        // // console.log('Found items:', items);
        const catheterEntries = items.map((item: any) => ({
          id: item.id,
          type: item.type,
          catheter_type: item.catheter_type,
          size: item.size,
          site: item.site,
          date_of_insertion: item.date_of_insertion,
          date_of_removal: item.date_of_removal,
          days_in_use: null, // Will be calculated dynamically
          notes: item.notes
        }));
        
        // Force a new object reference to ensure React detects the change
        const newCatheterData = { entries: [...catheterEntries] };
        setCatheterData(newCatheterData);
        // // console.log('Updated catheter data:', newCatheterData);
        // // console.log('Current catheterData state should now have', catheterEntries.length, 'entries');
      } else {
        // // console.log('No catheter data found, setting empty array');
        setCatheterData({ entries: [] });
      }
    } catch (error) {
      console.error('Failed to reload catheter data:', error);
    }
  };

  const handleCatheterEdit = (catheter: CatheterEntry) => {
    setEditingCatheter(catheter);
    setIsModalOpen(true);
  };

  const handleCatheterDelete = (catheterId: string) => {
    setCatheterToDelete(catheterId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!catheterToDelete) return;

    try {
      // // console.log('Deleting catheter:', catheterToDelete);
      await catheterService.delete(catheterToDelete);
      // // console.log('Catheter deleted successfully, reloading data...');
      await reloadCatheterData();
    } catch (error) {
      console.error('Failed to delete catheter:', error);
    } finally {
      setIsDeleteModalOpen(false);
      setCatheterToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setCatheterToDelete(null);
  };

  const handleCatheterAdd = () => {
    setEditingCatheter(null);
    setIsModalOpen(true);
  };

  const handleCatheterSave = async (catheter: CatheterEntry) => {
    try {
      // Set days_in_use to null since it will be calculated on the backend
      const catheterDataForApi = { ...catheter, days_in_use: null };
      
      if (editingCatheter && editingCatheter.id) {
        // Update existing catheter
        // // console.log('Updating catheter:', editingCatheter.id, catheterDataForApi);
        await catheterService.update(editingCatheter.id, catheterDataForApi);
      } else {
        // Create new catheter
        // // console.log('Creating new catheter:', catheterDataForApi);
        await catheterService.create(params.id, { entries: [catheterDataForApi] });
      }
      
      // // console.log('Catheter saved successfully, reloading data...');
      await reloadCatheterData();
      
      setIsModalOpen(false);
      setEditingCatheter(null);
    } catch (error) {
      console.error('Failed to save catheter:', error);
    }
  };

  

  const renderGCSContent = () => {
    // Early return if no entry exists
    if (!entry) return null;

    // Initialize with empty values when no data exists
    const gcsData: GCSData = {
      values: entry.gcs?.values ?? {
        "Eye Opening": null,
        "Verbal Response": null,
        "Motor Response": null,
        "Right Pupil Size": null,
        "Right Pupil Reaction": null,
        "Left Pupil Size": null,
        "Left Pupil Reaction": null,
        "Pupil Type": null,
        "Sedation": false,
        "Pain": false,
        "RUL": null,
        "LUL": null,
        "LLL": null,
        "RLL": null
      }
    };

    return (
      <GCSForm
        initialValues={gcsData}
        time={entry.time}
        isViewMode={true}
        onSubmit={() => {}}
      />
    );
  };

  const renderFluidContent = () => {
    if (!entry) return null;

    const fluidData: FluidData = entry.fluid ?? {
      infusions: [],
      other_infusions: [],
      intakes: [],
      colloids: [],
      crystalloids: [],
      oral_intakes: [],
      ryles_tubes: [],
      outputs: [],
      urines: [],
      drainages: [],
      total_input: null,
      total_output: null,
      cumulative_balance: null
    };

    return (
      <FluidForm
        initialValues={fluidData}
        time={entry.time}
        isViewMode={true}
        onSubmit={() => {}}
      />
    );
  };

  const renderVitalsContent = () => {
    if (!entry) return null;

    const vitalsData: VitalsData = entry.vitals ?? {
      values: {
        "Heart Rate": null,
        "Rythm": null,
        "Temp Oral": null,
        "CVP": null,
        "Systolic": null,
        "Diastolic": null
      }
    };

    return (
      <VitalsForm
        initialValues={vitalsData}
        time={entry.time}
        isViewMode={true}
        onSubmit={() => {}}
      />
    );
  };
  const renderRespiratoryContent = () => {
    if (!entry) return null;

    const respiratoryData: RespiratoryData = entry.respiratory ?? {
      values: {
        "Vent Mode": null,
        "Rate": null,
        "FiO2": null,
        "PEEP": null,
        "Set": null,
        "Dalta P (P Plat PEEP)": null,
        "AW Pressure": null,
        "Ins %": null,
        "Peak Pressure": null,
        "Plateau Pressure": null,
        "Remarks": null
      }
    };

    return (
      <RespiratoryForm
        initialValues={respiratoryData}
        time={entry.time}
        isViewMode={true}
        onSubmit={() => {}}
      />
    );
  };

  const renderCatheterContent = () => {
    if (!entry) return null;

    const currentCatheterData: CatheterData = catheterData ?? {
      entries: []
    };

    // // console.log('Rendering catheter content with data:', currentCatheterData);
    // // console.log('Number of entries being rendered:', currentCatheterData.entries.length);

    return (
      <>
        <CatheterForm
          initialValues={currentCatheterData}
          isViewMode={true}
          onSubmit={() => {}}
          onEdit={handleCatheterEdit}
          onDelete={handleCatheterDelete}
          onAdd={handleCatheterAdd}
        />
        <CatheterEditModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCatheter(null);
          }}
          catheter={editingCatheter}
          onSave={handleCatheterSave}
        />
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="Delete Catheter"
          message="Are you sure you want to delete this catheter? This action cannot be undone."
        />
      </>
    );
  };


  const handlePlanEdit = async (sheetId: string) => {
    try {
      const response = await investigationReportService.getDailyRoundSheetBySheetId(sheetId);
      
      if (response.success && response.data) {
        const sheetData = response.data as any;
        setEditFormData({
          prescription: sheetData.prescription || '',
          current_issue: sheetData.current_issue || '',
          current_treatment: sheetData.current_treatment || ''
        });
        setEditingSheetId(sheetData.sheet_id);
        // Scroll to the edit form
        setTimeout(() => {
          planFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else {
        alert('Failed to load plan data: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Failed to load plan data: ' + error);
    }
  };



const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const downloadPrescriptionPDF = (plan: DailyRoundSheetData, index: number) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PLAN OF THE DAY', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Confidential — For clinical use only', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 12;

    const addSection = (title: string, content: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(title, 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content || 'Not recorded', 182);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 8;
    };

    if (patient) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(
        `Patient: ${patient.first_name} ${patient.last_name}  |  ID: ${patient.unique_id}`,
        14,
        y
      );
      y += 10;
    }

    addSection(`Plan of Day ${index + 1}`, plan.prescription);
    addSection('Current Issue', plan.current_issue);
    addSection('Current Treatment', plan.current_treatment);

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      14,
      285
    );

    doc.save(`Plan-Day-${index + 1}-${patient?.unique_id || 'patient'}.pdf`);
  };

  const downloadFullDailyRoundPDF = async () => {
    if (!patient || !entry) return;

    let organisationName = '';
    let organisationLocation = '';
    if (patient.organisation_id) {
      try {
        const orgResponse = await fetchApi<{ name?: string; location?: string }>(
          `/api/v1/organisations/organisations/detail?organisation_id=${patient.organisation_id}`
        );
        const orgData = (orgResponse as any)?.data ?? orgResponse;
        organisationName = orgData?.name || '';
        organisationLocation = orgData?.location || '';
      } catch (err) {
        console.error('Failed to load organisation for PDF:', err);
      }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    let y = 16;

    const ensureSpace = (needed = 20) => {
      if (y + needed > 280) {
        doc.addPage();
        y = 16;
      }
    };

    const drawDivider = () => {
      ensureSpace(6);
      doc.setDrawColor(180);
      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;
    };

    const addHeading = (title: string) => {
      ensureSpace(14);
      doc.setFillColor(35, 55, 90);
      doc.rect(marginX, y - 4, contentWidth, 8, 'F');
      doc.setTextColor(255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, marginX + 2, y + 1.5);
      doc.setTextColor(0);
      y += 10;
    };

    const addKeyValueRows = (rows: Array<[string, string]>, columns = 2) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const colWidth = contentWidth / columns;
      for (let i = 0; i < rows.length; i += columns) {
        ensureSpace(8);
        for (let c = 0; c < columns; c++) {
          const row = rows[i + c];
          if (!row) continue;
          const x = marginX + c * colWidth;
          doc.setFont('helvetica', 'bold');
          doc.text(`${row[0]}:`, x, y);
          doc.setFont('helvetica', 'normal');
          const valueLines = doc.splitTextToSize(row[1], colWidth - 4);
          doc.text(valueLines, x, y + 4);
        }
        y += 12;
      }
    };

    const addWrappedBlock = (label: string, text: string) => {
      ensureSpace(16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, marginX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text || 'Not recorded', contentWidth);
      ensureSpace(lines.length * 4.5 + 4);
      doc.text(lines, marginX, y);
      y += lines.length * 4.5 + 6;
    };

    // ——— Header ———
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(35, 55, 90);
    doc.text('ICU DAILY ROUND SHEET', pageWidth / 2, y, { align: 'center' });
    y += 6;
    if (organisationName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(organisationName, pageWidth / 2, y, {
        align: 'center',
      });
      y += 5;
      if (organisationLocation) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(organisationLocation, pageWidth / 2, y, {
          align: 'center',
        });
        y += 5;
      }
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Clinical progress note — Confidential patient information', pageWidth / 2, y, {
      align: 'center',
    });
    doc.setTextColor(0);
    y += 8;
    drawDivider();

    const dayNumber = Math.ceil(
      (new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getTime() -
        new Date(patient.admission_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const reportDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

    addHeading('PATIENT IDENTIFICATION');
    addKeyValueRows([
      ['Patient Name', `${patient.first_name} ${patient.last_name}`],
      ['Patient ID', patient.unique_id || '—'],
      ['Organisation', formatValue(organisationName)],
      ['Location', formatValue(organisationLocation)],
      ['Bed No', formatValue(patient.organisation_icu_bed_number)],
      ['ICU', formatValue(patient.organisation_icu_name)],
      ['Admission Date', patient.admission_date
        ? new Date(patient.admission_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })
        : '—'],
      ['Hospital Day', String(dayNumber)],
      ['Report Date', reportDate],
      ['Latest Entry Time', entry.time || '—'],
    ]);

    if (apacheScore) {
      addKeyValueRows([
        ['APACHE II Score', String(apacheScore.apache_ii_score)],
        ['Predicted Mortality', `${apacheScore.predicted_mortality_percent.toFixed(2)}%`],
      ]);
    }
    drawDivider();

    // ——— GCS ———
    addHeading('GCS & POWER');
    const gcs = entry.gcs?.values ?? {};
    addKeyValueRows([
      ['Eye Opening', formatValue((gcs as any)['Eye Opening'])],
      ['Verbal Response', formatValue((gcs as any)['Verbal Response'])],
      ['Motor Response', formatValue((gcs as any)['Motor Response'])],
      ['Sedation', formatValue((gcs as any)['Sedation'])],
      ['Pain', formatValue((gcs as any)['Pain'])],
      ['Pupil Type', formatValue((gcs as any)['Pupil Type'])],
      ['Right Pupil Size', formatValue((gcs as any)['Right Pupil Size'])],
      ['Right Pupil Reaction', formatValue((gcs as any)['Right Pupil Reaction'])],
      ['Left Pupil Size', formatValue((gcs as any)['Left Pupil Size'])],
      ['Left Pupil Reaction', formatValue((gcs as any)['Left Pupil Reaction'])],
      // ['RUL', formatValue((gcs as any)['RUL'])],
      // ['LUL', formatValue((gcs as any)['LUL'])],
      // ['RLL', formatValue((gcs as any)['RLL'])],
      // ['LLL', formatValue((gcs as any)['LLL'])],
    ]);
    drawDivider();

    // ——— Fluid ———
    addHeading('FLUID BALANCE (INPUT / OUTPUT)');
    const fluid = entry.fluid;
    addKeyValueRows([
      ['Total Input', formatValue(fluid?.total_input)],
      ['Total Output', formatValue(fluid?.total_output)],
      ['Cumulative Balance', formatValue(fluid?.cumulative_balance)],
    ]);
    drawDivider();

    // ——— Vitals ———
    addHeading('VITALS');
    const vitals = entry.vitals?.values ?? {};
    addKeyValueRows([
      ['Heart Rate', formatValue((vitals as any)['Heart Rate'])],
      ['Rhythm', formatValue((vitals as any)['Rythm'] ?? (vitals as any)['Rhythm'])],
      ['Temp Oral', formatValue((vitals as any)['Temp Oral'])],
      ['CVP', formatValue((vitals as any)['CVP'])],
      ['Systolic', formatValue((vitals as any)['Systolic'])],
      ['Diastolic', formatValue((vitals as any)['Diastolic'])],
    ]);
    drawDivider();

    // ——— Respiratory ———
    addHeading('RESPIRATORY / VENTILATOR');
    const resp = entry.respiratory?.values ?? {};
    addKeyValueRows([
      ['Vent Mode', formatValue((resp as any)['Vent Mode'])],
      ['Rate', formatValue((resp as any)['Rate'])],
      ['FiO2', formatValue((resp as any)['FiO2'])],
      ['PEEP', formatValue((resp as any)['PEEP'])],
      ['Set', formatValue((resp as any)['Set'])],
      ['Delta P', formatValue((resp as any)['Dalta P (P Plat PEEP)'])],
      ['AW Pressure', formatValue((resp as any)['AW Pressure'])],
      ['Ins %', formatValue((resp as any)['Ins %'])],
      ['Peak Pressure', formatValue((resp as any)['Peak Pressure'])],
      ['Plateau Pressure', formatValue((resp as any)['Plateau Pressure'])],
    ]);
    if ((resp as any)['Remarks']) {
      addWrappedBlock('Remarks', formatValue((resp as any)['Remarks']));
    }
    drawDivider();

    // ——— Catheter ———
    addHeading('CATHETERS');
    const catheters = catheterData?.entries ?? [];
    if (catheters.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No catheter entries recorded.', marginX, y);
      y += 8;
    } else {
      catheters.forEach((c, idx) => {
        ensureSpace(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`${idx + 1}. ${c.type || c.catheter_type || 'Catheter'}`, marginX, y);
        y += 5;
        addKeyValueRows(
          [
            ['Size', formatValue(c.size)],
            ['Site', formatValue(c.site)],
            [
              'Inserted',
              c.date_of_insertion
                ? new Date(c.date_of_insertion).toLocaleDateString('en-GB')
                : '—',
            ],
            [
              'Removed',
              c.date_of_removal
                ? new Date(c.date_of_removal).toLocaleDateString('en-GB')
                : 'In situ',
            ],
          ],
          2
        );
        if (c.notes) addWrappedBlock('Notes', c.notes);
      });
    }
    drawDivider();

    // ——— Plans ———
    addHeading('PLAN OF THE DAY');
    if (planData.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No plans recorded for this patient.', marginX, y);
      y += 8;
    } else {
      planData.forEach((plan, index) => {
        ensureSpace(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Plan ${index + 1}`, marginX, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90);
        doc.text(
          `Date: ${new Date(plan.date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          marginX,
          y
        );
        doc.setTextColor(0);
        y += 6;
        addWrappedBlock('Prescription / Plan', plan.prescription);
        addWrappedBlock('Current Issue', plan.current_issue);
        addWrappedBlock('Current Treatment', plan.current_treatment);
        if (index < planData.length - 1) drawDivider();
      });
    }

    // ——— Signature block ———
    // ensureSpace(40);
    // y += 6;
    // drawDivider();
    // doc.setFont('helvetica', 'bold');
    // doc.setFontSize(9);
    // doc.text('Clinician attestation', marginX, y);
    // y += 14;
    // doc.setFont('helvetica', 'normal');
    // doc.setFontSize(9);
    // doc.text('Name & Signature: _______________________________', marginX, y);
    // y += 10;
    // doc.text('Designation: ____________________    Date/Time: ____________________', marginX, y);

    // Page footers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  ${patient.unique_id}  |  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
      doc.setTextColor(0);
    }

    const safeName = `${patient.first_name}_${patient.last_name}`.replace(/\s+/g, '_');
    doc.save(`Daily-Round-${patient.unique_id || safeName}-${reportDate.replace(/\//g, '-')}.pdf`);
  };

  const handleEditCancel = () => {
    setEditFormData({
      prescription: '',
      current_issue: '',
      current_treatment: ''
    });
    setEditingSheetId(null);
  };

  const handleCreateCancel = () => {
    setPlanFormData({
      prescription: '',
      current_issue: '',
      current_treatment: ''
    });
  };

  const handlePlanCreate = async () => {
    if (!patient) {
      alert('Patient data not available');
      return;
    }

    try {
      setSavingPlan(true);
      
      const sheetResponse = await progressSheetService.list({
        patient_id: params.id,
        page: 1,
        limit: 1,
        sort_order: 'desc'
      });

      const investigationResponse = await investigationReportService.listInvestigationReports(params.id, {
        page: 1,
        limit: 1,
        sort_order: 'desc'
      });

      const latestSheet = sheetResponse.success && sheetResponse.data?.items?.[0] ? sheetResponse.data.items[0] : null;
      const latestReport = investigationResponse.success && investigationResponse.data?.items?.[0] ? investigationResponse.data.items[0] : null;

      const createResponse = await investigationReportService.createDailyRoundSheet(
        patient.organisation_id || null,
        {
          patient_id: params.id,
          date: new Date().toISOString(),
          prescription: planFormData.prescription,
          current_issue: planFormData.current_issue,
          current_treatment: planFormData.current_treatment,
          progress_sheet_id: latestSheet?.id || '',
          progress_sheet_datetime: latestSheet?.date || new Date().toISOString(),
          investigation_report_id: latestReport?.id || ''
        }
      );

      if (createResponse.success) {
        setPlanFormData({
          prescription: '',
          current_issue: '',
          current_treatment: ''
        });
        await loadPlanData();
      } else {
        alert('Failed to create plan data');
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      alert('Failed to save plan data');
    } finally {
      setSavingPlan(false);
    }
  };

  const handlePlanUpdate = async () => {
    if (!patient || !editingSheetId) {
      alert('Patient data not available');
      return;
    }

    try {
      setSavingPlan(true);
      
      const updateResponse = await investigationReportService.updateDailyRoundSheet(
        editingSheetId,
        {
          prescription: editFormData.prescription,
          current_issue: editFormData.current_issue,
          current_treatment: editFormData.current_treatment
        }
      );

      if (updateResponse.success) {
        alert('Plan updated successfully!');
        setEditFormData({
          prescription: '',
          current_issue: '',
          current_treatment: ''
        });
        setEditingSheetId(null);
        await loadPlanData();
      } else {
        alert('Failed to update plan data: ' + (updateResponse.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to save plan data');
    } finally {
      setSavingPlan(false);
    }
  };

  const renderCreatePlanForm = () => {
    return (
      <div className={styles.inlinePlanForm}>
        <div className={styles.inlinePlanFormHeader}>
          <h3>Create New Plan of the Day</h3>
        </div>
        
        <div className={styles.inlinePlanFormBody}>
          <div className={planStyles.planField}>
            <label className={planStyles.planFieldLabel}>Plan of the Day:</label>
            <div className={planStyles.planFieldContent}>
              <textarea
                value={planFormData.prescription}
                onChange={(e) => setPlanFormData(prev => ({ ...prev, prescription: e.target.value }))}
                className={planStyles.planTextarea}
                rows={6}
                placeholder="Enter plan of the day..."
              />
            </div>
          </div>
          
          <div className={planStyles.planField}>
            <div className={planStyles.planFieldContent}>
              <label className={planStyles.planFieldLabel}>Current Issue:</label>
              <textarea
                value={planFormData.current_issue}
                onChange={(e) => setPlanFormData(prev => ({ ...prev, current_issue: e.target.value }))}
                className={planStyles.planTextarea}
                rows={4}
                placeholder="Enter current issue..."
              />
            </div>
          </div>
          
          <div className={planStyles.planField}>
            <div className={planStyles.planFieldContent}>
              <label className={planStyles.planFieldLabel}>Current Treatment:</label>
              <textarea
                value={planFormData.current_treatment}
                onChange={(e) => setPlanFormData(prev => ({ ...prev, current_treatment: e.target.value }))}
                className={planStyles.planTextarea}
                rows={4}
                placeholder="Enter current treatment..."
              />
            </div>
          </div>

          <div className={planStyles.planModalActions}>
            <button
              type="button"
              onClick={handleCreateCancel}
              className={planStyles.cancelButton}
              disabled={savingPlan}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePlanCreate}
              className={planStyles.saveButton}
              disabled={savingPlan}
            >
              {savingPlan && !editingSheetId ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditPlanForm = () => {
    return (
      <div ref={planFormRef} className={styles.inlinePlanForm}>
        <div className={styles.inlinePlanFormHeader}>
          <h3>Edit Plan of the Day</h3>
        </div>
        
        <div className={styles.inlinePlanFormBody}>
          <div className={planStyles.planField}>
            <label className={planStyles.planFieldLabel}>Plan of the Day:</label>
            <div className={planStyles.planFieldContent}>
              <textarea
                value={editFormData.prescription}
                onChange={(e) => setEditFormData(prev => ({ ...prev, prescription: e.target.value }))}
                className={planStyles.planTextarea}
                rows={6}
                placeholder="Enter plan of the day..."
              />
            </div>
          </div>
          
          <div className={planStyles.planField}>
            <div className={planStyles.planFieldContent}>
              <label className={planStyles.planFieldLabel}>Current Issue:</label>
              <textarea
                value={editFormData.current_issue}
                onChange={(e) => setEditFormData(prev => ({ ...prev, current_issue: e.target.value }))}
                className={planStyles.planTextarea}
                rows={4}
                placeholder="Enter current issue..."
              />
            </div>
          </div>
          
          <div className={planStyles.planField}>
            <div className={planStyles.planFieldContent}>
              <label className={planStyles.planFieldLabel}>Current Treatment:</label>
              <textarea
                value={editFormData.current_treatment}
                onChange={(e) => setEditFormData(prev => ({ ...prev, current_treatment: e.target.value }))}
                className={planStyles.planTextarea}
                rows={4}
                placeholder="Enter current treatment..."
              />
            </div>
          </div>

          <div className={planStyles.planModalActions}>
            <button
              type="button"
              onClick={handleEditCancel}
              className={planStyles.cancelButton}
              disabled={savingPlan}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePlanUpdate}
              className={planStyles.saveButton}
              disabled={savingPlan}
            >
              {savingPlan && editingSheetId ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPreviousPrescriptions = () => {
    return (
      <div className={styles.previousPrescriptionsContainer}>
        <div className={styles.previousPrescriptions}>
          <h3>Previous Prescriptions</h3>
          
          {/* Create form always at the top */}
          {renderCreatePlanForm()}
          
          {planData && planData.length > 0 ? (
            planData.map((plan, index) => (
              <div key={plan.id} className={styles.prescriptionEntry}>
                {/* <div className={styles.prescriptionTitle}>
                  <span>Plan of day {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => handlePlanEdit(plan.sheet_id)}
                    className={styles.editPrescriptionButton}
                    title="Edit this plan"
                  >
                    Edit
                  </button>
                   <button
                      type="button"
                       onClick={() => downloadPrescriptionPDF(plan, index)}
                      className={styles.downloadButton}
                      title ="Download this plan"
                      >
                       Download
                   </button>
                </div> */}

                  <div className={styles.prescriptionTitle}>
                       <span>Plan of day {index + 1}</span>

                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          onClick={() => handlePlanEdit(plan.sheet_id)}
                           className={styles.editPrescriptionButton}
                           >
                              Edit
                          </button>

                          <button
                           type="button"
                            onClick={() => downloadPrescriptionPDF(plan, index)}
                             className={styles.downloadRoundSheetButton}
                             >
                              Download
                            </button>
                               </div>
                             </div>
                

                {/* Inline edit form shown when editing this specific plan */}
                {editingSheetId === plan.sheet_id && renderEditPlanForm()}

                <div className={styles.prescriptionContent}>
                  <div className={styles.prescriptionText} style={{ whiteSpace: 'pre-line' }}>
                    {plan.prescription || 'No prescription available'}
                  </div>
                  
                  {/* Current Issue */}
                  <div className={styles.prescriptionField}>
                    <label className={styles.prescriptionFieldLabel}>Current Issue:</label>
                    <div className={styles.prescriptionFieldText} style={{ whiteSpace: 'pre-line' }}>
                      {plan.current_issue || 'No current issue described'}
                    </div>
                  </div>
                  
                  {/* Current Treatment */}
                  <div className={styles.prescriptionField}>
                    <label className={styles.prescriptionFieldLabel}>Current Treatment:</label>
                    <div className={styles.prescriptionFieldText} style={{ whiteSpace: 'pre-line' }}>
                      {plan.current_treatment || 'No current treatment described'}
                    </div>
                  </div>
                  
                  <div className={styles.prescriptionMeta}>
                    <div className={styles.prescriptionDate}>
                      Date: {new Date(plan.date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })} | DAY: {Math.ceil((new Date(plan.date).getTime() - new Date(patient?.admission_date || '').getTime()) / (1000 * 60 * 60 * 24))}
                    </div>
                    <div className={styles.prescriptionTime}>
                      Time: {new Date(plan.date).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata'
                      })}
                    </div>
                  </div>
                  <div className={styles.prescriptionIds}>
                    <div className={styles.idItem}>
                      <span className={styles.bullet}>•</span> Progress Sheet ID: {plan.progress_sheet_id}
                    </div>
                    <div className={styles.idItem}>
                      <span className={styles.bullet}>•</span> Investigation ID: {plan.investigation_report_id}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.prescriptionEntry}>
              <div className={styles.prescriptionTitle}>
                No prescriptions available
              </div>
              <div className={styles.prescriptionContent}>
                <div className={styles.prescriptionText}>
                  No daily round sheets found for this patient.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAllSections = () => {
    const sections = [
      { key: 'gcs', title: 'GCS & Power', content: renderGCSContent },
      { key: 'fluid', title: 'Input/Output', content: renderFluidContent },
      { key: 'vitals', title: 'Vitals', content: renderVitalsContent },
      { key: 'respiratory', title: 'Respiratory', content: renderRespiratoryContent },
      { key: 'catheter', title: 'Catheter', content: renderCatheterContent },
    ];

    return (
      <div className={styles.sectionsStack}>
        {sections.map((section) => (
          <div key={section.key} className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>{section.title}</div>
            <div className={styles.sectionContent}>
              {section.content()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error || !patient || !entry) {
    return <div className={styles.error}>{error || 'Data not found'}</div>;
  }

  const breadcrumbItems = [
    { label: 'Patient', href: '/patients' },
    { label: 'Patient Details', href: `/patients/${params.id}` },
    { label: 'Daily Round' }
  ];

  return (
      <>
      <div className={styles.pageContainer}>
        <Breadcrumb items={breadcrumbItems} />
        
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.dateInfo}>
              <span>Date: {new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
              <span>Day: {Math.ceil((new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))}</span>
            </div>
          </div>
          
        </div>

        <div className={styles.patientCard}>
          <div className={styles.patientIcon}>
            
            <BedIcon bedNumber={patient.organisation_icu_bed_number || 0} />
            
          </div>
          
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
              <label>Latest Entry Date:</label>
              <span>{new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
            </div>
            <div className={styles.infoRow}>
              <label>Latest Entry Time:</label>
              <span>{entry?.time || 'No entries'}</span>
            </div>
            {apacheScore && (
              <>
                <div className={styles.infoRow}>
                  <label>Apache II Score:</label>
                  <span>{apacheScore.apache_ii_score}</span>
                </div>
                <div className={styles.infoRow}>
                  <label>Predicted Mortality Rate:</label>
                  <span>{apacheScore.predicted_mortality_percent.toFixed(2)}%</span>
                </div>
              </>
            )}
            
            </div>
        </div>

        {/* Plan of the Day Section */}
        

        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <h2>Daily Round Sheet</h2>
          </div>
          {renderAllSections()}
          {latestInvestigationReportDate && (
            <div className={styles.investigationReportLinkContainer}>
              <Link 
                href={`/patients/${params.id}/investigation-report/date/${latestInvestigationReportDate}`}
                className={styles.investigationReportLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Investigation Report
              </Link>
            </div>
          )}
        </div>

        {/* Previous Prescriptions Section */}
        {renderPreviousPrescriptions()}

        <div className={styles.pageDownloadBar}>
          <button
            type="button"
            className={styles.downloadFullSheetButton}
            onClick={downloadFullDailyRoundPDF}
          >
            Download Daily Round Sheet (PDF)
          </button>
          <p className={styles.pageDownloadHint}>
            Includes patient details, GCS, fluid balance, vitals, respiratory, catheters, and all plans of day.
          </p>
        </div>
        
        
      </div>
      
    </>
  );
} 