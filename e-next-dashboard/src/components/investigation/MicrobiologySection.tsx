import React, { useState, useEffect } from 'react';
import { Parameter } from '@/types/investigation';
import styles from '@/styles/investigation-report/Microbiology-report.module.css';
import EditButton from '../common/EditButton';

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
  recorded_at?: string;
  recorded_by?: string;
}

// Update MicrobiologyValues to match API response
interface MicrobiologyValues {
  tests: MicrobiologyTest[];
  values: Record<string, any>;
}

interface MicrobiologySectionProps {
  values: MicrobiologyValues | undefined;
  availableParameters: Parameter[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (data: { tests: MicrobiologyTest[] }) => void | Promise<void>;
}

const ORGANISMS = [
  'Acinetobacter Baumanii',
  'Pseudomonas Aeruginosa',
  'klebsiella Pneumonae',
  'E. Coli',
  'Staph Aureus MRSA',
  'Staph Aureus MSSA',
  'Enterococcus',
  'Enterobacter',
  'Candida albicans',
  'Candida non albicans'
];
const ANTIBIOTICS = [
  "Amikacin",
  "Ampicillin",
  "Amoxicillin / Clavulanic Acid",
  "Piperacillin / Tazobactam",
  "Cefixime",
  "Ceftriaxone",
  "Ceftazidime",
  "Cefoxitin",
  "Ertapenem",
  "Fosfomycin (CLSI, Urine)",
  "Ofloxacin",
  "Norfloxacin (Urine)",
  "Gentamicin",
  "Nalidixic Acid (Urine)",
  "Ciprofloxacin",
  "Nitrofurantoin (Urine)",
  "Trimethoprim / Sulfamethoxazole",
  "Aztreonam",
  "Minocycline",
  "Tigecycline (FDA)",
  "Cefoperazone / Sulbactam",
  "Imipenem",
  "Meropenem",
  "Tigecycline (EUCAST)",
  "Benzylpenicillin",
  "Clindamycin",
  "Daptomycin",
  "Erythromycin",
  "Linezolid",
  "Rifampicin",
  "Tetracycline",
  "Vancomycin (Non-Staphylococcus aureus)",
  "Plazomicin",
  "Ceftriaxone / Sulbactam (Elores)",
  "Ceftazidime / Avibactam",
  "Aztreonam / Avibactam"
];

// const ANTIBIOTICS = [
//   'amikacin',
//   'ampicillin',
//   'amoxicillin_clavulanic_acid',
//   'piperacillin_tazobactam',
//   'cefixime',
//   'ceftriaxone',
//   'ceftazidime',
//   'cefoxitin',
//   'ertapenem',
//   'fosfomycin_u_clsi',
//   'ofloxacin',
//   'norfloxacin_u',
//   'gentamicin',
//   'nalidixic_acid_u',
//   'ciprofloxacin',
//   'nitrofurantoin_u',
//   'trimethoprim_sulfamethoxazole',
//   'aztreonam',
//   'munocycline',
//   'tigecycline_fda',
//   'cefoperazone_sulbactam',
//   'imipenem',
//   'meropenem',
//   'tigecycline_eucast',
//   'benzylpenicillin',
//   'clindamycin',
//   'daptomycin',
//   'erythromycin',
//   'linezolid',
//   'rifampicin',
//   'tetracycline',
//   'vancomycin_other_than_saureus',
//   'plazomycin',
//   'elores',
//   'ceftazidime_avibactum',
//   'aztreonam_avibactum'
// ];

const RESULTS = ['Sensitive', 'Non-Sensitive'];

const MicrobiologySection: React.FC<MicrobiologySectionProps> = ({
  values,
  availableParameters,
  isExpanded,
  onToggle,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tests, setTests] = useState<MicrobiologyTest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize state from existing values when available
  useEffect(() => {
    if (values && !isEditing && values.tests && values.tests.length > 0) {
      try {
        setTests(values.tests);
      } catch (error) {
        console.error('Error initializing from existing data:', error);
      }
    } else if (!isEditing) {
      // Initialize with one empty test if no existing data
      setTests([{
        test_type: 'Blood C/S',
        specimen_source: '',
        remarks: '',
        organisms: []
      }]);
    }
  }, [values, isEditing]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const addNewTest = () => {
    setTests(prev => [...prev, {
      test_type: 'Blood C/S',
      specimen_source: '',
      remarks: '',
      organisms: []
    }]);
  };

  const removeTest = (index: number) => {
    setTests(prev => prev.filter((_, i) => i !== index));
  };

  const updateTest = (index: number, field: keyof MicrobiologyTest, value: any) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, [field]: value } : test
    ));
  };

  const updateTestOrganisms = (testIndex: number, organisms: Organism[]) => {
    setTests(prev => prev.map((test, i) => 
      i === testIndex ? { ...test, organisms } : test
    ));
  };

  const handleOrganismToggle = (testIndex: number, organism: string) => {
    const test = tests[testIndex];
    const currentOrganisms = test.organisms.map(org => org.organism_name);
    
    let newOrganisms: string[];
    if (currentOrganisms.includes(organism)) {
      newOrganisms = currentOrganisms.filter(o => o !== organism);
    } else {
      newOrganisms = [...currentOrganisms, organism];
    }

    // Update organisms in the test
    const updatedOrganisms: Organism[] = newOrganisms.map(orgName => {
      const existingOrg = test.organisms.find(org => org.organism_name === orgName);
      return existingOrg || {
        organism_name: orgName,
        sensitivity_tests: []
      };
    });

    updateTestOrganisms(testIndex, updatedOrganisms);
  };

  const handleAddSensitivityTest = (testIndex: number, organism: string) => {
    const test = tests[testIndex];
    const organismIndex = test.organisms.findIndex(org => org.organism_name === organism);
    
    if (organismIndex !== -1) {
      const updatedOrganisms = [...test.organisms];
      updatedOrganisms[organismIndex] = {
        ...updatedOrganisms[organismIndex],
        sensitivity_tests: [
          ...updatedOrganisms[organismIndex].sensitivity_tests,
          { antibiotic: '', result: '', sensitivity_power: null }
        ]
      };
      updateTestOrganisms(testIndex, updatedOrganisms);
    }
  };

  const handleSensitivityTestChange = (
    testIndex: number,
    organism: string,
    testIndex2: number,
    field: keyof SensitivityTest,
    value: string | number | null
  ) => {
    const test = tests[testIndex];
    const organismIndex = test.organisms.findIndex(org => org.organism_name === organism);
    
    if (organismIndex !== -1) {
      const updatedOrganisms = [...test.organisms];
      updatedOrganisms[organismIndex] = {
        ...updatedOrganisms[organismIndex],
        sensitivity_tests: updatedOrganisms[organismIndex].sensitivity_tests.map((sensitivityTest, i) =>
          i === testIndex2 ? { 
            ...sensitivityTest, 
            [field]: field === 'sensitivity_power' && value === '' ? null : value,
            // Set sensitivity_power to null when result is Non-Sensitive
            ...(field === 'result' && value === 'Non-Sensitive' ? { sensitivity_power: null } : {})
          } : sensitivityTest
        )
      };
      updateTestOrganisms(testIndex, updatedOrganisms);
    }
  };

  const handleSave = async () => {
    // Create the exact payload structure
    const payload = {
      tests: tests
    };

    setIsLoading(true);
    try {
      await onEdit(payload);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving microbiology data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (values && values.tests && values.tests.length > 0) {
      setTests(values.tests);
    } else {
      setTests([{
        test_type: 'Blood C/S',
        specimen_source: '',
        remarks: '',
        organisms: []
      }]);
    }
  };

  const renderViewMode = () => {
    if (!values || !values.tests || values.tests.length === 0) {
      return <div className={styles.noData}>No data available</div>;
    }

    try {
      return (
        <div className={styles.viewContent}>
          {values.tests.map((test: MicrobiologyTest, testIndex: number) => (
            <div key={testIndex} className={styles.testCard}>
              <h4>Test {testIndex + 1}</h4>
              <div className={styles.viewGroup}>
                <label>Test Type:</label>
                <span>{test.test_type}</span>
              </div>

              <div className={styles.viewGroup}>
                <label>Specimen Source:</label>
                <span>{test.specimen_source}</span>
              </div>

              {test.organisms.length > 0 && (
                <div className={styles.viewGroup}>
                  <label>Organisms Detected:</label>
                  <div className={styles.organismsList}>
                    {test.organisms.map((org: Organism, index: number) => (
                      <div key={index} className={styles.organismCard}>
                        <h5>{org.organism_name}</h5>
                        {org.sensitivity_tests.length > 0 && (
                          <div className={styles.sensitivityTable}>
                            <div className={styles.sensitivityHeader}>
                              <span>Antibiotic</span>
                              <span>Result</span>
                              <span>Sensitivity Power</span>
                            </div>
                            {org.sensitivity_tests.map((sensitivityTest: SensitivityTest, sensitivityIndex: number) => (
                              <div key={sensitivityIndex} className={styles.sensitivityRow}>
                                <span>{sensitivityTest.antibiotic}</span>
                                <span className={sensitivityTest.result === 'Sensitive' ? styles.reactive : styles.nonReactive}>
                                  {sensitivityTest.result}
                                </span>
                                <span>{sensitivityTest.result === 'Sensitive' ? sensitivityTest.sensitivity_power : '-'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {test.remarks && (
                <div className={styles.viewGroup}>
                  <label>Remarks:</label>
                  <span className={styles.remarks}>{test.remarks}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      console.error('Error rendering view mode:', error);
      return <div className={styles.error}>Error displaying data</div>;
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>Microbiology</h3>
        <div>
          {isEditing ? (
            <>
              <button 
                className={styles.saveButton} 
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading && <div className={styles.loadingSpinner}></div>}
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button 
                className={styles.cancelButton} 
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            </>
          ) : (
            <EditButton onClick={handleEditClick} />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <>
          {isEditing ? (
            <div className={styles.content}>
              {tests.map((test, testIndex) => (
                <div key={testIndex} className={styles.testCard}>
                  <div className={styles.testHeader}>
                    <h4>Test {testIndex + 1}</h4>
                    {tests.length > 1 && (
                      <button
                        onClick={() => removeTest(testIndex)}
                        className={styles.removeButton}
                        type="button"
                      >
                        Remove Test
                      </button>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label>Test Type:</label>
                    <select 
                      value={test.test_type}
                      onChange={(e) => updateTest(testIndex, 'test_type', e.target.value)}
                      className={styles.select}
                    >
                      {availableParameters.map((param, index) => (
                        <option key={index} value={param.value}>
                          {param.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Specimen Source:</label>
                    <input
                      type="text"
                      value={test.specimen_source}
                      onChange={(e) => updateTest(testIndex, 'specimen_source', e.target.value)}
                      className={styles.input}
                      placeholder="Enter specimen source"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Select Organism Detected:</label>
                    <div className={styles.checkboxGrid}>
                      {ORGANISMS.map((organism, index) => (
                        <label key={index} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={test.organisms.some(org => org.organism_name === organism)}
                            onChange={() => handleOrganismToggle(testIndex, organism)}
                          />
                          {organism}
                        </label>
                      ))}
                    </div>
                  </div>

                  {test.organisms.map((organism, organismIndex) => (
                    <div key={organismIndex} className={styles.sensitivityTestSection}>
                      <h5>{organism.organism_name}</h5>
                      <div className={styles.sensitivityTests}>
                        {organism.sensitivity_tests.map((sensitivityTest, sensitivityIndex) => (
                          <div key={sensitivityIndex} className={styles.sensitivityTest}>
                            <select
                              value={sensitivityTest.antibiotic}
                              onChange={(e) => handleSensitivityTestChange(testIndex, organism.organism_name, sensitivityIndex, 'antibiotic', e.target.value)}
                              className={styles.select}
                            >
                              <option value="">Select Antibiotic</option>
                              {ANTIBIOTICS.map((antibiotic, i) => (
                                <option key={i} value={antibiotic}>{antibiotic}</option>
                              ))}
                            </select>
                            <select
                              value={sensitivityTest.result}
                              onChange={(e) => handleSensitivityTestChange(testIndex, organism.organism_name, sensitivityIndex, 'result', e.target.value)}
                              className={styles.select}
                            >
                              <option value="">Select Result</option>
                              {RESULTS.map((result, i) => (
                                <option key={i} value={result}>{result}</option>
                              ))}
                            </select>
                            {sensitivityTest.result === 'Sensitive' && (
                              <input
                                type="number"
                                value={sensitivityTest.sensitivity_power || ''}
                                onChange={(e) => handleSensitivityTestChange(
                                  testIndex,
                                  organism.organism_name, 
                                  sensitivityIndex, 
                                  'sensitivity_power', 
                                  e.target.value ? Number(e.target.value) : null
                                )}
                                className={styles.input}
                                placeholder="Sensitivity Power"
                                step="0.01"
                                min="0"
                                max="1"
                              />
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => handleAddSensitivityTest(testIndex, organism.organism_name)}
                          className={styles.addButton}
                          type="button"
                        >
                          + Add Sensitivity Test
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className={styles.formGroup}>
                    <label>Remarks:</label>
                    <textarea
                      value={test.remarks}
                      onChange={(e) => updateTest(testIndex, 'remarks', e.target.value)}
                      className={styles.textarea}
                      placeholder="Enter remarks"
                      rows={4}
                    />
                  </div>
                </div>
              ))}

              <div className={styles.addTestButtonContainer}>
                <button
                  onClick={addNewTest}
                  className={styles.addTestButton}
                  type="button"
                >
                  + Add New Test Type
                </button>
              </div>
            </div>
          ) : (
            renderViewMode()
          )}
        </>
      )}
    </div>
  );
};

export default MicrobiologySection; 