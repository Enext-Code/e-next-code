'use client';

import React from 'react';
import styles from '@/styles/catheter.module.css';
import { CatheterEntry } from '@/services/catheterService';

type CatheterType = 'Central Line' | 'Foley Catheter';

export interface CatheterData {
  entries: CatheterEntry[];
}

interface CatheterFormProps {
  initialValues: CatheterData;
  isViewMode?: boolean;
  onSubmit: (values: CatheterData) => void;
  onEdit?: (catheter: CatheterEntry) => void;
  onDelete?: (catheterId: string) => void;
  onAdd?: () => void;
}

const CATHETER_SUB_TYPES = ['Type1', 'Type2'];

const CATHETER_TYPES = {
  Type1: [
    'Central line',
    'Subclavian Rt or Lt',
    'Internal jugular Rt or Lt',
    'Femoral Rt or Lt',
    'Arterial Line',
    'Radial Rt or Lt',
    'Dialysis catheter',
    'Internal jugular rt or lt',
    'Foley\'s catheter',
    'Peripheral line',
    'Ryles Tube'
  ],
  Type2: [
    'ET Tube',
    'Tracheostomy Tube',
    'Sheath',
    'Art Line Radial', 
    'Temp. Pacing Lead',
    'Femoral',  
    'Humidifier',
    'PA Catheter',
    'Ventilator Tubing',
    'CVC / Peripheral line',
    'Urinary Catheter',
    'IABP'
  ]
};

