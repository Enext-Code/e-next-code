'use client';

import React from 'react';
import { CatheterEntry } from '@/services/catheterService';
import styles from '@/styles/catheter.module.css';

type CatheterType = 'Central Line' | 'Foley Catheter';

interface CatheterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  catheter: CatheterEntry | null;
  onSave: (catheter: CatheterEntry) => void | Promise<void>;
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
    'ET / Tracheostomy Tube',
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

const CatheterEditModal: React.FC<CatheterEditModalProps> = ({
  isOpen,
  onClose,
  catheter,
  onSave,
}) => {
  const [formData, setFormData] = React.useState<CatheterEntry>({
    type: null,
    catheter_type: null,
    size: null,
    site: null,
    date_of_insertion: null,
    date_of_removal: null,
    days_in_use: null,
    notes: null
  });
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (catheter) {
        setFormData(catheter);
      } else {
        // Reset to blank values when adding a new catheter
        setFormData({
          type: null,
          catheter_type: null,
          size: null,
          site: null,
          date_of_insertion: null,
          date_of_removal: null,
          days_in_use: null,
          notes: null
        });
      }
    }
  }, [catheter, isOpen]);

  const calculateDaysInUse = (insertionDate: string | null, removalDate: string | null): number | null => {
    if (!insertionDate) return null;
    const start = new Date(insertionDate);
    const end = removalDate ? new Date(removalDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateTimeLocal = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleInputChange = (field: keyof CatheterEntry, value: string) => {
    let updatedValue: any = value || null;
    
    if (field === 'size') {
      updatedValue = value ? parseInt(value) : null;
    } else if (field === 'date_of_insertion' || field === 'date_of_removal') {
      updatedValue = value ? formatDateTimeLocal(value) : null;
    } else if (field === 'catheter_type') {
      // When catheter_type changes, reset type to null
      updatedValue = value || null;
      const newData = {
        ...formData,
        [field]: updatedValue,
        type: null
      };
      setFormData(newData);
      return;
    }
    
    const newData = {
      ...formData,
      [field]: updatedValue
    };
    
    if (field === 'date_of_insertion' || field === 'date_of_removal') {
      newData.days_in_use = calculateDaysInUse(
        field === 'date_of_insertion' ? updatedValue : formData.date_of_insertion,
        field === 'date_of_removal' ? updatedValue : formData.date_of_removal
      );
    }
    
    setFormData(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formattedData = {
        ...formData,
        date_of_insertion: formatDateTimeLocal(formData.date_of_insertion),
        date_of_removal: formData.date_of_removal ? formatDateTimeLocal(formData.date_of_removal) : null,
        days_in_use: calculateDaysInUse(formData.date_of_insertion, formData.date_of_removal)
      };
      await onSave(formattedData);
      onClose();
    } catch (error) {
      console.error('Error saving catheter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Edit Catheter</h3>
          <button 
            type="button" 
            onClick={onClose}
            className={styles.closeButton}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>select type:</label>
            <select
              value={formData.catheter_type ?? ""}
              onChange={(e) => handleInputChange('catheter_type', e.target.value)}
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
              value={formData.type ?? ""}
              onChange={(e) => handleInputChange('type', e.target.value as CatheterType)}
              className={styles.select}
              disabled={!formData.catheter_type}
            >
              <option value="">Select Catheter Type</option>
              {formData.catheter_type && CATHETER_TYPES[formData.catheter_type as keyof typeof CATHETER_TYPES]?.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Size</label>
            <input
              type="number"
              value={formData.size ?? ""}
              onChange={(e) => handleInputChange('size', e.target.value)}
              placeholder="-"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Site</label>
            <input
              type="text"
              value={formData.site ?? ""}
              onChange={(e) => handleInputChange('site', e.target.value)}
              placeholder="-"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Date Of Insertion</label>
            <input
              type="datetime-local"
              value={formatDateForInput(formData.date_of_insertion)}
              onChange={(e) => handleInputChange('date_of_insertion', e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Days in use</label>
            <input
              type="number"
              value={calculateDaysInUse(formData.date_of_insertion, formData.date_of_removal) ?? ""}
              placeholder="-"
              className={styles.input}
              readOnly
            />
          </div>

          <div className={styles.formGroup}>
            <label>Date Of Removal</label>
            <input
              type="datetime-local"
              value={formatDateForInput(formData.date_of_removal)}
              onChange={(e) => handleInputChange('date_of_removal', e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Notes</label>
            <textarea
              value={formData.notes ?? ""}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="-"
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.modalActions}>
            <button 
              type="button" 
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={isLoading}
            >
              {isLoading && <div className={styles.loadingSpinner}></div>}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatheterEditModal;
