'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/history-page-style/edit-patient-investigation.module.css';
import { patientService } from '@/services/patientService';
import { bloodAnalysisTests } from '@/constants/investigationConstants';

// const bloodAnalysisTests = [
//   "Haemoglobin",
//   "TLC",
//   "PCV",
//   "Platelet",
//   "CBC",
//   "B. Urea",
//   "S. Creatinine",
//   "Sodium",
//   "Potassium",
//   "Chloride",
//   "Bicarbonate",
//   "Ammonia",
//   "Total Protein",
//   "Albumin",
//   "Bilirubin (T)",
//   "Bilirubin (D)",
//   "SGPT/ALT",
//   "SGOT/AST",
//   "ALP",
//   "GGT",
//   "S. Uric Acid",
//   "S. Phosphorus",
//   "Calcium",
//   "Magnesium",
//   "CPK",
//   "CK MB",
//   "TROP I",
//   "PT",
//   "INR",
//   "APTT",
//   "TSH",
//   "T3",
//   "T4",
//   "Procalcitonin",
//   "BUN",
//   "Pro BUN",
//   "C-Reactive Protein",
//   "Urine R/M",
//   "ABG",
//   "CSF BioChemistory"
// ];

// Microbiology Tests
const microbiologyTests = [
  'Blood C/S', 'ET C/S', 'ET-Gram Stain',  'Urine C/S', 'CSF-Gram Stain' , 'CSF Culture'
];

// Radiology Types and Subtypes
const radiologyTypes = {
  'X-Ray': [
    'Chest PA', 'Chest AP', 'Chest Lateral', 'Abdomen AP', 'KUB'
  ],
  'CT Scan': [
    'Head',
    'Head-Contrast',
    'Neck',
    'Neck-Contrast',
    'Thorax',
    'Thorax-Contrast',
    'Abdomen',
    'Abdomen-Contrast',
    'Whole Body',
    'KUB',
    'KUB-Contrast'
  ],
  'MRI': [
    'Head',
    'Head-Contrast',
    'Neck',
    'Neck-Contrast',
    'Thorax',
    'Thorax-Contrast',
    'Abdomen',
    'Abdomen-Contrast',
    'Whole Body',
    'KUB',
    'KUB-Contrast'
  ],
  'Ultrasound': [
    'Whole Abdomen', 'KUB' , 'Venous Doppler' , 'Arterial Doppler'
  ],
  'ECG': []
};

const arterialAnalysisTests = [
  "pH",
  "pCO2",
  "pO2",
  "Hcl",
  "K+",
  "Na+",
  "Ca2+",
  "Cl-",
  "Lac",
  "Hbc",
  "HCO3-(P)c",
  "Base (B)c",
  "Anion Gapc",
  "sO2e"
];

interface InvestigationFormProps {
  patientId: string;
}

