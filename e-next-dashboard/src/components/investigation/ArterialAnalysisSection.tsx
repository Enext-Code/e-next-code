import React, { useState } from 'react';
import { ArterialAnalysisValues, Parameter } from '@/types/investigation';
import styles from '@/styles/investigationReport.module.css';
import EditButton from '../common/EditButton';
import { arterialBloodGasParameterInfo, arterialParameterOrder } from '@/constants/arterialBloodGasParameters';

interface ArterialAnalysisSectionProps {
  values: ArterialAnalysisValues | undefined;
  availableParameters: Parameter[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (parameters: Array<{ parameter: string; value: number | string }>) => void | Promise<void>;
}

const ArterialAnalysisSection: React.FC<ArterialAnalysisSectionProps> = ({
  values,
  availableParameters,
  isExpanded,
  onToggle,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleEditClick = () => {
    // Initialize edited values with current values
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
    // Convert edited values to the format expected by the API
    const parameters = Object.entries(editedValues)
      .filter(([_, value]) => value !== '') // Only include non-empty values
      .map(([parameter, value]) => ({
        parameter,
        value: isNaN(Number(value)) ? value : Number(value)
      }));
    
    setIsLoading(true);
    try {
      await onEdit(parameters);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving arterial analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedValues({});
  };

  const checkAbnormalValue = (value: string | number | undefined, parameterName: string): { isHigh: boolean; isLow: boolean } => {
    if (!value) return { isHigh: false, isLow: false };
    
    // For pH, normal range is 7.35-7.45
    if (typeof value === 'number' && parameterName === 'pH') {
      return {
        isHigh: value > 7.45,
        isLow: value < 7.35
      };
    }

    const stringValue = value.toString().toLowerCase();
    return {
      isHigh: stringValue.includes('high') || stringValue.includes('h'),
      isLow: stringValue.includes('low') || stringValue.includes('l')
    };
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>Arterial Blood Gas Analysis</h3>
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
            // <button className={styles.editButton} onClick={handleEditClick}>Edit</button>
          )}
          {/* <button className={styles.expandButton} onClick={onToggle}>
            {isExpanded ? '-' : '+'}
          </button> */}
        </div>
      </div>
      
      {isExpanded && (
        <div className={styles.table}>
          <div className={styles.tableRow + ' ' + styles.tableHeader}>
            <div>Parameter</div>
            <div>Value</div>
            <div>Reference Range</div>
            <div>Unit</div>
          </div>
          {[...availableParameters].sort((a, b) => {
            const aIdx = arterialParameterOrder.indexOf(a.value);
            const bIdx = arterialParameterOrder.indexOf(b.value);
            const aOrder = aIdx === -1 ? 1000 : aIdx;
            const bOrder = bIdx === -1 ? 1000 : bIdx;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.display_name.localeCompare(b.display_name);
          }).map((parameter, index) => {
            const value = values?.[parameter.value];
            const { isHigh, isLow } = checkAbnormalValue(value?.value, parameter.value);
            const parameterInfo = arterialBloodGasParameterInfo[parameter.value];
            
            return (
              <div key={index} className={styles.tableRow}>
                <div>{parameter.display_name}</div>
                {isEditing ? (
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={editedValues[parameter.value] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Only allow numeric input (including decimals and negative numbers)
                        if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
                          handleInputChange(parameter.value, val);
                        }
                      }}
                      className={styles.input}
                      placeholder="Enter value"
                    />
                  </div>
                ) : (
                  <div className={`${styles.value} ${isHigh ? styles.abnormalHigh : isLow ? styles.abnormalLow : ''}`}>
                    {value?.value?.toString() || ''}
                  </div>
                )}
                <div className={styles.referenceRange}>
                  {parameterInfo?.reference_range || '-'}
                </div>
                <div className={styles.unit}>
                  {parameterInfo?.units || '-'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArterialAnalysisSection; 