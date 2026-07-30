import React, { useEffect } from 'react';
import styles from '@/styles/fluid.module.css';

interface FluidItem {
  name: string;
  quantity: number | null;
}

export interface FluidData {
  infusions: FluidItem[];
  other_infusions: FluidItem[];
  intakes: FluidItem[];
  colloids: FluidItem[];
  crystalloids: FluidItem[];
  oral_intakes: FluidItem[];
  ryles_tubes: FluidItem[];
  outputs: FluidItem[];
  urines: FluidItem[];
  drainages: FluidItem[];
  total_input: number | null;
  total_output: number | null;
  cumulative_balance: number | null;
}

const INFUSION_OPTIONS = [
  "Fentanyl  - (Sedatives)",
  "Midazolam -(Sedatives)",
  "Dexmeditomedine -(Sedatives)",
  "Atra curium -(Muscle relaxants)",
  "Adrenaline -(Inotropes)",
  "Dopamine  -(Inotropes)",
  "Noradrenaline - (Vasopressors)",
  "Vasopressin -(Vasopressors)"
  // "Sedatives",
  // "Vasopressin",
  // "Inotropes"
  // "Medazolam",
  // "Atropine",
  // "Epinephrine",
  // "Norepinephrine",
  // "Noradrenaline",
  // "Atracurium",
  // "Fentanyl",
  // "Soda-bicarb",
  // "Norcurone",
  // "Dopamine"
];

const COLLOID_OPTIONS = [
  "Dextran",
  "Albumin 5%",
  "Albumin 25%",
  "Hydroxyethyl starch (HES)",
  "Whole blood",
  "PRBC",
  "FFP",
  "RDP",
  "SDP",
  "Cryoprecipitate"
];

const CRYSTALLOID_OPTIONS = [
  "Normal Saline",
  "Ringer Lactate",
  "Plasmalyte",
  "Sterofundin",
  "Isolyte-P",
  "Isolyte-M",
  "Isolyte-G",
  "DN/2",
  "N/2",
  "DNS",
  "D5%",
  "D10%",
  "KABILYTE"
];

const DRAINAGE_OPTIONS = [
  "Drainage 01",
  "Drainage 02",
  "Drainage 03",
  "HD/SLED/CRRT/PD"
];

const infusionFields = [
  { name: "Sedatives", unit: "ml" },
  { name: "Vasopressin", unit: "units" },
  { name: "Inotropes", unit: "mcg/kg/min" }
];

const otherInfusionFields = [
  { name: "Other Infusions", unit: "ml" }
];

const colloidFields = [
  { name: "Colloid 1", unit: "ml" },
  { name: "Colloid 2", unit: "ml" },
  { name: "Colloid 3", unit: "ml" },
  { name: "Colloid 4", unit: "ml" },
  { name: "Colloid 5", unit: "ml" }
];

const crystalloidFields = [
  { name: "Crystalloid 1", unit: "ml" }
];

const oralIntakeFields = [
  { name: "Oral", unit: "ml" }
];

const rylesTubeFields = [
  { name: "Ryles Tube", unit: "ml" }
];

const urineFields = [
  { name: "Urine", unit: "ml" }
];

const drainageFields = [
  { name: "Drain 1", unit: "ml" },
  { name: "Drain 2", unit: "ml" },
  { name: "Drain 3", unit: "ml" },
  { name: "", unit: "ml" }
];

interface FluidFormProps {
  initialValues: FluidData;
  isViewMode?: boolean;
  time: string;
  onSubmit: (time: string, values: FluidData) => void | Promise<void>;
}

