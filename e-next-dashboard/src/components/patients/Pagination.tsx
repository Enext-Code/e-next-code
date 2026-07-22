import React from 'react';
import styles from '@/styles/patients.module.css';

const Pagination = () => {
  return (
    <div className={styles.pagination}>
      <button className={styles.paginationButton}>← Previous</button>
      <div className={styles.pageNumbers}>
        <button className={styles.pageNumber}>1</button>
        <button className={styles.pageNumber}>2</button>
        <button className={styles.pageNumber}>3</button>
        <span>...</span>
        <button className={styles.pageNumber}>8</button>
        <button className={styles.pageNumber}>9</button>
        <button className={styles.pageNumber}>10</button>
      </div>
      <button className={styles.paginationButton}>Next →</button>
    </div>
  );
};

export default Pagination;
