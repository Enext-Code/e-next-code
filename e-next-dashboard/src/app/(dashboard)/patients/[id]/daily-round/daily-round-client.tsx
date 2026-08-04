'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import jsPDF from "jspdf";
// import Link from 'next/link';

import Breadcrumb from '@/components/common/Breadcrumb';
import { patientService, Patient } from '@/services/patientService';
import { progressSheetService, ProgressSheet, ProgressSheetEntry, ProgressSheetListParams } from '@/services/progressSheetService';
import { catheterService, CatheterEntry } from '@/services/catheterService';
import { investigationReportService, InvestigationReportData } from '@/services/investigationReportService';
import { fetchApi } from '@/utils/api';
import { API_ENDPOINTS } from '@/constants/api';
import InvestigationCumulativeModal, {
  buildCumulativeTable,
  filterReportsLastNDays,
} from '@/components/daily-round-progress-sheet/InvestigationCumulativeModal';

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
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/auth.service';

type PageParams = {
    id: string;
    date: string;
    sheetId: string;
    time: string;
  };
  
export default function ProgressSheetViewPageTimeClient() {
  const params = useParams<PageParams>();
  const router = useRouter();
  const { user } = useAuth();
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
  const [investigationReports, setInvestigationReports] = useState<InvestigationReportData[]>([]);
  const [isInvestigationModalOpen, setIsInvestigationModalOpen] = useState(false);
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
debugger
      // Load latest progress sheet for the patient
      const sheetResponse = await progressSheetService.list({
        patient_id: params.id,
        page: 1,
        limit: 1,
        sort_order: 'desc'
      });
      console.log('sheetResponse', sheetResponse);
      if (sheetResponse.success && sheetResponse.data && sheetResponse.data.items.length > 0) {
        const latestSheet = sheetResponse.data.items[0];
        console.log('latestSheet', latestSheet);
        // Get the latest entry from the sheet
        if (latestSheet.entries && latestSheet.entries.length > 0) {
          const latestEntry = latestSheet.entries[latestSheet.entries.length - 1];
          console.log('latestEntry', latestEntry);
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

      // Load all investigation reports (all dates) with full detail
      await loadInvestigationReports();

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

  const loadInvestigationReports = async () => {
    try {
      // 1) All reports for this patient (newest first)
      const listResponse = await investigationReportService.listInvestigationReports(params.id, {
        page: 1,
        limit: 100,
        sort_order: 'desc'
      });

      const summaries = listResponse.success ? listResponse.data?.items ?? [] : [];
      if (summaries.length === 0) {
        setLatestInvestigationReportDate(null);
        setInvestigationReports([]);
        return;
      }

      // Keep newest date for existing "View Investigation Report" link
      const newest = summaries[0];
      if (newest.analysis_date) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(newest.analysis_date)) {
          setLatestInvestigationReportDate(newest.analysis_date);
        } else {
          const date = new Date(newest.analysis_date);
          setLatestInvestigationReportDate(date.toISOString().split('T')[0]);
        }
      } else {
        setLatestInvestigationReportDate(null);
      }

      // 2) Full detail for every report (all dates)
      const details = await Promise.all(
        summaries.map(async (summary) => {
          const reportKey = summary.report_id || summary.id;
          try {
            const detailResponse = await investigationReportService.getInvestigationReport(reportKey);
            const reportData =
              (detailResponse as any)?.data?.data ??
              (detailResponse as any)?.data ??
              null;
            if (detailResponse.success && reportData) {
              return reportData as InvestigationReportData;
            }
          } catch (err) {
            console.error(`Error loading investigation report ${reportKey}:`, err);
          }
          return null;
        })
      );

      const loadedReports = details.filter((r): r is InvestigationReportData => r != null);
      setInvestigationReports(loadedReports);
    } catch (err) {
      console.error('Error loading investigation reports:', err);
      setInvestigationReports([]);
      // Don't set page error — investigation is optional for daily-round UI
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


  const handlePlanEdit = (sheetId: string) => {
    // Use already-loaded plan list — GET /daily-round-sheets/?sheet_id=... hits 405
    // (POST-only path vs trailing-slash GET mismatch on that route).
    const sheetData = planData.find((p) => p.sheet_id === sheetId);
    if (!sheetData) {
      alert('Failed to load plan data: plan not found');
      return;
    }

    setEditFormData({
      prescription: sheetData.prescription || '',
      current_issue: sheetData.current_issue || '',
      current_treatment: sheetData.current_treatment || '',
    });
    setEditingSheetId(sheetData.sheet_id);
    setTimeout(() => {
      planFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };



  // jsPDF Helvetica breaks on zero-width / special Unicode (shows as &A&t&r&a&...)
  const sanitizePdfText = (value: unknown): string => {
    if (value == null) return '';
    return String(value)
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'NIL';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    const text = sanitizePdfText(value);
    if (!text || text === '-' || text === '—') return 'NIL';
    return text;
  };

  // List is newest-first (desc); plan number stays chronological (oldest = 1)
  const getPlanDayNumber = (index: number) => planData.length - index;

  // Plan `date` from API/Mongo is UTC; naive ISO (no Z) must not be treated as local IST.
  const parsePlanUtcDate = (value: string) => {
    if (!value) return new Date(NaN);
    const trimmed = value.trim();
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      return new Date(trimmed);
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      return new Date(`${trimmed}Z`);
    }
    return new Date(trimmed);
  };

  const getLoggedInUserId = (): string | null => {
    if (user?.id) return user.id;
    const token = AuthService.getInstance().getAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload?.sub || null;
    } catch {
      return null;
    }
  };

  const loadDoctorSignatureImage = async (
    doctorId?: string | null
  ): Promise<{ dataUrl: string; format: 'PNG'; aspectRatio: number } | null> => {
    if (!doctorId) return null;
    try {
      const response = await userService.getSignatureUrl(doctorId);
      const signatureUrl =
        (response as any)?.data?.signature_url ?? (response as any)?.signature_url;
      if (!signatureUrl) return null;

      // S3 presigned URL works in <img>, but browser fetch() hits CORS.
      // Load via same-origin proxy so PDF can read image bytes.
      const res = await fetch(
        `/media-proxy?url=${encodeURIComponent(signatureUrl)}`
      );
      if (!res.ok) return null;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(img.naturalWidth || 400, 1);
      canvas.height = Math.max(img.naturalHeight || 150, 1);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return null;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      return {
        dataUrl: canvas.toDataURL('image/png'),
        format: 'PNG',
        aspectRatio: canvas.width / Math.max(canvas.height, 1),
      };
    } catch (err) {
      console.error('Failed to load doctor signature for PDF:', err);
      return null;
    }
  };

  const downloadPrescriptionPDF = async (plan: DailyRoundSheetData, index: number) => {
    if (!patient) return;

    let organisationName = '';
    if (patient.organisation_id) {
      try {
        const orgResponse = await fetchApi<{ name?: string }>(
          `/api/v1/organisations/organisations/detail?organisation_id=${patient.organisation_id}`
        );
        const orgData = (orgResponse as any)?.data ?? orgResponse;
        organisationName = orgData?.name || '';
      } catch (err) {
        console.error('Failed to load organisation for emergency PDF:', err);
      }
    }

    const doctorSignature = await loadDoctorSignatureImage(getLoggedInUserId());
    const doctorName = user?.profile?.full_name?.trim() || '—';

    // Crisp logo for header
    let logo: { dataUrl: string; format: 'PNG'; aspectRatio: number } | null = null;
    try {
      const res = await fetch('/enext-logo.svg');
      if (res.ok) {
        const svgText = await res.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(svgBlob);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = objectUrl;
        });
        const nativeW = img.naturalWidth || 191;
        const nativeH = img.naturalHeight || 43;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(nativeW * 8);
        canvas.height = Math.round(nativeH * 8);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          logo = {
            dataUrl: canvas.toDataURL('image/png'),
            format: 'PNG',
            aspectRatio: nativeW / nativeH,
          };
        }
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      // logo optional
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    let y = 0;

    const ensureSpace = (needed = 20) => {
      if (y + needed > pageHeight - 18) {
        doc.addPage();
        // thin top accent on continuation pages
        doc.setFillColor(180, 30, 30);
        doc.rect(0, 0, pageWidth, 3, 'F');
        y = 14;
      }
    };

    const drawDivider = () => {
      ensureSpace(6);
      doc.setDrawColor(210);
      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 6;
    };

    const formatPdfDate = (value?: string | null) => {
      if (!value) return '—';
      const raw = String(value).trim();
      const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
      }
      return raw;
    };

    const formatPdfTime = (value?: string | null) => {
      if (!value) return '—';
      const cleaned = String(value).trim().replace(/Z$/i, '');
      const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
      if (!match) return cleaned;
      const hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
    };

    const capitalizeText = (value?: string | null) => {
      if (!value) return '—';
      return String(value)
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    const sentenceCase = (value?: string | null) => {
      if (!value) return 'Not recorded';
      const cleaned = String(value).replace(/\s+/g, ' ').trim();
      if (!cleaned) return 'Not recorded';
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    // ——— Professional emergency header ———
    doc.setFillColor(170, 20, 20);
    doc.rect(0, 0, pageWidth, 28, 'F');
    // dark strip under red for depth
    doc.setFillColor(120, 10, 10);
    doc.rect(0, 28, pageWidth, 1.2, 'F');

    if (logo) {
      const logoW = 34;
      const logoH = logoW / logo.aspectRatio;
      try {
        // white plate behind logo for contrast on red
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(marginX - 1, 5, logoW + 2, logoH + 2, 1, 1, 'F');
        doc.addImage(logo.dataUrl, logo.format, marginX, 6, logoW, logoH, undefined, 'NONE');
      } catch {
        // ignore logo failure
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('EMERGENCY', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('MEDICAL ROUND SHEET', pageWidth / 2, 19, { align: 'center' });
    if (organisationName) {
      doc.setFontSize(8);
      doc.text(organisationName, pageWidth / 2, 25, { align: 'center' });
    }
    doc.setTextColor(0);
    y = 36;

    const dayNumber = Math.ceil(
      (new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getTime() -
        new Date(patient.admission_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const reportDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    const planDayNo = getPlanDayNumber(index);

    // Meta strip
    doc.setFillColor(220, 220, 224);
    doc.roundedRect(marginX, y - 3, contentWidth, 9, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(55);
    doc.text(`Plan of Day ${planDayNo}`, marginX + 3, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Report Date: ${reportDate}  |  Hospital Day: ${dayNumber}`,
      pageWidth - marginX - 3,
      y + 2.5,
      { align: 'right' }
    );
    doc.setTextColor(0);
    y += 12;

    // ——— Patient details card ———
    const detailsStartY = y;
    doc.setFillColor(190, 190, 194);
    doc.roundedRect(marginX, y, contentWidth, 8, 1, 1, 'F');
    doc.setTextColor(35, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PATIENT DETAILS', marginX + 3, y + 5.2);
    doc.setTextColor(0);
    y += 12;

    const detailRows: Array<[string, string]> = [
      ['Patient Name', capitalizeText(`${patient.first_name} ${patient.last_name}`)],
      ['Patient ID', patient.unique_id || '—'],
      ['Patient Age', String(patient.age) || '—'],
      ['Patient Gender', capitalizeText(patient.gender)],
      ['Date of Admission', formatPdfDate(patient.admission_date)],
      ['Time of Admission', formatPdfTime(patient.admission_time)],
      ['Organisation', organisationName || '—'],
      ['Date', reportDate],
      ['Day', String(dayNumber)],
      ['Bed No', formatValue(patient.organisation_icu_bed_number)],
      ['Tele ICU Date', formatPdfDate(patient.tele_icu_date)],
      ['Latest Entry Date', reportDate],
      ['Latest Entry Time', entry?.time || '—'],
    ];

    const colWidth = contentWidth / 2;
    doc.setFontSize(8.5);
    for (let i = 0; i < detailRows.length; i += 2) {
      ensureSpace(7);
      for (let c = 0; c < 2; c++) {
        const row = detailRows[i + c];
        if (!row) continue;
        const x = marginX + 2 + c * colWidth;
        const label = `${row[0]}: `;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(50, 50, 50);
        const labelWidth = doc.getTextWidth(label);
        doc.text(label, x, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20);
        const valueLines = doc.splitTextToSize(row[1] || '—', colWidth - labelWidth - 6);
        doc.text(valueLines, x + labelWidth, y);
      }
      y += 5.5;
    }

    // light border around details block
    const detailsBoxH = y - detailsStartY + 2;
    doc.setDrawColor(170);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, detailsStartY, contentWidth, detailsBoxH, 1, 1, 'S');
    y += 8;

    // ——— Clinical content sections ———
    const addClinicalSection = (title: string, content: string, asList = false) => {
      ensureSpace(22);
      // section title bar — darker gray
      doc.setFillColor(210, 210, 214);
      doc.setDrawColor(120, 120, 125);
      doc.setLineWidth(0.8);
      doc.rect(marginX, y - 4, contentWidth, 8, 'F');
      doc.line(marginX, y - 4, marginX, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(title.toUpperCase(), marginX + 3, y + 1.5);
      doc.setTextColor(0);
      y += 9;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);

      if (asList) {
        const items = String(content || '')
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length === 0) {
          doc.setTextColor(120);
          doc.text('Not recorded', marginX + 3, y);
          doc.setTextColor(0);
          y += 7;
          return;
        }
        items.forEach((item, idx) => {
          const bullet = `${idx + 1}.`;
          const lines = doc.splitTextToSize(item, contentWidth - 10);
          ensureSpace(lines.length * 4.5 + 3);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(55, 55, 55);
          doc.text(bullet, marginX + 2, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30);
          doc.text(lines, marginX + 9, y);
          y += lines.length * 4.5 + 1.5;
        });
        y += 4;
        return;
      }

      const text = sentenceCase(content);
      const lines = doc.splitTextToSize(text, contentWidth - 4);
      for (const line of lines) {
        ensureSpace(6);
        doc.setTextColor(30);
        doc.text(line, marginX + 2, y);
        y += 4.5;
      }
      y += 6;
    };

    addClinicalSection('Current Issue', plan.current_issue, false);
    addClinicalSection('Current Treatment', plan.current_treatment, true);
    addClinicalSection(`Plan of Day ${planDayNo}`, plan.prescription, false);

    // ——— Doctor signature block (bottom) ———
    ensureSpace(42);
    y += 4;
    doc.setDrawColor(190);
    doc.setLineWidth(0.3);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    const signBoxW = 55;
    const signBoxH = 22;
    const signBoxX = pageWidth - marginX - signBoxW;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text('Doctor Signature', signBoxX, y);
    y += 3;

    if (doctorSignature) {
      const maxW = signBoxW - 4;
      const maxH = signBoxH - 4;
      let imgW = maxW;
      let imgH = imgW / doctorSignature.aspectRatio;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * doctorSignature.aspectRatio;
      }
      try {
        doc.addImage(
          doctorSignature.dataUrl,
          doctorSignature.format,
          signBoxX + (signBoxW - imgW) / 2,
          y,
          imgW,
          imgH,
          undefined,
          'NONE'
        );
      } catch (err) {
        console.error('Failed to add doctor signature image:', err);
        doc.setDrawColor(180);
        doc.line(signBoxX, y + signBoxH - 6, signBoxX + signBoxW, y + signBoxH - 6);
      }
      y += signBoxH;
    } else {
      doc.setDrawColor(160);
      doc.setLineWidth(0.4);
      doc.line(signBoxX, y + 14, signBoxX + signBoxW, y + 14);
      y += 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.text(doctorName, signBoxX + signBoxW / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text('Attending Doctor', signBoxX + signBoxW / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 6;

    // drawDivider();
    // doc.setFont('helvetica', 'italic');
    // doc.setFontSize(7.5);
    // doc.setTextColor(130);
    // doc.text('Confidential — For clinical use only', marginX, y);
    // y += 4;

    // Footers on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(
        `Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  ${patient.unique_id}  |  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
      );
      doc.setTextColor(0);
    }

    doc.save(`Emergency-Plan-${planDayNo}-${patient.unique_id || 'patient'}.pdf`);
  };

  const downloadFullDailyRoundPDF = async () => {
    if (!patient || !entry) return;

    let organisationName = '';
    if (patient.organisation_id) {
      try {
        const orgResponse = await fetchApi<{ name?: string }>(
          `/api/v1/organisations/organisations/detail?organisation_id=${patient.organisation_id}`
        );
        const orgData = (orgResponse as any)?.data ?? orgResponse;
        organisationName = orgData?.name || '';
      } catch (err) {
        console.error('Failed to load organisation for PDF:', err);
      }
    }

    const doctorSignature = await loadDoctorSignatureImage(getLoggedInUserId());

    const doctorName = user?.profile?.full_name?.trim() || '—';

    // Health history: ICD + presenting complaints from patient info API
    // (same source as Patient History page — not available on daily-round patient alone)
    const toTitleCase = (value: string) =>
      String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    const formatIcdList = (codes: Array<{ code: string; description: string }>) =>
      codes
        .map((icd) => `${icd.code} - ${toTitleCase(icd.description || '')}`)
        .join(', ');

    let icdCodesText = 'NIL';
    let presentingComplaintsText = 'NIL';
    try {
      const infoResponse = await patientService.getPatientInfo(patient.id);
      if (infoResponse.success && infoResponse.data) {
        const basicIcd = infoResponse.data.basic_details?.icd_codes;
        if (Array.isArray(basicIcd) && basicIcd.length > 0) {
          icdCodesText = formatIcdList(basicIcd);
        } else if (patient.icd_codes?.length) {
          icdCodesText = formatIcdList(patient.icd_codes);
        }

        const complaints = infoResponse.data.past_medical_history?.presenting_complaints;
        if (Array.isArray(complaints) && complaints.length > 0) {
          presentingComplaintsText = complaints
            .map((c) => toTitleCase(c.complaint || ''))
            .filter(Boolean)
            .join(', ');
        }
      }
    } catch (err) {
      console.error('Failed to load patient health history for PDF:', err);
      if (patient.icd_codes?.length) {
        icdCodesText = formatIcdList(patient.icd_codes);
      }
    }

    // Prefer crisp local SVG (high-DPI raster) — S3 JPEG looks pixelated when scaled in PDF
    const loadLocalSvgLogoAsPng = async (): Promise<{
      dataUrl: string;
      format: 'PNG';
      aspectRatio: number;
    } | null> => {
      try {
        const res = await fetch('/enext-logo.svg');
        if (!res.ok) return null;
        const svgText = await res.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(svgBlob);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = objectUrl;
        });

        // Native SVG viewBox is 191×43 — render at high DPI for sharp PDF output
        const nativeW = img.naturalWidth || 191;
        const nativeH = img.naturalHeight || 43;
        const scale = 8;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(nativeW * scale);
        canvas.height = Math.round(nativeH * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return null;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);

        return {
          dataUrl: canvas.toDataURL('image/png'),
          format: 'PNG',
          aspectRatio: nativeW / nativeH,
        };
      } catch {
        return null;
      }
    };

    const loadRasterLogoAsDataUrl = async (
      url: string
    ): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG'; aspectRatio: number } | null> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = objectUrl;
        });

        // Upscale onto a high-res canvas so PDF embedding stays sharp
        const targetW = Math.max(img.naturalWidth, 1200);
        const scale = targetW / img.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return null;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);

        return {
          dataUrl: canvas.toDataURL('image/png'),
          format: 'PNG',
          aspectRatio: img.naturalWidth / img.naturalHeight,
        };
      } catch {
        return null;
      }
    };

    const logo =
      (await loadLocalSvgLogoAsPng()) ||
      (await loadRasterLogoAsDataUrl(
        'https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/WhatsApp+Image+2025-12-13+at+16.49.10.jpeg'
      ));

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

    const addSubHeading = (title: string) => {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(35, 55, 90);
      doc.text(title, marginX, y);
      doc.setTextColor(0);
      y += 6;
    };

    const addKeyValueRows = (rows: Array<[string, string]>, columns = 2) => {
      doc.setFontSize(9);
      const colWidth = contentWidth / columns;
      for (let i = 0; i < rows.length; i += columns) {
        ensureSpace(7);
        let maxLines = 1;
        for (let c = 0; c < columns; c++) {
          const row = rows[i + c];
          if (!row) continue;
          const x = marginX + c * colWidth;
          const label = `${sanitizePdfText(row[0])}: `;
          doc.setFont('helvetica', 'bold');
          const labelWidth = doc.getTextWidth(label);
          doc.text(label, x, y);
          doc.setFont('helvetica', 'normal');
          const valueWidth = Math.max(colWidth - labelWidth - 2, 20);
          const valueLines = doc.splitTextToSize(sanitizePdfText(row[1]) || 'NIL', valueWidth);
          doc.text(valueLines, x + labelWidth, y);
          maxLines = Math.max(maxLines, valueLines.length);
        }
        y += maxLines * 4.2 + 2;
      }
    };

    const addWrappedBlock = (label: string, text: string) => {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, marginX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(text || 'NIL', contentWidth);
      // Write line-by-line so long text continues on the same page
      // instead of jumping the whole block to the next page
      const lineHeight = 4.5;
      for (const line of lines) {
        ensureSpace(lineHeight + 2);
        doc.text(line, marginX, y);
        y += lineHeight;
      }
      y += 4;
    };

    type FluidItem = { name?: string | null; quantity?: number | null };
    const addFluidItemRows = (items: FluidItem[] | undefined | null) => {
      const list = (items || []).filter((item) => item?.name || item?.quantity != null);
      if (list.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('NIL', marginX + 2, y);
        y += 6;
        return;
      }

      const formatItem = (item: FluidItem) => {
        const name = sanitizePdfText(item.name) || 'Item';
        const qty = item.quantity != null ? `${item.quantity} ml` : 'NIL';
        return { label: `${name}: `, qty };
      };

      doc.setFontSize(9);
      // Max 2 items per line; 3rd+ wrap to next line(s)
      for (let i = 0; i < list.length; i += 2) {
        ensureSpace(7);
        const left = formatItem(list[i]);
        doc.setFont('helvetica', 'bold');
        doc.text(left.label, marginX + 2, y);
        const leftLabelW = doc.getTextWidth(left.label);
        doc.setFont('helvetica', 'normal');
        doc.text(left.qty, marginX + 2 + leftLabelW, y);

        if (list[i + 1]) {
          const right = formatItem(list[i + 1]);
          const rightX = marginX + contentWidth / 2;
          doc.setFont('helvetica', 'bold');
          doc.text(right.label, rightX, y);
          const rightLabelW = doc.getTextWidth(right.label);
          doc.setFont('helvetica', 'normal');
          doc.text(right.qty, rightX + rightLabelW, y);
        }
        y += 6;
      }
    };

    // ——— Header: logo left, title tightly beside it ———
    const logoWidth = 40; // mm
    const logoHeight = logo ? logoWidth / logo.aspectRatio : 9;
    const logoGap = 10;
    const headerTop = y;
    const textLeft = logo ? marginX + logoWidth + logoGap : marginX;
    const textMaxWidth = pageWidth - marginX - textLeft;

    if (logo) {
      try {
        doc.addImage(
          logo.dataUrl,
          logo.format,
          marginX,
          headerTop,
          logoWidth,
          logoHeight,
          undefined,
          'NONE'
        );
      } catch (err) {
        console.error('Failed to add logo to PDF:', err);
      }
    }

    // Title + org stacked next to logo (left-aligned to close the gap)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize('HOSPITAL MEDICAL ROUND SHEET', textMaxWidth);
    const titleBlockHeight = titleLines.length * 5;
    const orgBlockHeight = organisationName ? 5 : 0;
    const textBlockHeight = titleBlockHeight + (organisationName ? 2 + orgBlockHeight : 0);
    let textY = headerTop + Math.max(0, (logoHeight - textBlockHeight) / 2) + 4;

    doc.setTextColor(35, 55, 90);
    doc.text(titleLines, textLeft, textY, { align: 'left' });
    textY += titleBlockHeight + 1;

    if (organisationName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const orgLines = doc.splitTextToSize(organisationName, textMaxWidth);
      doc.text(orgLines, textLeft, textY, { align: 'left' });
      textY += orgLines.length * 4.5;
    }

    doc.setTextColor(0);
    y = Math.max(headerTop + logoHeight, textY) + 4;
    drawDivider();

    const dayNumber = Math.ceil(
      (new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getTime() -
        new Date(patient.admission_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const reportDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });

    const formatPdfDate = (value?: string | null) => {
      if (!value) return 'NIL';
      const raw = String(value).trim();
      const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
      }
      return raw;
    };

    const formatPdfTime = (value?: string | null) => {
      if (!value) return 'NIL';
      const cleaned = String(value).trim().replace(/Z$/i, '');
      const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
      if (!match) return cleaned;
      const hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
    };

    const capitalizeText = (value?: string | null) => {
      if (!value) return 'NIL';
      return String(value)
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Match UI patient card fields
    addHeading('PATIENT DETAILS');
    addKeyValueRows([
      ['Patient Name', capitalizeText(`${patient.first_name} ${patient.last_name}`)],
      ['Patient ID', patient.unique_id || 'NIL'],
      ['Patient Age', String(patient.age) || 'NIL'],
      ['Patient Gender', capitalizeText(patient.gender)],
      ['Date of Admission', formatPdfDate(patient.admission_date)],
      ['Time of Admission', formatPdfTime(patient.admission_time)],
      ['Organisation', formatValue(organisationName)],
      ['Date', reportDate],
      ['Day', String(dayNumber)],
      ['Bed No', formatValue(patient.organisation_icu_bed_number)],
      ['Tele ICU Date', formatPdfDate(patient.tele_icu_date)],
     
      ['Latest Entry Date', reportDate],
      ['Latest Entry Time', entry.time || 'NIL'],
    ]);

    if (apacheScore) {
      addKeyValueRows([
        ['Apache II Score', String(apacheScore.apache_ii_score)],
        ['Predicted Mortality Rate', `${apacheScore.predicted_mortality_percent.toFixed(2)}%`],
      ]);
    }
    drawDivider();

    //-------Patient health history
    addHeading('PATIENT HEALTH HISTORY');
    addKeyValueRows(
      [
        ['Presenting Complaints', presentingComplaintsText],
        ['ICD Code', icdCodesText],

      ],
      1
    );
    drawDivider();
    // ——— GCS (match GCSForm view mode) ———
    addHeading('GCS & POWER');
    const gcs = (entry.gcs?.values ?? {}) as Record<string, unknown>;
    const eye = gcs['Eye Opening'] as number | null | undefined;
    const verbal = gcs['Verbal Response'] as number | null | undefined;
    const motor = gcs['Motor Response'] as number | null | undefined;
    const verbalDisplay = verbal === null || verbal === undefined ? 'NIL' : verbal === 6 ? '1' : String(verbal);
    let gcsScore = 'NIL';
    if (eye != null && verbal != null && motor != null) {
      gcsScore = String(eye + (verbal === 6 ? 1 : verbal) + motor);
    }

    addSubHeading('GCS');
    addKeyValueRows([
      ['Eye Opening (E)', formatValue(eye)],
      ['Verbal Response (V)', verbalDisplay],
      ['Motor Response (M)', formatValue(motor)],
      ['GCS SCORE', gcsScore],
    ]);

    addSubHeading('CNS: Pupils');
    addKeyValueRows([
      ['Right Pupil Size', formatValue(gcs['Right Pupil Size'])],
      ['Right Pupil Reaction', formatValue(gcs['Right Pupil Reaction'])],
      ['Left Pupil Size', formatValue(gcs['Left Pupil Size'])],
      ['Left Pupil Reaction', formatValue(gcs['Left Pupil Reaction'])],
    ]);

    // addSubHeading('Lung Fields');
    // addKeyValueRows([
    //   ['RUL', formatValue(gcs['RUL'])],
    //   ['LUL', formatValue(gcs['LUL'])],
    //   ['LLL', formatValue(gcs['LLL'])],
    //   ['RLL', formatValue(gcs['RLL'])],
    // ]);

    addSubHeading('Status');
    addKeyValueRows([
      ['Sedation', formatValue(gcs['Sedation'])],
      ['Pain', formatValue(gcs['Pain'])],
    ]);
    drawDivider();

    // ——— Fluid / Input-Output (match FluidForm) ———
    addHeading('INPUT / OUTPUT');
    const fluid = entry.fluid;
    addSubHeading('Infusions');
    addFluidItemRows(fluid?.infusions);
    addSubHeading('Other Infusions');
    addFluidItemRows(fluid?.other_infusions);
    addSubHeading('Colloids');
    addFluidItemRows(fluid?.colloids);
    addSubHeading('Crystalloids');
    addFluidItemRows(fluid?.crystalloids);
    addSubHeading('Oral Intake');
    addFluidItemRows(fluid?.oral_intakes);
    addSubHeading('Ryles Tube');
    addFluidItemRows(fluid?.ryles_tubes);
    addSubHeading('Urine Output');
    addFluidItemRows(fluid?.urines);
    addSubHeading('Drainage');
    addFluidItemRows(fluid?.drainages);
    addSubHeading('Totals');
    addKeyValueRows([
      ['Total Input', fluid?.total_input != null ? `${fluid.total_input} ml` : 'NIL'],
      ['Total Output', fluid?.total_output != null ? `${fluid.total_output} ml` : 'NIL'],
      ['Cumulative Balance', fluid?.cumulative_balance != null ? `${fluid.cumulative_balance} ml` : 'NIL'],
    ]);
    drawDivider();

    // ——— Vitals (match VitalsForm view mode) ———
    addHeading('VITALS');
    const vitals = (entry.vitals?.values ?? {}) as Record<string, unknown>;
    const systolic = vitals['Systolic'] as number | null | undefined;
    const diastolic = vitals['Diastolic'] as number | null | undefined;
    const mapScore =
      systolic != null && diastolic != null
        ? String(Math.round(((systolic + 2 * diastolic) / 3) * 10) / 10)
        : '—';

    addSubHeading('Cardiac');
    addKeyValueRows([
      ['Heart Rate', vitals['Heart Rate'] != null ? `${vitals['Heart Rate']} BPM` : 'NIL'],
      ['Rythm', formatValue(vitals['Rythm'] ?? vitals['Rhythm'])],
      ['Temp (F) (Oral)', vitals['Temp Oral'] != null ? `${vitals['Temp Oral']} °F` : 'NIL'],
      ['RBS', vitals['RBS'] != null ? `${vitals['RBS']} mmHg` : 'NIL'],
      ['SpO2', vitals['SpO2'] != null ? `${vitals['SpO2']} %` : 'NIL'],
    ]);
    addSubHeading('Blood Pressure');
    addKeyValueRows([
      ['Systolic', systolic != null ? `${systolic} mmHg` : 'NIL'],
      ['Diastolic', diastolic != null ? `${diastolic} mmHg` : 'NIL'],
    ]);
    addSubHeading('MAP Score');
    addKeyValueRows([['MAP', mapScore]]);
    drawDivider();

    // ——— Respiratory (match RespiratoryForm view mode) ———
    addHeading('RESPIRATORY');
    const resp = (entry.respiratory?.values ?? {}) as Record<string, unknown>;
    const respType = resp['Type'] as string | null | undefined;
    addKeyValueRows([['Type', formatValue(respType)]]);

    if (respType === 'oxygen') {
      addKeyValueRows([
        ['Oxygen Device', formatValue(resp['Oxygen Device'])],
        ['Oxygen Flow', formatValue(resp['Oxygen Flow'])],
      ]);
    }

    if (respType === 'Ventilator') {
      addSubHeading('Respiratory');
      addKeyValueRows([
        ['Vent Mode', formatValue(resp['Vent Mode'])],
        ['Rate', formatValue(resp['Rate'])],
        ['FiO2', formatValue(resp['FiO2'])],
        ['PEEP', formatValue(resp['PEEP'])],
        ['I PAP', formatValue(resp['I PAP'])],
        ['E PAP', formatValue(resp['E PAP'])],
      ]);
      addSubHeading('MV');
      addKeyValueRows([
        ['Set', formatValue(resp['Set'])],
        ['Dalta P (P Plat PEEP)', formatValue(resp['Dalta P (P Plat PEEP)'])],
        ['AW Pressure', formatValue(resp['AW Pressure'])],
        ['Ins %', formatValue(resp['Ins %'])],
        ['Peak Pressure', formatValue(resp['Peak Pressure'])],
        ['Plateau Pressure', formatValue(resp['Plateau Pressure'])],
        ['ETV', formatValue(resp['ETV'])],
        ['ITV', formatValue(resp['ITV'])],
      ]);
    }

    addWrappedBlock('Remarks', formatValue(resp['Remarks']));
    drawDivider();

    // ——— Catheter (match CatheterForm view mode) ———
    addHeading('CATHETER');
    const catheters = catheterData?.entries ?? [];
    const calculateDaysInUse = (insertionDate: string | null, removalDate: string | null): string => {
      if (!insertionDate) return 'NIL';
      const start = new Date(insertionDate);
      const end = removalDate ? new Date(removalDate) : new Date();
      const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return String(days);
    };

    if (catheters.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No catheter entries recorded.', marginX, y);
      y += 8;
    } else {
      catheters.forEach((c, idx) => {
        ensureSpace(24);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Catheter ${idx + 1}`, marginX, y);
        y += 5;
        addKeyValueRows(
          [
            ['Catheter Type', formatValue(c.type)],
            ['Type', formatValue(c.catheter_type)],
            ['Size', formatValue(c.size)],
            ['Site', formatValue(c.site)],
            [
              'Date Of Insertion',
              c.date_of_insertion ? new Date(c.date_of_insertion).toLocaleString() : 'NIL',
            ],
            ['Days in use', calculateDaysInUse(c.date_of_insertion, c.date_of_removal)],
            [
              'Date Of Removal',
              c.date_of_removal ? new Date(c.date_of_removal).toLocaleString() : 'NIL',
            ],
            ['Notes', formatValue(c.notes)],
          ],
          2
        );
      });
    }
    drawDivider();

    // ——— Investigation Cumulative (same portrait flow as rest of PDF) ———
    const last3DayReports = filterReportsLastNDays(investigationReports, 3);
    const {
      columns: invColumns,
      dateGroups: invDateGroups,
      rows: invRows,
    } = buildCumulativeTable(last3DayReports);

    // Keep heading + table start together (no orphan banner / blank page feel)
    ensureSpace(invColumns.length === 0 ? 28 : 36);
    addHeading('INVESTIGATION CUMULATIVE');

    if (invColumns.length === 0 || invRows.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('No investigation data for the last 3 days.', marginX, y);
      y += 6;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      doc.text('Last 3 days  |  Date groups with time columns', marginX, y);
      doc.setTextColor(0, 0, 0);
      y += 4;

      const invMX = marginX;
      const invCW = contentWidth;
      const testColW = Math.min(40, invCW * 0.22);
      const timeColW = Math.max(14, (invCW - testColW) / invColumns.length);
      const tableW = testColW + invColumns.length * timeColW;
      const dateHeaderH = 5.2;
      const timeHeaderH = 4.8;
      const rowH = 4.6;
      const bottomY = 278;

      // Match rest of daily-round PDF (navy), not modal orange — feels integrated
      const headerFill: [number, number, number] = [35, 55, 90];
      const headerFillAlt: [number, number, number] = [50, 72, 110];
      const border: [number, number, number] = [170, 180, 195];
      const sectionFill: [number, number, number] = [55, 75, 110];

      const cellText = (row: (typeof invRows)[0], colKey: string): string => {
        const cell = row.cells[colKey];
        if (!cell) return 'Nil';
        if (cell.imageUrls && cell.imageUrls.length > 0) {
          return `${cell.imageUrls.length} img`;
        }
        if (!cell.value || !String(cell.value).trim()) return 'Nil';
        let t = String(cell.value).trim();
        if (cell.flag === 'H') t += ' ^';
        if (cell.flag === 'L') t += ' v';
        return sanitizePdfText(t);
      };

      const drawCell = (
        x: number,
        cy: number,
        w: number,
        h: number,
        fill: [number, number, number],
        text: string,
        opts?: {
          bold?: boolean;
          italic?: boolean;
          textColor?: [number, number, number];
          align?: 'left' | 'center';
          fontSize?: number;
        }
      ) => {
        doc.setDrawColor(border[0], border[1], border[2]);
        doc.setLineWidth(0.2);
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.rect(x, cy, w, h, 'FD');

        doc.setFontSize(opts?.fontSize ?? 6);
        doc.setFont('helvetica', opts?.bold ? 'bold' : opts?.italic ? 'italic' : 'normal');
        const tc = opts?.textColor ?? [30, 30, 30];
        doc.setTextColor(tc[0], tc[1], tc[2]);

        const pad = 0.6;
        const lines = doc.splitTextToSize(text || '', Math.max(w - pad * 2, 3));
        const line = lines[0] || '';
        if (opts?.align === 'center') {
          const tw = doc.getTextWidth(line);
          doc.text(line, x + Math.max((w - tw) / 2, pad), cy + h * 0.7);
        } else {
          doc.text(line, x + pad, cy + h * 0.7);
        }
        doc.setTextColor(0, 0, 0);
      };

      const drawTableHeader = () => {
        drawCell(invMX, y, testColW, dateHeaderH + timeHeaderH, headerFill, 'Test Name', {
          bold: true,
          textColor: [255, 255, 255],
          fontSize: 6.5,
        });

        let x = invMX + testColW;
        invDateGroups.forEach((group) => {
          const w = group.columns.length * timeColW;
          drawCell(x, y, w, dateHeaderH, headerFill, sanitizePdfText(group.dateLabel), {
            bold: true,
            textColor: [255, 255, 255],
            align: 'center',
            fontSize: 6.5,
          });
          x += w;
        });

        const timeY = y + dateHeaderH;
        x = invMX + testColW;
        invColumns.forEach((col) => {
          drawCell(
            x,
            timeY,
            timeColW,
            timeHeaderH,
            headerFillAlt,
            sanitizePdfText(col.timeLabel || '-'),
            {
              bold: true,
              textColor: [255, 255, 255],
              align: 'center',
              fontSize: 5,
            }
          );
          x += timeColW;
        });

        y += dateHeaderH + timeHeaderH;
      };

      const ensureInvRow = () => {
        if (y + rowH <= bottomY) return;
        doc.addPage();
        y = 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(35, 55, 90);
        doc.text('Investigation Cumulative (continued)', invMX, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
        drawTableHeader();
      };

      drawTableHeader();

      invRows.forEach((row, rowIndex) => {
        const showSection =
          rowIndex === 0 || invRows[rowIndex - 1].section !== row.section;

        if (showSection) {
          ensureInvRow();
          drawCell(invMX, y, tableW, rowH, sectionFill, sanitizePdfText(row.section), {
            bold: true,
            textColor: [255, 255, 255],
            fontSize: 6.5,
          });
          y += rowH;
        }

        ensureInvRow();
        const bg: [number, number, number] =
          rowIndex % 2 === 0 ? [255, 255, 255] : [245, 247, 250];

        drawCell(invMX, y, testColW, rowH, bg, sanitizePdfText(row.testName), {
          bold: true,
          textColor: [30, 30, 30],
          fontSize: 6,
        });

        invColumns.forEach((col, i) => {
          const x = invMX + testColW + i * timeColW;
          const text = cellText(row, col.key);
          const cell = row.cells[col.key];
          let textColor: [number, number, number] = [30, 30, 30];
          if (cell?.flag === 'H') textColor = [180, 40, 40];
          else if (cell?.flag === 'L') textColor = [30, 80, 180];
          else if (text === 'Nil') textColor = [130, 130, 130];

          drawCell(x, y, timeColW, rowH, bg, text, {
            italic: text === 'Nil',
            textColor,
            align: 'center',
            fontSize: 5.5,
          });
        });

        y += rowH;
      });

      y += 3;
    }
    drawDivider();

    // ——— Plans (match Previous Prescriptions UI) ———
    addHeading('PREVIOUS PRESCRIPTIONS / PLAN OF THE DAY');
    if (planData.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('No daily round sheets found for this patient.', marginX, y);
      y += 8;
    } else {
      planData.forEach((plan, index) => {
        ensureSpace(36);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Plan of day ${getPlanDayNumber(index)}`, marginX, y);
        y += 6;
        addWrappedBlock('Current Issue', plan.current_issue || 'No current issue described');
        addWrappedBlock('Current Treatment', plan.current_treatment || 'No current treatment described');
        addWrappedBlock('Plan of the Day', plan.prescription || 'No prescription available');


        const planAt = parsePlanUtcDate(plan.date);
        const planDay = patient.admission_date
          ? Math.ceil(
              (planAt.getTime() - new Date(patient.admission_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : '—';
        const planDate = planAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
        const planTime = planAt.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        });

        addKeyValueRows(
          [
            ['Date', `${planDate} | DAY: ${planDay}`],
            ['Time', planTime],
            ['Progress Sheet ID', formatValue(plan.progress_sheet_id)],
            ['Investigation ID', formatValue(plan.investigation_report_id)],
          ],
          2
        );

        if (index < planData.length - 1) drawDivider();
      });
    }

    // ——— Doctor signature block (bottom) ———
    ensureSpace(42);
    y += 6;
    drawDivider();
    const signBoxW = 55;
    const signBoxH = 22;
    const signBoxX = pageWidth - marginX - signBoxW;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text('Doctor Signature', signBoxX, y);
    y += 3;

    if (doctorSignature) {
      const maxW = signBoxW - 4;
      const maxH = signBoxH - 4;
      let imgW = maxW;
      let imgH = imgW / doctorSignature.aspectRatio;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * doctorSignature.aspectRatio;
      }
      try {
        doc.addImage(
          doctorSignature.dataUrl,
          doctorSignature.format,
          signBoxX + (signBoxW - imgW) / 2,
          y,
          imgW,
          imgH,
          undefined,
          'NONE'
        );
      } catch (err) {
        console.error('Failed to add doctor signature image:', err);
        doc.setDrawColor(180);
        doc.line(signBoxX, y + signBoxH - 6, signBoxX + signBoxW, y + signBoxH - 6);
      }
      y += signBoxH;
    } else {
      doc.setDrawColor(160);
      doc.setLineWidth(0.4);
      doc.line(signBoxX, y + 14, signBoxX + signBoxW, y + 14);
      y += 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30);
    doc.text(doctorName, signBoxX + signBoxW / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text('Attending Doctor', signBoxX + signBoxW / 2, y, { align: 'center' });
    doc.setTextColor(0);

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
                  <span>Plan of day {getPlanDayNumber(index)}</span>
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
                       <span>Plan of day {getPlanDayNumber(index)}</span>

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
                    {(() => {
                      const planAt = parsePlanUtcDate(plan.date);
                      return (
                        <>
                          <div className={styles.prescriptionDate}>
                            Date: {planAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })} | DAY: {Math.ceil((planAt.getTime() - new Date(patient?.admission_date || '').getTime()) / (1000 * 60 * 60 * 24))}
                          </div>
                          <div className={styles.prescriptionTime}>
                            Time: {planAt.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Kolkata',
                            })}
                          </div>
                        </>
                      );
                    })()}
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
          {/* Previous page link — kept for reference
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
          */}
          <div className={styles.investigationReportLinkContainer}>
            <button
              type="button"
              className={styles.investigationReportLink}
              onClick={() => setIsInvestigationModalOpen(true)}
            >
              View Investigation Report
            </button>
          </div>
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
            Downloads the same fields shown on this page: patient details, GCS, input/output, vitals, respiratory, catheters, and all plans of day.
          </p>
        </div>

        <InvestigationCumulativeModal
          isOpen={isInvestigationModalOpen}
          onClose={() => setIsInvestigationModalOpen(false)}
          reports={investigationReports}
          patientName={
            patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : undefined
          }
        />
      </div>
    </>
  );
} 