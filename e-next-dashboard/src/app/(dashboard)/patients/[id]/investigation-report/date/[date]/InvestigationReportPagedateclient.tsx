'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumb from '@/components/common/Breadcrumb';
import { patientService, Patient } from '@/services/patientService';
import { 
  investigationReportService, 
  InvestigationReportData, 
  InvestigationReportListItem 
} from '@/services/investigationReportService';
import styles from '@/styles/investigationReport.module.css';
import AddReportForm from '@/components/patients/investigation-report/AddReportForm';
import { AvailableParameters, InvestigationReport } from '@/types/investigation';
import BloodAnalysisSection from '@/components/investigation/BloodAnalysisSection';
import RadiologySection from '@/components/investigation/RadiologySection';
import ArterialAnalysisSection from '@/components/investigation/ArterialAnalysisSection';
import MicrobiologySection from '@/components/investigation/MicrobiologySection';
import { bloodParameterInfo } from '@/constants/bloodParameters';

interface PageParams {
  id: string;
  date: string;
}

interface TimeSlot {
  time: string;
  displayTime: string;
  isSelected: boolean;
  report_id: string;
}

interface SensitivityTest {
  antibiotic: string;
  result: string;
  sensitivity_power: number | null;
}

interface Organism {
  organism_name: string;
  sensitivity_tests: SensitivityTest[];
}

interface MicrobiologyTest {
  test_type: string;
  specimen_source: string;
  remarks: string;
  organisms: Organism[];
}

