import React from 'react';
import styles from '@/styles/components/analysisTabs.module.css';

interface AnalysisTab {
  id: string;
  label: string;
}

interface AnalysisTabsProps {
  tabs: AnalysisTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const AnalysisTabs = ({ tabs, activeTab, onTabChange }: AnalysisTabsProps) => {
  return (
    <div className={styles.tabsContainer}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default AnalysisTabs; 