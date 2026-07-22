import React, { useState, useRef } from 'react';
import { RadiologyType, RadiologyImage } from '@/types/investigation';
import styles from '@/styles/investigation-report/rediology.module.css';

interface RadiologySectionProps {
  images: RadiologyImage[];
  availableTypes: RadiologyType[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpload: (radiologyData: Array<{ radiology_type: string; subtype: string; file_indices: number[] }>, files: File[]) => void;
  onDelete?: (fileKey: string) => Promise<void>;
  presignedUrls: { [key: string]: string };
}

const RadiologySection: React.FC<RadiologySectionProps> = ({
  images,
  availableTypes,
  isExpanded,
  onToggle,
  onUpload,
  onDelete,
  presignedUrls
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !selectedType) return;

    setIsLoading(true);
    try {
      // Create radiology data array with indices
      const radiologyData = files.map((_, index) => ({
        radiology_type: selectedType,
        subtype: '', // Send empty subtype
        file_indices: [index]
      }));

      // Pass both arrays separately
      await onUpload(radiologyData, files);
      
      // Reset form and close upload form
      setIsUploading(false);
      setSelectedType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    setIsUploading(true);
  };

  const handleCancelUpload = () => {
    setIsUploading(false);
    setSelectedType('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (fileKey: string) => {
    if (!onDelete) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete this image?');
    if (!confirmDelete) return;

    setDeletingKeys(prev => new Set(prev).add(fileKey));
    try {
      await onDelete(fileKey);
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setDeletingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileKey);
        return newSet;
      });
    }
  };

  // Group images by type only
  const groupedImages = images.reduce((acc, img) => {
    const type = img.radiology_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(img);
    return acc;
  }, {} as { [key: string]: RadiologyImage[] });

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3>Radiology</h3>
        <div>
          {isUploading ? (
            <button 
              className={styles.cancelButton} 
              onClick={handleCancelUpload}
              disabled={isLoading}
            >
              Cancel
            </button>
          ) : (
            <button 
              className={styles.uploadButton} 
              onClick={handleUploadClick}
              disabled={isLoading}
            >
              Upload
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className={styles.radiologyContent}>
          {isUploading && (
            <div className={styles.uploadForm}>
              <div className={styles.selectGroup}>
                <select 
                  value={selectedType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select Type</option>
                  {availableTypes.map((type, index) => (
                    <option key={index} value={type.value}>
                      {type.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedType && (
                <div className={styles.fileInputContainer}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                    disabled={isLoading}
                  />
                  {isLoading && (
                    <div className={styles.uploadingIndicator}>
                      <div className={styles.loadingSpinner}></div>
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.imageGrid}>
            {Object.entries(groupedImages).map(([type, images]) => (
              <div key={type} className={styles.imageGroup}>
                <h4>{type}</h4>
                <div className={styles.images}>
                  {images.map((image, index) => (
                    <div key={index} className={styles.imageContainer}>
                      {image.file_keys.map((fileKey, fileIndex) => (
                        <div key={fileIndex} className={styles.imageWrapper}>
                          <img
                            src={presignedUrls[fileKey]}
                            alt={`${type} Image ${fileIndex + 1}`}
                            onClick={() => window.open(presignedUrls[fileKey], '_blank')}
                            style={{ cursor: 'pointer' }}
                          />
                          {onDelete && (
                            <button
                              className={styles.deleteImageButton}
                              onClick={() => handleDeleteImage(fileKey)}
                              disabled={deletingKeys.has(fileKey)}
                              title="Remove image"
                            >
                              {deletingKeys.has(fileKey) ? (
                                <span className={styles.deleteSpinner}></span>
                              ) : (
                                '×'
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologySection; 