export default function InvestigationReportPageClient({ params }: { params: PageParams }) {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<InvestigationReportListItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<InvestigationReport | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableParameters, setAvailableParameters] = useState<AvailableParameters | null>(null);
  const [activeTab, setActiveTab] = useState('bloodAnalysis');

  useEffect(() => {
    loadPatientDetails();
  }, [params.id]);

  useEffect(() => {
    if (patient) {
      loadInvestigationReports();
    }
  }, [patient]);

  useEffect(() => {
    loadAvailableParameters();
  }, []);

  const loadPatientDetails = async () => {
    try {
      const response = await patientService.getById(params.id);
      if (response.success && response.data) {
        setPatient(response.data as unknown as Patient);
      }
    } catch (err) {
      console.error('Error loading patient details:', err);
      setError('Failed to load patient details');
    }
  };

  const loadInvestigationReports = async () => {
    if (!patient) return;

    try {
      // Get the selected date from params and create date range
      const selectedDate = new Date(params.date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const response = await investigationReportService.listInvestigationReports(patient.id, {
        page: 1,
        limit: 100,
        sort_order: 'desc',
        from_date: selectedDate.toISOString().split('T')[0],
        to_date: selectedDate.toISOString().split('T')[0]
      });

      if (response.success && response.data) {
        setReports(response.data.items);
        
        // console.log('=== Investigation Reports Loading ===');
        // console.log('Total reports from backend:', response.data.items.length);
        
        // Create time slots only from actual analysis_date timestamps
        // Backend provides IST timestamps, parse them directly
        const slots = response.data.items.map((report, index) => {
          // console.log(`\n--- Report ${index + 1} ---`);
          // console.log('Raw analysis_date from backend:', report.analysis_date);
          
          // TEMPORARY: Force UTC interpretation by ensuring datetime has Z suffix
          // Backend sends IST time, but we're treating it as UTC for now
          const dateString = report.analysis_date.endsWith('Z') 
            ? report.analysis_date 
            : `${report.analysis_date}Z`;
          
          const date = new Date(dateString);
          // console.log('Modified dateString (with Z):', dateString);
          // console.log('Parsed Date object:', date);
          // console.log('Date toString():', date.toString());
          // console.log('Date toISOString():', date.toISOString());
          
          // Using UTC methods to extract time
          const hours = date.getUTCHours();
          const minutes = date.getUTCMinutes();
          // console.log('Extracted hours (UTC):', hours);
          // console.log('Extracted minutes (UTC):', minutes);
          
          // NOTE: When backend properly sends IST, revert to:
          // const date = new Date(report.analysis_date);
          // const hours = date.getHours();
          // const minutes = date.getMinutes();
          
          const displayHours = hours % 12 || 12;
          const ampm = hours >= 12 ? 'PM' : 'AM';
          // console.log('Display hours (12h format):', displayHours);
          // console.log('AM/PM:', ampm);
          
          const timeSlot = {
            time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            displayTime: `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`,
            isSelected: false,
            report_id: report.report_id
          };
          
          // console.log('Final time slot:', timeSlot);
          
          return timeSlot;
        });

        // Sort slots by time
        // console.log('\n=== Before Sorting ===');
        // console.log('Time slots:', slots.map(s => s.displayTime).join(', '));
        
        slots.sort((a, b) => {
          const [aHours, aMinutes] = a.time.split(':').map(Number);
          const [bHours, bMinutes] = b.time.split(':').map(Number);
          return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
        });

        // console.log('\n=== After Sorting ===');
        // console.log('Time slots:', slots.map(s => s.displayTime).join(', '));
        // console.log('=== End Investigation Reports Loading ===\n');

        setTimeSlots(slots);
      }
    } catch (err) {
      console.error('Error loading investigation reports:', err);
      setError('Failed to load investigation reports');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableParameters = async () => {
    try {
      const response = await investigationReportService.getAvailableParameters();
      if (response.success && response.data) {
        setAvailableParameters(response.data);
      }
    } catch (err) {
      console.error('Error loading available parameters:', err);
    }
  };

  const handleTimeSelect = async (slot: TimeSlot) => {
    try {
      const response = await investigationReportService.getInvestigationReport(slot.report_id);
      if (response.success && response.data) {
        setSelectedReport(response.data as unknown as InvestigationReport);
        
        // Update selected state in time slots
        setTimeSlots(prev => prev.map(s => ({
          ...s,
          isSelected: s.time === slot.time
        })));
      }
    } catch (err) {
      console.error('Error loading report details:', err);
      setError('Failed to load report details');
    }
  };

  const handleAddNewReport = async () => {
    setShowAddForm(true);
  };

  const handleAddReportSubmit = async (date: string, time: string) => {
    if (!patient) return;

    try {
      // Send datetime in IST format (without Z suffix so backend interprets as IST)
      const analysisDate = `${date}T${time}:00`;
      const response = await investigationReportService.createInvestigationReport({
        patient_id: patient.id,
        analysis_date: analysisDate
      }, patient.organisation_id);

      if (response.success) {
        // After creating the report, reload the list to show the new time slot
        await loadInvestigationReports();
        setShowAddForm(false);
        
        // Select the newly created report
        const newReport = await investigationReportService.getInvestigationReport(response.data.report_id);
        if (newReport.success && newReport.data) {
          setSelectedReport(newReport.data as unknown as InvestigationReport);
          
          // Update time slots to show the new report as selected
          const [hours, minutes] = time.split(':').map(Number);
          const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          setTimeSlots(prev => prev.map(s => ({
            ...s,
            isSelected: s.time === timeString
          })));
        }
      } else {
        setError(response.message || 'Failed to create new report');
      }
    } catch (err) {
      console.error('Error creating new report:', err);
      setError('Failed to create new report');
    }
  };

  const handleAddReportCancel = () => {
    setShowAddForm(false);
  };

  // Removed handleSectionToggle as we're using tabs now

  const handleEditBloodAnalysis = async (parameters: Array<{ parameter: string; value: number | string }>) => {
    if (!selectedReport || !patient) return;
    
    try {
      const response = await investigationReportService.updateBloodAnalysis(
        selectedReport.report_id,
        patient.organisation_id,
        parameters
      );
      
      if (response.success) {
        // Refresh the report data
        const updatedReport = await investigationReportService.getInvestigationReport(selectedReport.report_id);
        if (updatedReport.success && updatedReport.data) {
          setSelectedReport(updatedReport.data as unknown as InvestigationReport);
        }
      }
    } catch (err) {
      console.error('Error updating blood analysis:', err);
    }
  };

  const handleEditArterialAnalysis = async (parameters: Array<{ parameter: string; value: number | string }>) => {
    if (!selectedReport || !patient) return;
    
    try {
      const response = await investigationReportService.updateArterialAnalysis(
        selectedReport.report_id,
        patient.organisation_id,
        parameters
      );
      
      if (response.success) {
        // Refresh the report data
        const updatedReport = await investigationReportService.getInvestigationReport(selectedReport.report_id);
        if (updatedReport.success && updatedReport.data) {
          setSelectedReport(updatedReport.data as unknown as InvestigationReport);
        }
      }
    } catch (err) {
      console.error('Error updating arterial analysis:', err);
    }
  };

  const handleEditMicrobiology = async (data: { tests: MicrobiologyTest[] }) => {
    if (!selectedReport || !patient) return;
    
    try {
      const response = await investigationReportService.updateMicrobiology(
        selectedReport.report_id,
        patient.organisation_id,
        data
      );
      
      if (response.success) {
        const updatedReport = await investigationReportService.getInvestigationReport(selectedReport.report_id);
        if (updatedReport.success && updatedReport.data) {
          setSelectedReport(updatedReport.data as unknown as InvestigationReport);
        }
      }
    } catch (err) {
      console.error('Error updating microbiology:', err);
    }
  };
  const BedIcon = ({ bedNumber }: { bedNumber: number }) => (
    <svg width="95" height="112" viewBox="0 0 90 80" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  const handleRadiologyUpload = async (radiologyData: Array<{ radiology_type: string; subtype: string; file_indices: number[] }>, files: File[]) => {
    if (!selectedReport || !patient) return;
    
    try {
      const formData = new FormData();
      
      // Add radiology_data as a string
      formData.append('radiology_data', JSON.stringify(radiologyData));
      
      // Add all files
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await investigationReportService.uploadRadiologyImages(
        selectedReport.report_id,
        patient.organisation_id,
        formData
      );
      
      if (response.success) {
        const updatedReport = await investigationReportService.getInvestigationReport(selectedReport.report_id);
        if (updatedReport.success && updatedReport.data) {
          setSelectedReport(updatedReport.data as unknown as InvestigationReport);
        }
      }
    } catch (err) {
      console.error('Error uploading radiology images:', err);
      setError('Failed to upload radiology images. Please try again.');
    }
  };

  const handleRadiologyDelete = async (fileKey: string) => {
    if (!selectedReport || !patient) return;
    
    try {
      const response = await investigationReportService.deleteRadiologyImage(
        selectedReport.report_id,
        patient.organisation_id,
        fileKey
      );
      
      if (response.success) {
        // Refresh the report data to update the images list
        const updatedReport = await investigationReportService.getInvestigationReport(selectedReport.report_id);
        if (updatedReport.success && updatedReport.data) {
          setSelectedReport(updatedReport.data as unknown as InvestigationReport);
        }
      } else {
        setError('Failed to delete radiology image. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting radiology image:', err);
      setError('Failed to delete radiology image. Please try again.');
    }
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
    { label: 'Investigation Report', href: `/patients/${params.id}/investigation-report` },
    { label: params.date }
  ];

  const formatDateDMY = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    return year && month && day ? `${day}-${month}-${year}` : isoDate;
  };

  return (
    <>
    <h2 style={{fontSize: '28px', fontWeight: '600'}}>Investigation Report</h2>
      <Breadcrumb items={breadcrumbItems} />
      <div className={styles.container}>
        {/* <div className={styles.header}>
          <div className={styles.dateInfo}>
            <span>Date: {params.date}</span>
            <span>Day: {params.date ? Math.ceil((new Date(params.date).getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24)) : ''}</span>
          </div>
        </div> */}

        <div className={styles.patientCard}>
          <div className={styles.bedInfo}>
            {/* <span className={styles.bedIcon}>🛏️</span> */}
            <BedIcon bedNumber={patient.organisation_icu_bed_number || 0} />
          </div>
          
          <div className={styles.patientInfo}>
            <div className={styles.infoRow}>
              <div>
                <label>Patient Name:</label>
                <span>{patient.first_name} {patient.last_name}</span>
              </div>
            </div>
            <div className={styles.infoRow}>
            <div>
                <label>Patient ID:</label>
                <span>{patient.unique_id}</span>
              </div>
            </div>
            <div className={styles.infoRow}>
              <div>
                <label>Admission Date:</label>
                <span>{new Date(patient.admission_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            </div>
          </div>

          
                  </div>
         <div className={styles.addButtonContainer}>
           <div className={styles.dateSelector}>
           <h3 style={{fontSize: '18px', fontWeight: '600'}}>Select Date</h3>

             <div className={styles.datePickerWrapper}>
             <input
              type="date"
              lang="en-GB"
              value={params.date}
              min={patient?.admission_date.split('T')[0]}
              max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
              onChange={(e) => {
                const newDate = e.target.value;
                const selectedDate = new Date(newDate + 'T00:00:00');
                const admissionDate = new Date(patient?.admission_date);
                // Get current date in IST
                const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                 
                 if (selectedDate < admissionDate) {
                   alert("Cannot select a date before admission date");
                   return;
                 }
                 
                 if (selectedDate > today) {
                   alert("Cannot select a future date");
                   return;
                 }
                 
                 if (newDate) {
                   router.push(`/patients/${params.id}/investigation-report/date/${newDate}`);
                 }
               }}
               className={styles.datePicker}
             />
             <span className={styles.datePickerValue}>
               {formatDateDMY(params.date)}
             </span>
             </div>
           </div>
           <button 
              className={styles.addButton}
              onClick={handleAddNewReport}
           >
             + Add New Report
           </button>
         </div>
        {showAddForm && (
          <AddReportForm
            onSubmit={handleAddReportSubmit}
            onCancel={handleAddReportCancel}
            params={{ date: params.date }}
          />
        )}
          <h3 style={{fontSize: '18px', fontWeight: '600', marginLeft: '12px'}}>Select Time</h3>

        <div className={styles.timeSelection}>
          {timeSlots.map((slot, index) => (
            <button
              key={index}
              className={`${styles.timeSlot} ${slot.isSelected ? styles.selected : ''}`}
              onClick={() => handleTimeSelect(slot)}
            >
              <span className={styles.timeText}>{slot.displayTime}</span>
            </button>
          ))}
        </div>

        {selectedReport && availableParameters && (
          <div className={styles.sections}>
            <div className={styles.tabsContainer}>
              <button 
                className={`${styles.tabButton} ${activeTab === 'bloodAnalysis' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('bloodAnalysis')}
              >
                Blood Analysis
              </button>
              <button 
                className={`${styles.tabButton} ${activeTab === 'radiology' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('radiology')}
              >
                Radiology
              </button>
              <button 
                className={`${styles.tabButton} ${activeTab === 'arterialAnalysis' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('arterialAnalysis')}
              >
                Arterial Analysis
              </button>
              <button 
                className={`${styles.tabButton} ${activeTab === 'microbiology' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('microbiology')}
              >
                Microbiology
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'bloodAnalysis' && (
                <BloodAnalysisSection
                  values={selectedReport.blood_analysis?.values}
                  availableParameters={availableParameters.blood_parameters}
                  parameterInfo={bloodParameterInfo}
                  isExpanded={true}
                  onEdit={handleEditBloodAnalysis}
                  onToggle={() => {}}
                />
              )}

              {activeTab === 'arterialAnalysis' && (
                <ArterialAnalysisSection
                  values={selectedReport.arterial_analysis?.values}
                  availableParameters={availableParameters.arterial_parameters}
                  isExpanded={true}
                  onEdit={handleEditArterialAnalysis}
                  onToggle={() => {}}
                />
              )}

              {activeTab === 'microbiology' && (
                <MicrobiologySection
                  values={selectedReport.microbiology}
                  availableParameters={availableParameters.microbiology_parameters}
                  isExpanded={true}
                  onEdit={handleEditMicrobiology}
                  onToggle={() => {}}
                />
              )}

              {activeTab === 'radiology' && (
                <RadiologySection
                  images={selectedReport.radiology_list}
                  availableTypes={availableParameters.radiology_types}
                  isExpanded={true}
                  onUpload={handleRadiologyUpload}
                  onDelete={handleRadiologyDelete}
                  presignedUrls={selectedReport.presigned_urls}
                  onToggle={() => {}}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
