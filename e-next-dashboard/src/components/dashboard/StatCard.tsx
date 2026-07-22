import React from 'react';
import styles from '@/styles/dashboard.module.css';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  iconBgColor?: string;
}

const StatCard = ({ title, value, trend, icon, iconBgColor = '#e6efff' }: StatCardProps) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.statContent}>
        <h3 className={styles.statTitle}>{title}</h3>
        <div className={styles.statValue}>{value}</div>
        {trend && (
          <div className={`${styles.statTrend} ${trend.isPositive ? styles.positive : styles.negative}`}>
            <span className={styles.trendArrow}>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <div className={styles.statIcon} style={{ backgroundColor: iconBgColor }}>
        {icon}
      </div>
    </div>
  );
};

export default StatCard; 