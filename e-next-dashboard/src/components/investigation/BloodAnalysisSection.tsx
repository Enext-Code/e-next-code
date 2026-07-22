import React, { useState } from 'react';
import { BloodAnalysisValues, Parameter } from '@/types/investigation';
import styles from '@/styles/investigation-report/Blood-analysis-report.module.css';
import EditButton from '../common/EditButton';

interface ParameterInfo {
  display_name: string;
  reference_range: string;
  units: string | null;
  min_value: number | null;
  max_value: number | null;
}

interface BloodAnalysisSectionProps {
  values: BloodAnalysisValues | undefined;
  availableParameters: Parameter[];
  parameterInfo: { [key: string]: ParameterInfo };  // Add this prop
  isExpanded: boolean;

  onToggle: () => void;
  onEdit: (parameters: Array<{ parameter: string; value: number | string }>) => void | Promise<void>;
}

const BloodAnalysisSection: React.FC<BloodAnalysisSectionProps> = ({
  values,
  availableParameters,
  parameterInfo,  // Add this prop
  isExpanded,
  onToggle,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = () => {
    const initialValues: { [key: string]: string } = {};
    availableParameters.forEach(param => {
      initialValues[param.value] = values?.[param.value]?.value?.toString() || '';
    });
    setEditedValues(initialValues);
    setIsEditing(true);
  };

  const handleInputChange = (parameter: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [parameter]: value
    }));
  };

  const handleSave = async () => {
    const parameters = Object.entries(editedValues)
      .filter(([_, value]) => value !== '')
      .map(([parameter, value]) => ({
        parameter,
        value: isNaN(Number(value)) ? value : Number(value)
      }));
    
    setIsLoading(true);
    try {
      await onEdit(parameters);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving blood analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues({});
  };

  const checkAbnormalValue = (paramName: string, value: number | string | undefined): { isHigh: boolean; isLow: boolean } => {
    if (!value || typeof value === 'string') return { isHigh: false, isLow: false };

    const info = parameterInfo[paramName];
    if (!info) return { isHigh: false, isLow: false };

    const numValue = Number(value);
    if (isNaN(numValue)) return { isHigh: false, isLow: false };

    return {
      isHigh: info.max_value !== null && numValue > info.max_value,
      isLow: info.min_value !== null && numValue < info.min_value
    };
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>Blood Analysis</h3>
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
        <div className={styles.table}>
          <div className={styles.tableRow + ' ' + styles.tableHeader}>
            <div>Tests</div>
            <div>Results</div>
            <div>Reference Range</div>
            <div>Unit</div>
          </div>
          {availableParameters.map((parameter, index) => {
            const value = values?.[parameter.value]?.value;
            const info = parameterInfo[parameter.value];
            const { isHigh, isLow } = checkAbnormalValue(parameter.value, value);
            
            return (
              <div key={index} className={styles.tableRow}>
                <div className={styles.parameterName}>{parameter.display_name}</div>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={editedValues[parameter.value] || ''}
                      onChange={(e) => handleInputChange(parameter.value, e.target.value)}
                      className={styles.input}
                      placeholder="Enter value"
                    />
                  </div>
                ) : (
                  <div className={`${styles.value} ${isHigh ? styles.abnormalHigh : isLow ? styles.abnormalLow : ''}`}>
                    {value?.toString() || '-'}
                  </div>
                )}
                <div className={styles.referenceRange}>
                  {info?.reference_range || '-'}
                </div>
                <div className={styles.unit}>
                  {info?.units || '-'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BloodAnalysisSection; 