export default function InvestigationForm({ patientId }: InvestigationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  
  const [expandedSections, setExpandedSections] = useState({
    bloodAnalysis: true,
    radiology: false,
    microbiology: false,
    arterialAnalysis: false
  });

  // Update the interface in the state to support multiple subtypes
  const [selectedTests, setSelectedTests] = useState({
    bloodAnalysis: [] as string[],
    radiology: [] as Array<{ type: string; subtypes: string[] }>,
    microbiology: [] as string[],
    arterialAnalysis: [] as string[]
  });

  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleDropdown = (type: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside all dropdowns
      Object.keys(openDropdowns).forEach(type => {
        if (openDropdowns[type] && dropdownRefs.current[type]) {
          if (!dropdownRefs.current[type]?.contains(target)) {
            setOpenDropdowns(prev => ({
              ...prev,
              [type]: false
            }));
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdowns]);

  useEffect(() => {
    loadInvestigationData();
  }, [patientId]);

  const loadInvestigationData = async () => {
    try {
      const response = await patientService.getPatientInfo(patientId);
      if (response.success && response.data) {
        const investigation = response.data.investigation;
        
        // Transform radiology data to match our component's format
        const radiologyData = investigation.radiology.reduce((acc, item) => {
          const existingType = acc.find(r => r.type === item.type);
          if (existingType) {
            existingType.subtypes = [...new Set([...existingType.subtypes, ...item.subtypes])];
            return acc;
          }
          return [...acc, { type: item.type, subtypes: item.subtypes || [] }];
        }, [] as Array<{ type: string; subtypes: string[] }>);

        const newData = {
          bloodAnalysis: investigation.blood_analysis || [],
          radiology: radiologyData,
          microbiology: investigation.microbiology || [],
          arterialAnalysis: investigation.arterial_analysis || []
        };

        setSelectedTests(newData);
        setOriginalData(newData);

        // Expand sections that have data
        setExpandedSections(prev => ({
          ...prev,
          bloodAnalysis: newData.bloodAnalysis.length > 0,
          radiology: newData.radiology.length > 0,
          microbiology: newData.microbiology.length > 0,
          arterialAnalysis: newData.arterialAnalysis.length > 0
        }));
      }
    } catch (err) {
      console.error('Error loading investigation data:', err);
      setError('Failed to load investigation data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBloodAnalysisChange = (test: string) => {
    setSelectedTests(prev => ({
      ...prev,
      bloodAnalysis: prev.bloodAnalysis.includes(test)
        ? prev.bloodAnalysis.filter(t => t !== test)
        : [...prev.bloodAnalysis, test]
    }));
  };

  const handleRadiologyChange = (type: string, selectedSubtypes: string[] = []) => {
    setSelectedTests(prev => {
      const existingIndex = prev.radiology.findIndex(r => r.type === type);
      
      if (existingIndex !== -1) {
        const newRadiology = [...prev.radiology];
        if (selectedSubtypes.length === 0) {
          // If no subtypes selected, remove the type entirely
          return {
            ...prev,
            radiology: prev.radiology.filter(r => r.type !== type)
          };
        }
        // Update subtypes for existing type
        newRadiology[existingIndex] = { type, subtypes: selectedSubtypes };
        return { ...prev, radiology: newRadiology };
      }
      
      // Add new type with selected subtypes
      if (selectedSubtypes.length > 0) {
        return {
          ...prev,
          radiology: [...prev.radiology, { type, subtypes: selectedSubtypes }]
        };
      }
      
      return prev;
    });
  };

  const handleMicrobiologyChange = (test: string) => {
    setSelectedTests(prev => ({
      ...prev,
      microbiology: prev.microbiology.includes(test)
        ? prev.microbiology.filter(t => t !== test)
        : [...prev.microbiology, test]
    }));
  };

  const handleArterialAnalysisChange = (test: string) => {
    setSelectedTests(prev => ({
      ...prev,
      arterialAnalysis: prev.arterialAnalysis.includes(test)
        ? prev.arterialAnalysis.filter(t => t !== test)
        : [...prev.arterialAnalysis, test]
    }));
  };

  const getChangedFields = () => {
    // Always return data in the format expected by the API
    return {
      patient_id: patientId,
      blood_analysis: selectedTests.bloodAnalysis,
      radiology: selectedTests.radiology.map(({ type, subtypes }) => ({
        type,
        subtypes: subtypes
      })),
      microbiology: selectedTests.microbiology,
      arterial_analysis: selectedTests.arterialAnalysis
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData = getChangedFields();
      const response = await patientService.updateInvestigation(patientId, updateData);

      if (response.success) {
        router.push(`/patients/${patientId}/history`);
      } else {
        setError(response.message || 'Failed to update investigation');
      }
    } catch (err) {
      console.error('Error updating investigation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update investigation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading investigation data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Blood Analysis Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('bloodAnalysis')}
        >
          <h2>Blood Analysis</h2>
          <span>{expandedSections.bloodAnalysis ? '-' : '+'}</span>
        </div>
        {expandedSections.bloodAnalysis && (
          <div className={styles.sectionContent}>
            <div className={styles.checkboxGrid}>
              {bloodAnalysisTests.map(test => (
                <label key={test} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedTests.bloodAnalysis.includes(test)}
                    onChange={() => handleBloodAnalysisChange(test)}
                  />
                  {test}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Radiology Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('radiology')}
        >
          <h2>Radiology</h2>
          <span>{expandedSections.radiology ? '-' : '+'}</span>
        </div>
        {expandedSections.radiology && (
          <div className={styles.sectionContent}>
            <div className={styles.radiologyGrid}>
              {Object.entries(radiologyTypes).map(([type, subtypes]) => {
                const selectedRadiology = selectedTests.radiology.find(r => r.type === type);
                return (
                  <div key={type} className={styles.radiologyItem}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!selectedRadiology}
                        onChange={(e) => {
                          if (subtypes.length === 0) {
                            // For types without subtypes (like ECG), toggle selection
                            if (e.target.checked) {
                              setSelectedTests(prev => ({
                                ...prev,
                                radiology: [...prev.radiology, { type, subtypes: [] }]
                              }));
                            } else {
                              setSelectedTests(prev => ({
                                ...prev,
                                radiology: prev.radiology.filter(r => r.type !== type)
                              }));
                            }
                          } else {
                            // For types with subtypes
                            if (!e.target.checked) {
                              handleRadiologyChange(type, []);
                              // Close dropdown when unchecking
                              setOpenDropdowns(prev => ({
                                ...prev,
                                [type]: false
                              }));
                            } else {
                              // Initialize with empty subtypes array when first selected
                              setSelectedTests(prev => ({
                                ...prev,
                                radiology: [...prev.radiology, { type, subtypes: [] }]
                              }));
                              // Auto-open dropdown when checking
                              setOpenDropdowns(prev => ({
                                ...prev,
                                [type]: true
                              }));
                            }
                          }
                        }}
                      />
                      {type}
                    </label>
                    {subtypes.length > 0 && (
                      <div 
                        ref={(el) => { dropdownRefs.current[type] = el; }}
                        className={`${styles.customDropdown} ${!selectedRadiology ? styles.disabled : ''}`}
                      >
                        <div 
                          className={styles.dropdownHeader}
                          onClick={() => {
                            if (selectedRadiology) {
                              toggleDropdown(type);
                            }
                          }}
                          style={{ cursor: selectedRadiology ? 'pointer' : 'not-allowed', opacity: selectedRadiology ? 1 : 0.5 }}
                        >
                          {selectedRadiology?.subtypes.length 
                            ? `${selectedRadiology.subtypes.length} selected` 
                            : 'Select options'}
                          <span className={styles.dropdownArrow}>
                            {openDropdowns[type] ? '▼' : '▶'}
                          </span>
                        </div>
                        {openDropdowns[type] && selectedRadiology && (
                          <div className={styles.dropdownContent}>
                            {subtypes.map(subtype => (
                              <label key={subtype} className={styles.dropdownItem}>
                                <input
                                  type="checkbox"
                                  checked={selectedRadiology?.subtypes.includes(subtype) || false}
                                  onChange={() => {
                                    const currentSubtypes = selectedRadiology?.subtypes || [];
                                    const newSubtypes = currentSubtypes.includes(subtype)
                                      ? currentSubtypes.filter(s => s !== subtype)
                                      : [...currentSubtypes, subtype];
                                    handleRadiologyChange(type, newSubtypes);
                                  }}
                                />
                                {subtype}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Microbiology Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('microbiology')}
        >
          <h2>Microbiology</h2>
          <span>{expandedSections.microbiology ? '-' : '+'}</span>
        </div>
        {expandedSections.microbiology && (
          <div className={styles.sectionContent}>
            <div className={styles.checkboxGrid}>
              {microbiologyTests.map(test => (
                <label key={test} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedTests.microbiology.includes(test)}
                    onChange={() => handleMicrobiologyChange(test)}
                  />
                  {test}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arterial Analysis Section */}
      {/* <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('arterialAnalysis')}
        >
          <h2>Arterial Analysis</h2>
          <span>{expandedSections.arterialAnalysis ? '-' : '+'}</span>
        </div>
        {expandedSections.arterialAnalysis && (
          <div className={styles.sectionContent}>
            <div className={styles.checkboxGrid}>
              {arterialAnalysisTests.map(test => (
                <label key={test} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedTests.arterialAnalysis.includes(test)}
                    onChange={() => handleArterialAnalysisChange(test)}
                  />
                  {test}
                </label>
              ))}
            </div>
          </div>
        )}
      </div> */}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
} 