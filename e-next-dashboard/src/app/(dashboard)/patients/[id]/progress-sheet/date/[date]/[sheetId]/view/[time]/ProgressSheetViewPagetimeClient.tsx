'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumb from '@/components/common/Breadcrumb';
import { patientService, Patient } from '@/services/patientService';
import { progressSheetService, ProgressSheet, ProgressSheetEntry } from '@/services/progressSheetService';
import { catheterService, CatheterEntry, getCatheterSource } from '@/services/catheterService';
import FluidForm, { FluidData } from '@/components/forms/FluidForm';
import VitalsForm, { VitalsData } from '@/components/forms/VitalsForm';
import RespiratoryForm, { RespiratoryData } from '@/components/forms/RespiratoryForm';
import CatheterForm, { CatheterData } from '@/components/forms/CatheterForm';
import CatheterEditModal from '@/components/forms/CatheterEditModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import styles from '@/styles/progress-sheet-view.module.css';
import GCSForm, { GCSData } from '@/components/forms/GCSForm';
import EditButton from '@/components/common/EditButton';
type PageParams = {
    id: string;
    date: string;
    sheetId: string;
    time: string;
  };
  
// type ProgressTab = 'GCS & Power' | 'Fluid' | 'Vitals' | 'Blood Gases' | 'Respiratory' | 'Catheter';
type ProgressTab = 'GCS & Power' | 'Input/Output' | 'Vitals' | 'Respiratory' | 'Catheter';

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
  const [activeTab, setActiveTab] = useState<ProgressTab>('GCS & Power');
  const [isEditing, setIsEditing] = useState(false);
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
  }, [params.id, params.sheetId, params.time]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load patient details
      const patientResponse = await patientService.getById(params.id);
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data as unknown as Patient);
      }

      // Load progress sheet
      const sheetResponse = await progressSheetService.getBySheetId(params.sheetId);
      if (sheetResponse.success && sheetResponse.data) {
        const progressSheet = sheetResponse.data;
        const decodedTime = decodeURIComponent(params.time);
        const foundEntry = progressSheet.entries && progressSheet.entries.find(e => e.time === decodedTime);
        
        if (foundEntry) {
          setEntry(foundEntry);
        } else {
          // Initialize with empty entry
          const emptyEntry: ProgressSheetEntry = {
            time: decodedTime,
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
      }

      // Load catheter data separately
      await reloadCatheterData();
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const reloadCatheterData = async () => {
    try {
      const catheterResponse = await catheterService.getByPatientId(params.id);
      // console.log('Reloading catheter data:', catheterResponse);
      if (catheterResponse.success && catheterResponse.data) {
        // The API response has nested data structure: response.data.data.items
        const items = catheterResponse.data.items || [];
        // console.log('Found items:', items);
        const catheterEntries: CatheterEntry[] = items.map((item: any) => ({
          id: item.id,
          type: item.type,
          catheter_type: item.catheter_type,
          size: item.size,
          site: item.site,
          date_of_insertion: item.date_of_insertion,
          source: getCatheterSource(item.source),
          date_of_removal: item.date_of_removal,
          days_in_use: null, // Will be calculated dynamically
          notes: item.notes
        }));
        
        // Force a new object reference to ensure React detects the change
        const newCatheterData = { entries: [...catheterEntries] };
        setCatheterData(newCatheterData);
        // console.log('Updated catheter data:', newCatheterData);
        // console.log('Current catheterData state should now have', catheterEntries.length, 'entries');
      } else {
        // console.log('No catheter data found, setting empty array');
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
      // console.log('Deleting catheter:', catheterToDelete);
      await catheterService.delete(catheterToDelete);
      // console.log('Catheter deleted successfully, reloading data...');
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
        // console.log('Updating catheter:', editingCatheter.id, catheterDataForApi);
        await catheterService.update(editingCatheter.id, catheterDataForApi);
      } else {
        // Create new catheter
        // console.log('Creating new catheter:', catheterDataForApi);
        await catheterService.create(params.id, { entries: [catheterDataForApi] });
      }
      
      // console.log('Catheter saved successfully, reloading data...');
      await reloadCatheterData();
      
      setIsModalOpen(false);
      setEditingCatheter(null);
    } catch (error) {
      console.error('Failed to save catheter:', error);
    }
  };

  const renderProgressTabs = () => {
    // const tabs: ProgressTab[] = ['GCS & Power', 'Fluid', 'Vitals', 'Blood Gases', 'Respiratory', 'Catheter'];
    const tabs: ProgressTab[] = ['GCS & Power', 'Input/Output', 'Vitals', 'Respiratory', 'Catheter'];

    return (
      <div className={styles.progressTabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setIsEditing(false);
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    );
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
        "Sedation": false,
        "Pain": false,
        "RUL": null,
        "LUL": null,
        "LLL": null,
        "RLL": null,
        "Pupil Type": null
      }
    };

    if (isEditing) {
      return (
        <GCSForm
          initialValues={gcsData}
          time={entry.time}
          onSubmit={async (time: string, values: GCSData) => {
            try {
              await progressSheetService.updateGCSEntry(params.sheetId, entry.time, values, null);
              setEntry(prev => prev ? {
                ...prev,
                gcs: values
              } : null);
              setIsEditing(false);
            } catch (error) {
              console.error('Failed to update gcs data:', error);
            }
          }}
        />
      );
    }

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

    if (isEditing) {
      return (
        <FluidForm
          initialValues={fluidData}
          time={entry.time}
          onSubmit={async (time: string, values: FluidData) => {
            try {
              await progressSheetService.updateFluidEntry(params.sheetId, entry.time, values, null);
              setEntry(prev => prev ? {
                ...prev,
                fluid: values
              } : null);
              setIsEditing(false);
            } catch (error) {
              console.error('Failed to update fluid data:', error);
            }
          }}
        />
      );
    }

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

    if (isEditing) {
      return (
        <VitalsForm
          initialValues={vitalsData}
          time={entry.time}
          onSubmit={async (time: string, values: VitalsData) => {
            try {
              await progressSheetService.updateVitalsEntry(params.sheetId, entry.time, values);
              setEntry(prev => prev ? {
                ...prev,
                vitals: values
              } : null);
              setIsEditing(false);
            } catch (error) {
              console.error('Failed to update vitals data:', error);
            }
          }}
        />
      );
    }

    return (
      <VitalsForm
        initialValues={vitalsData}
        time={entry.time}
        isViewMode={true}
        onSubmit={() => {}}
      />
    );
  };

  // const renderBloodGasContent = () => {
  //   if (!entry) return null;

  //   const bloodGasData: BloodGasData = entry.blood_gas ?? {
  //     values: {
  //       "pH": null,
  //       "pO2": null,
  //       "CO2-P": null,
  //       "CO2-ET": null,
  //       "BE": null,
  //       "Sat %": null,
  //       "Lac": null,
  //       "K+": null,
  //       "Hb": null,
  //       "Glucose": null,
  //       "Insulin": null
  //     }
  //   };

  //   if (isEditing) {
  //     return (
  //       <BloodGasForm
  //         initialValues={bloodGasData}
  //         time={entry.time}
  //         onSubmit={async (time: string, values: BloodGasData) => {
  //           try {
  //             await progressSheetService.updateBloodGasEntry(params.sheetId, entry.time, values);
  //             setEntry(prev => prev ? {
  //               ...prev,
  //               blood_gas: values
  //             } : null);
  //             setIsEditing(false);
  //           } catch (error) {
  //             console.error('Failed to update blood gas data:', error);
  //           }
  //         }}
  //       />
  //     );
  //   }

  //   return (
  //     <BloodGasForm
  //       initialValues={bloodGasData}
  //       time={entry.time}
  //       isViewMode={true}
  //       onSubmit={() => {}}
  //     />
  //   );
  // };

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

    if (isEditing) {
      return (
        <RespiratoryForm
          initialValues={respiratoryData}
          time={params.time}
          onSubmit={async (time: string, values: RespiratoryData) => {
            try {
              await progressSheetService.updateRespiratoryEntry(params.sheetId, entry.time, values);
              setEntry(prev => prev ? {
                ...prev,
                respiratory: values
              } : null);
              setIsEditing(false);
            } catch (error) {
              console.error('Failed to update respiratory data:', error);
            }
          }}
        />
      );
    }

    return (
      <RespiratoryForm
        initialValues={respiratoryData}
        time={params.time}
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

    // console.log('Rendering catheter content with data:', currentCatheterData);
    // console.log('Number of entries being rendered:', currentCatheterData.entries.length);

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
          key={editingCatheter?.id || 'new'}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'GCS & Power':
        return (
          <div className={styles.tabContentContainer}>
            <div className={styles.tabHeader}>
              <h3>GCS & Power Parameters</h3>
              {!isEditing && entry && (
                
                <EditButton onClick={() => setIsEditing(true)} />
                                // <button 
                //   className={`${styles.editButton} ${!entry.gcs ? styles.createButton : ''}`} 
                //   onClick={() => setIsEditing(true)}
                // >
                //   {!entry.gcs ? 'Create Entry' : 'Edit Details'}
                // </button>
              )}
            </div>
            {renderGCSContent()}
          </div>
        );
      case 'Input/Output':
        return (
          <div className={styles.tabContentContainer}>
            <div className={styles.tabHeader}>
              <h3>Input/Output Parameters</h3>
              {!isEditing && entry && (
                  <EditButton onClick={() => setIsEditing(true)} />

                // <button 
                //   className={`${styles.editButton} ${!entry.fluid ? styles.createButton : ''}`} 
                //   onClick={() => setIsEditing(true)}
                // >
                //   {!entry.fluid ? 'Create Entry' : 'Edit Details'}
                // </button>
              )}
            </div>
            {renderFluidContent()}
          </div>
        );
      case 'Vitals':
        return (
          <div className={styles.tabContentContainer}>
            
            <div className={styles.tabHeader}>
              <h3>Vital Parameters</h3>
              {!isEditing && entry && (
                // <EditButton onClick={handleEdit} />
                <EditButton onClick={() => setIsEditing(true)} />

                // <button 
                //   className={`${styles.editButton} ${!entry.vitals ? styles.createButton : ''}`} 
                //   onClick={() => setIsEditing(true)}
                // >
                //   {!entry.vitals ? 'Create Entry' : 'Edit Details'}
                // </button>
              )}
            </div>
            {renderVitalsContent()}
          </div>
        );
      // case 'Blood Gases':
      //   return (
      //     <div className={styles.tabContentContainer}>
      //       <div className={styles.tabHeader}>
      //         <h3>Blood Gas Parameters</h3>
      //         {!isEditing && entry && (
      //           <EditButton onClick={() => setIsEditing(true)} />

      //           // <button 
      //           //   className={`${styles.editButton} ${!entry.blood_gas ? styles.createButton : ''}`} 
      //           //   onClick={() => setIsEditing(true)}
      //           // >
      //           //   {!entry.blood_gas ? 'Create Entry' : 'Edit Details'}
      //           // </button>
      //         )}
      //       </div>
      //       {renderBloodGasContent()}
      //     </div>
      //   );
      case 'Respiratory':
        return (
          <div className={styles.tabContentContainer}>
            <div className={styles.tabHeader}>
              <h3>Respiratory Parameters</h3>
              {!isEditing && entry && (
                <EditButton onClick={() => setIsEditing(true)} />

                // <button 
                //   className={`${styles.editButton} ${!entry.respiratory ? styles.createButton : ''}`} 
                //   onClick={() => setIsEditing(true)}
                // >
                //   {!entry.respiratory ? 'Create Entry' : 'Edit Details'}
                // </button>
              )}
            </div>
            {renderRespiratoryContent()}
          </div>
        );
      case 'Catheter':
        return (
          <div className={styles.tabContentContainer}>
            <div className={styles.tabHeader}>
              <h3>Catheter Details</h3>
            </div>
            {renderCatheterContent()}
          </div>
        );
      default:
        return null;
    }
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
    { label: 'Progress Sheet', href: `/patients/${params.id}/progress-sheet` },
    { label: params.date , href: `/patients/${params.id}/progress-sheet/date/${params.date}` },
    { label: 'View Entry' }
  ];

  return (
      <>
      <div className={styles.pageContainer}>
        <Breadcrumb items={breadcrumbItems} />
        
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.dateInfo}>
              <span>Date: {params.date}</span>
              <span>Day: {params.date ? Math.ceil((new Date(params.date + 'T00:00:00').getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24)) : ''}</span>
            </div>
          </div>
          {/* <button className={styles.editButton} onClick={handleEdit}>
            Edit Details
          </button> */}
        </div>

        <div className={styles.patientCard}>
          <div className={styles.patientIcon}>
            {/* <span className={styles.bedIcon}>🛏️</span> */}
            <BedIcon bedNumber={patient.organisation_icu_bed_number || 0} />
            {/* <span>Bed No {patient.organisation_icu_bed_number}</span> */}
          </div>
          
          <div className={styles.patientInfo}>
            {/* <div className={styles.infoRow}> */}
              <div className={styles.infoRow}>
                <label>Patient Name:</label>
                <span>{patient.first_name} {patient.last_name}</span>
              </div>
              <div className={styles.infoRow}>
                <label>Patient ID:</label>
                <span>{patient.unique_id}</span>
              </div>
            {/* </div> */}
            {/* <div className={styles.infoRow}> */}
              <div className={styles.infoRow}>
                <label>Progress Date:</label>
                <span>{new Date(params.date + 'T00:00:00').toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
              <div className={styles.infoRow}>
                <label>Progress Time:</label>
                <span>{decodeURIComponent(params.time)}</span>
              </div>
            {/* </div> */}
            </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <h2>Progress Parameters</h2>
            {/* <button className={styles.editButton} onClick={handleEdit}>
              Edit Details
            </button> */}
          </div>
          {renderProgressTabs()}
          <div className={styles.tabContentContainer}>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
} 