const FluidForm: React.FC<FluidFormProps> = ({
  initialValues,
  isViewMode = false,
  time,
  onSubmit,
}) => {
  // Initialize with empty arrays if they don't exist in initialValues
  const defaultValues: FluidData = {
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

  const [formValues, setFormValues] = React.useState<FluidData>({
    ...defaultValues,
    ...initialValues
  });
  const [isLoading, setIsLoading] = React.useState(false);

  // Initialize with at least one infusion if none exists
  React.useEffect(() => {
    if (formValues.infusions.length === 0) {
      setFormValues(prev => ({
        ...prev,
        infusions: [{ name: "", quantity: null }]
      }));
    }
  }, []);

  // Initialize with at least one colloid if none exists
  React.useEffect(() => {
    if (formValues.colloids.length === 0) {
      setFormValues(prev => ({
        ...prev,
        colloids: [{ name: "", quantity: null }]
      }));
    }
  }, []);

  // Initialize with at least one crystalloid if none exists
  React.useEffect(() => {
    if (formValues.crystalloids.length === 0) {
      setFormValues(prev => ({
        ...prev,
        crystalloids: [{ name: "", quantity: null }]
      }));
    }
  }, []);

  const [additionalInfusions, setAdditionalInfusions] = React.useState<number>(1); // Start with 2 infusions (1 additional)
  const [additionalDrains, setAdditionalDrains] = React.useState<number>(0);
  const [additionalCrystalloids, setAdditionalCrystalloids] = React.useState<number>(0);

  // Get currently selected infusions
  const getSelectedInfusions = () => {
    return formValues.infusions.map(item => item.name).filter(name => name !== "");
  };

  // Get available infusion options (excluding already selected ones)
  const getAvailableInfusions = (currentInfusion: string | null) => {
    const selectedInfusions = getSelectedInfusions();
    return INFUSION_OPTIONS.filter(option => 
      option === currentInfusion || !selectedInfusions.includes(option)
    );
  };

  const handleInfusionChange = (index: number, name: string, value: string) => {
    setFormValues(prev => {
      const currentInfusions = [...prev.infusions];
      
      if (name === "name") {
        // If changing the infusion name, reset its quantity
        currentInfusions[index] = { name: value, quantity: null };
      } else {
        // If changing quantity
        const quantity = value === "" ? null : parseFloat(value);
        if (currentInfusions[index]) {
          currentInfusions[index] = { ...currentInfusions[index], quantity };
        }
      }

      const newValues = {
        ...prev,
        infusions: currentInfusions
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  const addInfusion = () => {
    setFormValues(prev => ({
      ...prev,
      infusions: [...prev.infusions, { name: "", quantity: null }]
    }));
    setAdditionalInfusions(prev => prev + 1);
  };

  // Add delete handlers
  const handleDeleteInfusion = (index: number) => {
    setFormValues(prev => {
      const updatedInfusions = prev.infusions.filter((_, i) => i !== index);
      const newValues = {
        ...prev,
        infusions: updatedInfusions
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  const handleDeleteOralIntake = (index: number) => {
    setFormValues(prev => {
      const updatedOralIntakes = prev.oral_intakes.filter((_, i) => i !== index);
      const newValues = {
        ...prev,
        oral_intakes: updatedOralIntakes
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  const handleDeleteRylesTube = (index: number) => {
    setFormValues(prev => {
      const updatedRylesTubes = prev.ryles_tubes.filter((_, i) => i !== index);
      const newValues = {
        ...prev,
        ryles_tubes: updatedRylesTubes
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  // Note: Drainage deletion removed - drainages are now fixed constants

  // Add delete handler for other infusions
  const handleDeleteOtherInfusion = (index: number) => {
    setFormValues(prev => {
      const updatedOtherInfusions = prev.other_infusions.filter((_, i) => i !== index);
      const newValues = {
        ...prev,
        other_infusions: updatedOtherInfusions
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  // Get currently selected colloids
  const getSelectedColloids = () => {
    return formValues.colloids.map(item => item.name).filter(name => name !== "");
  };

  // Get available colloid options (excluding already selected ones)
  const getAvailableColloids = (currentColloid: string | null) => {
    const selectedColloids = getSelectedColloids();
    return COLLOID_OPTIONS.filter(option => 
      option === currentColloid || !selectedColloids.includes(option)
    );
  };

  const handleColloidChange = (index: number, name: string, value: string) => {
    setFormValues(prev => {
      const currentColloids = [...prev.colloids];
      
      if (name === "name") {
        // If changing the colloid name, reset its quantity
        currentColloids[index] = { name: value, quantity: null };
      } else {
        // If changing quantity
        const quantity = value === "" ? null : parseFloat(value);
        if (currentColloids[index]) {
          currentColloids[index] = { ...currentColloids[index], quantity };
        }
      }

      const newValues = {
        ...prev,
        colloids: currentColloids
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  const addColloid = () => {
    setFormValues(prev => ({
      ...prev,
      colloids: [...prev.colloids, { name: "", quantity: null }]
    }));
  };

  const getSelectedCrystalloids = () => {
    return formValues.crystalloids.map(item => item.name).filter(name => name !== "");
  };

  const getAvailableCrystalloids = (currentCrystalloid: string | null) => {
    const selectedCrystalloids = getSelectedCrystalloids();
    return CRYSTALLOID_OPTIONS.filter(option => 
      option === currentCrystalloid || !selectedCrystalloids.includes(option)
    );
  };

  const handleCrystalloidChange = (index: number, name: string, value: string) => {
    setFormValues(prev => {
      const currentCrystalloids = [...prev.crystalloids];
      
      if (name === "name") {
        // If changing the crystalloid name, reset its quantity
        currentCrystalloids[index] = { name: value, quantity: null };
      } else {
        // If changing quantity
        const quantity = value === "" ? null : parseFloat(value);
        if (currentCrystalloids[index]) {
          currentCrystalloids[index] = { ...currentCrystalloids[index], quantity };
        }
      }

      const newValues = {
        ...prev,
        crystalloids: currentCrystalloids
      };

      // Recalculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  const addCrystalloid = () => {
    setFormValues(prev => ({
      ...prev,
      crystalloids: [...prev.crystalloids, { name: "", quantity: null }]
    }));
  };

  const handleInputChange = (
    section: keyof FluidData,
    name: string,
    value: string
  ) => {
    const quantity = value === "" ? null : parseFloat(value);
    
    setFormValues(prev => {
      // Ensure we're working with an array
      const currentSection = Array.isArray(prev[section]) ? prev[section] as FluidItem[] : [];
      
      // Find if the item already exists
      const existingItem = currentSection.find(item => item.name === name);
      
      let updatedSection;
      if (existingItem) {
        // Update existing item
        updatedSection = currentSection.map(item => 
          item.name === name ? { ...item, quantity } : item
        );
      } else {
        // Add new item
        updatedSection = [...currentSection, { name, quantity }];
      }

      const newValues = {
        ...prev,
        [section]: updatedSection
      };

      // Calculate totals
      const totalInput = calculateTotalInput(newValues);
      const totalOutput = calculateTotalOutput(newValues);
      const cumulativeBalance = totalInput - totalOutput;

      return {
        ...newValues,
        total_input: totalInput,
        total_output: totalOutput,
        cumulative_balance: cumulativeBalance
      };
    });
  };

  const calculateTotalInput = (values: FluidData): number => {
    const infusionsTotal = values.infusions.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const otherInfusionsTotal = values.other_infusions.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const colloidsTotal = values.colloids.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const crystalloidsTotal = values.crystalloids.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const oralIntakesTotal = values.oral_intakes.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const rylesTubesTotal = values.ryles_tubes.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return infusionsTotal + otherInfusionsTotal + colloidsTotal + crystalloidsTotal + oralIntakesTotal + rylesTubesTotal;
  };

  const calculateTotalOutput = (values: FluidData): number => {
    const urinesTotal = values.urines.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const drainagesTotal = values.drainages.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return urinesTotal + drainagesTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate infusions - if name is selected, quantity is required
    const invalidInfusions = formValues.infusions.filter(
      infusion => infusion.name && infusion.name !== "" && (infusion.quantity === null || infusion.quantity === undefined)
    );
    
    if (invalidInfusions.length > 0) {
      alert("Please fill in the quantity for all selected infusions.");
      return;
    }
    
    // Also check if there are infusions with quantity but no name
    const invalidInfusionNames = formValues.infusions.filter(
      infusion => (infusion.quantity !== null && infusion.quantity !== undefined) && (!infusion.name || infusion.name === "")
    );
    
    if (invalidInfusionNames.length > 0) {
      alert("Please select an infusion name for all infusions with quantities.");
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit(time, formValues);
    } catch (error) {
      console.error('Error submitting fluid data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = (
    title: string,
    fields: { name: string; unit: string }[],
    section: keyof FluidData,
    showAddButton: boolean = false,
    addButtonText?: string,
    onAdd?: () => void
  ) => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {!isViewMode && showAddButton && onAdd && (
          <button type="button" onClick={onAdd} className={styles.addButton}>
            {addButtonText || `+ Add ${title}`}
          </button>
        )}
      </div>
      {fields.map(field => {
        const currentSection = Array.isArray(formValues[section]) ? formValues[section] as FluidItem[] : [];
        const currentValue = currentSection.find(item => item.name === field.name)?.quantity;

        return (
          <div key={field.name} className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>{field.name}</label>
            </div>
            <div className={styles.inputWithUnit}>
              {isViewMode ? (
                <span>{currentValue ?? "-"}</span>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  value={currentValue ?? ""}
                  onChange={(e) => handleInputChange(section, field.name, e.target.value)}
                  placeholder="-"
                  className={styles.input}
                />
              )}
              <span className={styles.unit}>{field.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderInfusionsSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Infusions</h3>
        {!isViewMode && (
          <button type="button" onClick={addInfusion} className={styles.addButton}>
            + Add More Infusions
          </button>
        )}
      </div>
      {formValues.infusions.map((infusion, index) => (
        <div key={index} className={styles.infusionRow}>
          <div className={styles.infusionSelect}>
            {isViewMode ? (
              <span>{infusion.name || "-"}</span>
            ) : (
              <select
                value={infusion.name}
                onChange={(e) => handleInfusionChange(index, "name", e.target.value)}
                className={styles.select}
                required
              >
                <option value="">Select Infusion</option>
                {getAvailableInfusions(infusion.name).map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.inputWithUnit}>
            {isViewMode ? (
              <span>{infusion.quantity ?? "-"}</span>
            ) : (
              <input
                type="number"
                step="0.01"
                value={infusion.quantity ?? ""}
                onChange={(e) => handleInfusionChange(index, "quantity", e.target.value)}
                placeholder="Quantity"
                className={styles.input}
                required
                min="0"
              />
            )}
            <span className={styles.unit}>ml</span>
          </div>
          {!isViewMode && (
            <button 
              type="button" 
              onClick={() => handleDeleteInfusion(index)}
              className={styles.deleteButton}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const renderOtherInfusionsSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Other Infusions</h3>
        {!isViewMode && (
          <button type="button" onClick={() => {
            setFormValues(prev => ({
              ...prev,
              other_infusions: [...prev.other_infusions, { name: "", quantity: null }]
            }));
          }} className={styles.addButton}>
            + Add More Infusions
          </button>
        )}
      </div>
      {formValues.other_infusions.map((infusion, index) => (
        <div key={index} className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label>Other Infusion {String(index + 1).padStart(2, '0')}</label>
            <div className={styles.inputPair}>
              {isViewMode ? (
                <>
                  <span className={styles.textValue}>{infusion.name || "-"}</span>
                  <span className={styles.quantityValue}>{infusion.quantity ?? "-"} ml</span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={infusion.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormValues(prev => ({
                        ...prev,
                        other_infusions: prev.other_infusions.map((item, i) => 
                          i === index ? { ...item, name: newName } : item
                        )
                      }));
                    }}
                    placeholder="Enter infusion name"
                    className={styles.textInput}
                  />
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      step="0.01"
                      value={infusion.quantity ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const quantity = value === "" ? null : parseFloat(value);
                        setFormValues(prev => {
                          const updatedOtherInfusions = prev.other_infusions.map((item, i) => 
                            i === index ? { ...item, quantity } : item
                          );
                          
                          const newValues = {
                            ...prev,
                            other_infusions: updatedOtherInfusions
                          };

                          // Recalculate totals
                          const totalInput = calculateTotalInput(newValues);
                          const totalOutput = calculateTotalOutput(newValues);
                          const cumulativeBalance = totalInput - totalOutput;

                          return {
                            ...newValues,
                            total_input: totalInput,
                            total_output: totalOutput,
                            cumulative_balance: cumulativeBalance
                          };
                        });
                      }}
                      placeholder="Quantity"
                      className={styles.input}
                    />
                    <span className={styles.unit}>ml</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteOtherInfusion(index)}
                    className={styles.deleteButton}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderColloidsSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Colloid</h3>
        {!isViewMode && (
          <button type="button" onClick={addColloid} className={styles.addButton}>
            + Add More Infusions
          </button>
        )}
      </div>
      {formValues.colloids.map((colloid, index) => (
        <div key={index} className={styles.infusionRow}>
          <div className={styles.infusionSelect}>
            {isViewMode ? (
              <span>{colloid.name || "-"}</span>
            ) : (
              <select
                value={colloid.name}
                onChange={(e) => handleColloidChange(index, "name", e.target.value)}
                className={styles.select}
              >
                <option value="">Select Colloid</option>
                {getAvailableColloids(colloid.name).map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.inputWithUnit}>
            {isViewMode ? (
              <span>{colloid.quantity ?? "-"}</span>
            ) : (
              <input
                type="number"
                step="0.01"
                value={colloid.quantity ?? ""}
                onChange={(e) => handleColloidChange(index, "quantity", e.target.value)}
                placeholder="Quantity"
                className={styles.input}
              />
            )}
            <span className={styles.unit}>ml</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCrystalloidsSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Crystalloid</h3>
        {!isViewMode && (
          <button type="button" onClick={addCrystalloid} className={styles.addButton}>
            + Add More Infusions
          </button>
        )}
      </div>
      {formValues.crystalloids.map((crystalloid, index) => (
        <div key={index} className={styles.infusionRow}>
          <div className={styles.infusionSelect}>
            {isViewMode ? (
              <span>{crystalloid.name || "-"}</span>
            ) : (
              <select
                value={crystalloid.name}
                onChange={(e) => handleCrystalloidChange(index, "name", e.target.value)}
                className={styles.select}
              >
                <option value="">Select Crystalloid</option>
                {getAvailableCrystalloids(crystalloid.name).map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.inputWithUnit}>
            {isViewMode ? (
              <span>{crystalloid.quantity ?? "-"}</span>
            ) : (
              <input
                type="number"
                step="0.01"
                value={crystalloid.quantity ?? ""}
                onChange={(e) => handleCrystalloidChange(index, "quantity", e.target.value)}
                placeholder="Quantity"
                className={styles.input}
              />
            )}
            <span className={styles.unit}>ml</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOralIntakeSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Oral Intake</h3>
        {!isViewMode && (
          <button type="button" onClick={() => {
            setFormValues(prev => ({
              ...prev,
              oral_intakes: [...prev.oral_intakes, { name: "", quantity: null }]
            }));
          }} className={styles.addButton}>
            + Add More Infusions
          </button>
        )}
      </div>
      {formValues.oral_intakes.map((intake, index) => (
        <div key={index} className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label>Oral Intake {String(index + 1).padStart(2, '0')}</label>
            <div className={styles.inputPair}>
              {isViewMode ? (
                <>
                  <span className={styles.textValue}>{intake.name || "-"}</span>
                  <span className={styles.quantityValue}>{intake.quantity ?? "-"} ml</span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={intake.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormValues(prev => ({
                        ...prev,
                        oral_intakes: prev.oral_intakes.map((item, i) => 
                          i === index ? { ...item, name: newName } : item
                        )
                      }));
                    }}
                    placeholder="Oral Intake"
                    className={styles.textInput}
                  />
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      step="0.01"
                      value={intake.quantity ?? ""}
                      onChange={(e) => handleInputChange('oral_intakes', intake.name, e.target.value)}
                      placeholder="Quantity"
                      className={styles.input}
                    />
                    <span className={styles.unit}>ml</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteOralIntake(index)}
                    className={styles.deleteButton}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRylesTubeSection = () => {
    const rylesTubeTotal = formValues.ryles_tubes.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Ryles Tube</h3>
          {!isViewMode && (
            <button type="button" onClick={() => {
              setFormValues(prev => ({
                ...prev,
                ryles_tubes: [...prev.ryles_tubes, { name: "", quantity: null }]
              }));
            }} className={styles.addButton}>
              + Add More Infusions
            </button>
          )}
        </div>
        {formValues.ryles_tubes.map((tube, index) => (
          <div key={index} className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label>Intake {String(index + 1).padStart(2, '0')}</label>
              <div className={styles.inputPair}>
                {isViewMode ? (
                  <>
                    <span className={styles.textValue}>{tube.name || "-"}</span>
                    <span className={styles.quantityValue}>{tube.quantity ?? "-"} ml</span>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={tube.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setFormValues(prev => ({
                          ...prev,
                          ryles_tubes: prev.ryles_tubes.map((item, i) => 
                            i === index ? { ...item, name: newName } : item
                          )
                        }));
                      }}
                      placeholder="Enter intake type"
                      className={styles.textInput}
                    />
                    <div className={styles.inputWithUnit}>
                      <input
                        type="number"
                        step="0.01"
                        value={tube.quantity ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const quantity = value === "" ? null : parseFloat(value);
                          setFormValues(prev => {
                            const updatedRylesTubes = prev.ryles_tubes.map((item, i) => 
                              i === index ? { ...item, quantity } : item
                            );
                            
                            const newValues = {
                              ...prev,
                              ryles_tubes: updatedRylesTubes
                            };

                            // Recalculate totals
                            const totalInput = calculateTotalInput(newValues);
                            const totalOutput = calculateTotalOutput(newValues);
                            const cumulativeBalance = totalInput - totalOutput;

                            return {
                              ...newValues,
                              total_input: totalInput,
                              total_output: totalOutput,
                              cumulative_balance: cumulativeBalance
                            };
                          });
                        }}
                        placeholder="Quantity"
                        className={styles.input}
                      />
                      <span className={styles.unit}>ml</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteRylesTube(index)}
                      className={styles.deleteButton}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className={styles.totalRow}>
          <label>TOTAL RYLES TUBE:</label>
          <span>{rylesTubeTotal}ML</span>
        </div>
      </div>
    );
  };

  const renderUrineSection = () => {
    const urineTotal = formValues.urines.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Urine Output</h3>
        </div>
        <div className={styles.formRow}>
          <div className={styles.inputGroup}>
            <label>Urine Quantity</label>
            <div className={styles.inputPair}>
              {isViewMode ? (
                <>
                  <span className={styles.textValue}>{formValues.urines[0]?.name || "-"}</span>
                  <span className={styles.quantityValue}>{formValues.urines[0]?.quantity ?? "-"} ml</span>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={formValues.urines[0]?.name || ""}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setFormValues(prev => ({
                        ...prev,
                        urines: prev.urines.length > 0 
                          ? prev.urines.map((item, i) => 
                              i === 0 ? { ...item, name: newName } : item
                            )
                          : [{ name: newName, quantity: null }]
                      }));
                    }}
                    placeholder="Quantity"
                    className={styles.textInput}
                  />
                  <div className={styles.inputWithUnit}>
                    <input
                      type="number"
                      step="0.01"
                      value={formValues.urines[0]?.quantity ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const quantity = value === "" ? null : parseFloat(value);
                        setFormValues(prev => {
                          const updatedUrines = prev.urines.length > 0
                            ? prev.urines.map((item, i) => 
                                i === 0 ? { ...item, quantity } : item
                              )
                            : [{ name: prev.urines[0]?.name || "Urine", quantity }];
                          
                          const newValues = {
                            ...prev,
                            urines: updatedUrines
                          };

                          // Recalculate totals
                          const totalInput = calculateTotalInput(newValues);
                          const totalOutput = calculateTotalOutput(newValues);
                          const cumulativeBalance = totalInput - totalOutput;

                          return {
                            ...newValues,
                            total_input: totalInput,
                            total_output: totalOutput,
                            cumulative_balance: cumulativeBalance
                          };
                        });
                      }}
                      placeholder="Quantity"
                      className={styles.input}
                    />
                    <span className={styles.unit}>ml</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={styles.totalRow}>
          <label>TOTAL URINE:</label>
          <span>{urineTotal}ML</span>
        </div>
      </div>
    );
  };

  const renderDrainageSection = () => {
    const drainageTotal = formValues.drainages.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Drainage</h3>
        </div>
        <div className={styles.drainageGrid}>
          {DRAINAGE_OPTIONS.map((drainageName, index) => {
            const drainage = formValues.drainages.find(d => d.name === drainageName) || { name: drainageName, quantity: null };
            return (
              <div key={index} className={styles.drainageRow}>
                <div className={styles.drainageHeader}>
                  <label>{drainageName}</label>
                </div>
                <div className={styles.drainageContent}>
                  <span className={styles.drainageName}>{drainageName}</span>
                  <div className={styles.inputWithUnit}>
                    {isViewMode ? (
                      <span>{drainage.quantity ?? "-"}</span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={drainage.quantity ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const quantity = value === "" ? null : parseFloat(value);
                          setFormValues(prev => {
                            const existingIndex = prev.drainages.findIndex(d => d.name === drainageName);
                            let updatedDrainages;
                            
                            if (existingIndex !== -1) {
                              updatedDrainages = prev.drainages.map((item, i) => 
                                i === existingIndex ? { ...item, quantity } : item
                              );
                            } else {
                              updatedDrainages = [...prev.drainages, { name: drainageName, quantity }];
                            }
                            
                            const newValues = {
                              ...prev,
                              drainages: updatedDrainages
                            };

                            // Recalculate totals
                            const totalInput = calculateTotalInput(newValues);
                            const totalOutput = calculateTotalOutput(newValues);
                            const cumulativeBalance = totalInput - totalOutput;

                            return {
                              ...newValues,
                              total_input: totalInput,
                              total_output: totalOutput,
                              cumulative_balance: cumulativeBalance
                            };
                          });
                        }}
                        placeholder="Quantity"
                        className={styles.input}
                      />
                    )}
                    <span className={styles.unit}>ml</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.totalRow}>
          <label>TOTAL DRAINAGE:</label>
          <span>{drainageTotal}ML</span>
        </div>
      </div>
    );
  };

  // Initialize with default drainages
  React.useEffect(() => {
    // Ensure all 4 drainages are always present
    const existingDrainageNames = formValues.drainages.map(d => d.name);
    const missingDrainages = DRAINAGE_OPTIONS.filter(name => !existingDrainageNames.includes(name));
    
    if (missingDrainages.length > 0) {
      setFormValues(prev => ({
        ...prev,
        drainages: [
          ...prev.drainages,
          ...missingDrainages.map(name => ({ name, quantity: null }))
        ]
      }));
    }
  }, []);

  return (
    <form onSubmit={handleSubmit} className={styles.fluidForm}>
      <div className={styles.formGrid}>
        {renderInfusionsSection()}
        {renderOtherInfusionsSection()}
        {renderColloidsSection()}
        {renderCrystalloidsSection()}
        {renderOralIntakeSection()}
        {renderRylesTubeSection()}
        {renderUrineSection()}
        {renderDrainageSection()}
      </div>

      <div className={styles.totals}>
        <div className={styles.totalItem}>
          <span>Total Input:</span>
          <span>{formValues.total_input ?? "-"} {formValues.total_input !== null && "ml"}</span>
        </div>
        <div className={styles.totalItem}>
          <span>Total Output:</span>
          <span>{formValues.total_output ?? "-"} {formValues.total_output !== null && "ml"}</span>
        </div>
        <div className={styles.totalItem}>
          <span>Cumulative Balance:</span>
          <span>{formValues.cumulative_balance ?? "-"} {formValues.cumulative_balance !== null && "ml"}</span>
        </div>
      </div>

      {!isViewMode && (
        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading && <div className={styles.loadingSpinner}></div>}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </form>
  );
};

export default FluidForm; 