const CatheterForm: React.FC<CatheterFormProps> = ({
  initialValues,
  isViewMode = false,
  onSubmit,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [formValues, setFormValues] = React.useState<CatheterData>(initialValues);

  // Update form values when initialValues prop changes
  React.useEffect(() => {
    // console.log('CatheterForm: initialValues changed, updating form values:', initialValues);
    setFormValues(initialValues);
  }, [initialValues]);

  const calculateDaysInUse = (insertionDate: string | null, removalDate: string | null): number | null => {
    if (!insertionDate) return null;
    const start = new Date(insertionDate);
    const end = removalDate ? new Date(removalDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateToUTC = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('.')[0] + 'Z';
  };

  const handleInputChange = (index: number, field: keyof CatheterEntry, value: string) => {
    setFormValues(prev => ({
      entries: prev.entries.map((entry, i) => {
        if (i === index) {
          let updatedValue: any = value || null;
          
          if (field === 'size') {
            updatedValue = value ? parseInt(value) : null;
          } else if (field === 'date_of_insertion' || field === 'date_of_removal') {
            updatedValue = value ? formatDateToUTC(value) : null;
            
            const newEntry = {
              ...entry,
              [field]: updatedValue
            };
            
            return {
              ...newEntry,
              days_in_use: calculateDaysInUse(
                field === 'date_of_insertion' ? updatedValue : entry.date_of_insertion,
                field === 'date_of_removal' ? updatedValue : entry.date_of_removal
              )
            };
          } else if (field === 'catheter_type') {
            // When catheter_type changes, reset type to null
            updatedValue = value || null;
            return {
              ...entry,
              [field]: updatedValue,
              type: null
            };
          }
          
          return {
            ...entry,
            [field]: updatedValue
          };
        }
        return entry;
      })
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedValues = {
      entries: formValues.entries.map(entry => ({
        ...entry,
        date_of_insertion: formatDateToUTC(entry.date_of_insertion),
        date_of_removal: entry.date_of_removal ? formatDateToUTC(entry.date_of_removal) : null,
        days_in_use: calculateDaysInUse(entry.date_of_insertion, entry.date_of_removal)
      }))
    };
    onSubmit(formattedValues);
  };

  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16); // Format for datetime-local input (YYYY-MM-DDThh:mm)
  };

  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const addNewCatheter = () => {
    setFormValues(prev => ({
      entries: [
        ...prev.entries,
        {
          type: null,
          catheter_type: null,
          size: null,
          site: null,
          date_of_insertion: null,
          date_of_removal: null,
          days_in_use: null,
          notes: null
        }
      ]
    }));
  };

  const removeCatheter = (index: number) => {
    setFormValues(prev => ({
      entries: prev.entries.filter((_, i) => i !== index)
    }));
  };

  const renderCatheterSection = (entry: CatheterEntry, index: number) => {
    if (isViewMode) {
      return (
        <div key={index} className={styles.catheterSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Catheter {index + 1}</h3>
            <div className={styles.actionButtons}>
              {onEdit && (
                <button 
                  type="button"
                  onClick={() => onEdit(entry)}
                  className={styles.editButton}
                >
                  Edit
                </button>
              )}
              {onDelete && entry.id && (
                <button 
                  type="button"
                  onClick={() => onDelete(entry.id!)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Catheter Type:</label>
            </div>
            <div className={styles.value}>{entry.type ?? "-"}</div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Type:</label>
            </div>
            <div className={styles.value}>{entry.catheter_type ?? "-"}</div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Size</label>
            </div>
            <div className={styles.value}>{entry.size ?? "-"}</div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Site</label>
            </div>
            <div className={styles.value}>{entry.site ?? "-"}</div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Date Of Insertion</label>
            </div>
            <div className={styles.value}>{formatDateForDisplay(entry.date_of_insertion)}</div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Days in use</label>
            </div>
            <div className={styles.value}>
              {calculateDaysInUse(entry.date_of_insertion, entry.date_of_removal) ?? "-"}
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Date Of Removal</label>
            </div>
            <div className={styles.value}>{formatDateForDisplay(entry.date_of_removal)}</div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.parameterLabel}>
              <label>Notes</label>
            </div>
            <div className={styles.value}>{entry.notes ?? "-"}</div>
          </div>
        </div>
      );
    }

    return (
      <div key={index} className={styles.catheterSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Catheter Type {index + 1}</h3>
          {formValues.entries.length > 1 && (
            <button 
              type="button"
              onClick={() => removeCatheter(index)}
              className={styles.removeButton}
            >
              ✕
            </button>
          )}
          {entry.id && onDelete && (
            <button 
              type="button"
              onClick={() => onDelete(entry.id!)}
              className={styles.deleteButton}
            >
              Delete
            </button>
          )}
        </div>

        <div className={styles.formGroupGrid}>
          <div className={styles.formGroup}>
            <label>select type:</label>
            <select
              value={entry.catheter_type ?? ""}
              onChange={(e) => handleInputChange(index, 'catheter_type', e.target.value)}
              className={styles.select}
            >
              <option value="">Select  type</option>
              {CATHETER_SUB_TYPES.map(subType => (
                <option key={subType} value={subType}>{subType}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>select catheter type:</label>
            <select
              value={entry.type ?? ""}
              onChange={(e) => handleInputChange(index, 'type', e.target.value as CatheterType)}
              className={styles.select}
              disabled={!entry.catheter_type}
            >
              <option value="">Select Catheter Type</option>
              {entry.catheter_type && CATHETER_TYPES[entry.catheter_type as keyof typeof CATHETER_TYPES]?.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Size</label>
            <input
              type="number"
              value={entry.size ?? ""}
              onChange={(e) => handleInputChange(index, 'size', e.target.value)}
              placeholder="-"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Site</label>
            <input
              type="text"
              value={entry.site ?? ""}
              onChange={(e) => handleInputChange(index, 'site', e.target.value)}
              placeholder="-"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Date Of Insertion</label>
            <input
              type="datetime-local"
              value={formatDateForInput(entry.date_of_insertion)}
              onChange={(e) => handleInputChange(index, 'date_of_insertion', e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Days in use</label>
            <input
              type="number"
              value={calculateDaysInUse(entry.date_of_insertion, entry.date_of_removal) ?? ""}
              placeholder="-"
              className={styles.input}
              readOnly
            />
          </div>

          <div className={styles.formGroup}>
            <label>Date Of Removal</label>
            <input
              type="datetime-local"
              value={formatDateForInput(entry.date_of_removal)}
              onChange={(e) => handleInputChange(index, 'date_of_removal', e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              value={entry.notes ?? ""}
              onChange={(e) => handleInputChange(index, 'notes', e.target.value)}
              placeholder="-"
              className={styles.textarea}
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGroupedCatheters = () => {
    // Group catheters by sub type
    const grouped = formValues.entries.reduce((acc, entry, index) => {
      const subType = entry.catheter_type || 'Uncategorized';
      if (!acc[subType]) {
        acc[subType] = [];
      }
      acc[subType].push({ entry, index });
      return acc;
    }, {} as Record<string, { entry: CatheterEntry; index: number }[]>);

    // Define the order: Type1 first, then Type2, then others
    const orderedGroups = ['Type1', 'Type2', 'Uncategorized'];
    const sortedGroups = orderedGroups.filter(group => grouped[group]?.length > 0);

    return sortedGroups.map(groupName => (
      <div key={groupName} className={styles.catheterGroup}>
        <h3 className={styles.groupTitle}>{groupName} Catheters</h3>
        {grouped[groupName].map(({ entry, index }) => 
          renderCatheterSection(entry, index)
        )}
      </div>
    ));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.catheterForm}>
      {renderGroupedCatheters()}

      {!isViewMode && (
        <div className={styles.formActions}>
          <button 
            type="button" 
            onClick={addNewCatheter}
            className={styles.addButton}
          >
            + Add Another Catheter
          </button>
          <button type="submit" className={styles.submitButton}>
            Save Changes
          </button>
        </div>
      )}
      
      {isViewMode && onAdd && (
        <div className={styles.formActions}>
          <button 
            type="button" 
            onClick={onAdd}
            className={styles.addButton}
          >
            + Add New Catheter
          </button>
        </div>
      )}
    </form>
  );
};

export default CatheterForm; 