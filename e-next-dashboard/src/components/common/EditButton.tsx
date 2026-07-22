import React from 'react';
import styles from '@/styles/common.module.css';

interface EditButtonProps {
  onClick: () => void;
  label?: string;
}

const EditButton = ({ onClick, label = 'Edit Details' }: EditButtonProps) => {
  return (
    <button className={styles.editButton} onClick={onClick}>
      <img src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/Group+1597881133.svg" alt="Edit" className={styles.editIcon} />
      <span className={styles.editLabel}>{label}</span>
    </button>
  );
};

export default EditButton; 