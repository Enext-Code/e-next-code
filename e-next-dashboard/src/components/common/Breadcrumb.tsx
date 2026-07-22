import React from 'react';
import Link from 'next/link';
import styles from '@/styles/breadcrumb.module.css';
import Image from 'next/image';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  date?: string;
  day?: string;
}

const Breadcrumb = ({ items, date, day }: BreadcrumbProps) => {
  return (
    <div className={styles.breadcrumbContainer}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard" className={styles.homeIcon}>
          <Image src="https://enext-assets.s3.ap-south-1.amazonaws.com/assets/icons/home-bread-Icon-Color.svg" alt="Home" width={24} height={24} />
        </Link>
        <img src="/Vector205.svg" alt="Edit" className={styles.separator} />
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item.href ? (
              <>
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
                <img src="/Vector205.svg" alt="Edit" className={styles.separator} />
                {/* <span className={styles.separator}>{'>'}</span> */}
              </>
            ) : (
              <span className={styles.currentPage}>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
      {(date || day) && (
        <div className={styles.dateInfo}>
          {date && <span className={styles.date}>Date: {date}</span>}
          {day && <span className={styles.day}>DAY: {day}</span>}
        </div>
      )}
    </div>
  );
};

export default Breadcrumb; 