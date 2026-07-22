import React from 'react';
import styles from '@/styles/dashboard.module.css';

const PatientChart = () => {
  // This is a placeholder. In a real app, you would use a chart library
  return (
    <div className={styles.chartContainer}>
      <div className={styles.chart}>
        {/* Y-axis labels */}
        <div className={styles.yAxis}>
          <div>100%</div>
          <div>80%</div>
          <div>60%</div>
          <div>40%</div>
          <div>20%</div>
        </div>
        
        {/* Chart area with the blue gradient */}
        <div className={styles.chartArea}>
          <div className={styles.chartLine}>
            {/* This would be replaced with actual chart implementation */}
            <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
                  <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                </linearGradient>
              </defs>
              <path 
                d="M0,240 C50,220 100,180 150,190 C200,200 250,150 300,120 C350,90 400,60 450,90 C500,120 550,240 600,210 C650,180 700,150 750,180 L750,300 L0,300 Z" 
                fill="url(#chartGradient)" 
              />
              <path 
                d="M0,240 C50,220 100,180 150,190 C200,200 250,150 300,120 C350,90 400,60 450,90 C500,120 550,240 600,210 C650,180 700,150 750,180" 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="2" 
              />
              {/* Highlight point */}
              <circle cx="300" cy="120" r="6" fill="#ff9500" stroke="#fff" strokeWidth="2" />
              <text x="300" y="100" textAnchor="middle" fill="#ff9500" fontSize="12">Oct 27</text>
            </svg>
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className={styles.xAxis}>
          <div>1st</div>
          <div>5th</div>
          <div>10th</div>
          <div>15th</div>
          <div>20th</div>
          <div>25th</div>
          <div>30th</div>
          <div>35th</div>
          <div>40th</div>
          <div>45th</div>
          <div>50th</div>
          <div>55th</div>
        </div>
      </div>
    </div>
  );
};

export default PatientChart; 