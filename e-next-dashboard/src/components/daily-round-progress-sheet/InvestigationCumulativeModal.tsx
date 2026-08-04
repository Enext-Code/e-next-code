'use client';

import React, { useState } from 'react';
import { InvestigationReportData } from '@/services/investigationReportService';
import styles from './InvestigationCumulativeModal.module.css';

interface InvestigationCumulativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: InvestigationReportData[];
  patientName?: string;
}

type ParamCell = {
  value?: string;
  flag?: 'H' | 'L' | null;
  imageUrls?: string[];
};

export type CumulativeRow = {
  testName: string;
  section: string;
  cells: Record<string, ParamCell>;
};

export function toDateKey(analysisDate: string): string {
  if (!analysisDate) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(analysisDate)) {
    return analysisDate.slice(0, 10);
  }
  const d = new Date(analysisDate);
  if (Number.isNaN(d.getTime())) return analysisDate;
  return d.toISOString().slice(0, 10);
}

function formatDateHeader(dateKey: string): string {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return dateKey;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Wall-clock time from analysis_date (same approach as Select Time list). */
function formatTimeHeader(analysisDate: string): string {
  if (!analysisDate) return '';
  const match = analysisDate.match(/T(\d{2}):(\d{2})/);
  let hours = 0;
  let minutes = 0;
  if (match) {
    hours = Number(match[1]);
    minutes = Number(match[2]);
  } else {
    const dateString = analysisDate.endsWith('Z') ? analysisDate : `${analysisDate}Z`;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    hours = d.getUTCHours();
    minutes = d.getUTCMinutes();
  }
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export type ColumnMeta = {
  key: string;
  sortKey: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
};

export type DateGroup = {
  dateKey: string;
  dateLabel: string;
  columns: ColumnMeta[];
};

/** Keep reports from the latest analysis date back through (n - 1) calendar days. */
export function filterReportsLastNDays(
  reports: InvestigationReportData[],
  n = 3
): InvestigationReportData[] {
  if (!reports.length || n <= 0) return [];

  const parseKey = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const dateKeys = reports
    .map((r) => toDateKey(r.analysis_date))
    .filter(Boolean)
    .sort();
  if (dateKeys.length === 0) return [];

  const latestKey = dateKeys[dateKeys.length - 1];
  const latest = parseKey(latestKey);
  const cutoff = new Date(latest);
  cutoff.setDate(cutoff.getDate() - (n - 1));

  return reports.filter((r) => {
    const key = toDateKey(r.analysis_date);
    if (!key) return false;
    const d = parseKey(key);
    return d >= cutoff && d <= latest;
  });
}

function getFlag(value: unknown, min?: unknown, max?: unknown): 'H' | 'L' | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return null;
  const minN = min == null || min === '' ? null : Number(min);
  const maxN = max == null || max === '' ? null : Number(max);
  if (maxN != null && !Number.isNaN(maxN) && n > maxN) return 'H';
  if (minN != null && !Number.isNaN(minN) && n < minN) return 'L';
  return null;
}

function formatCellValue(value: unknown): string {
  if (value == null || value === '') return '';
  return String(value);
}

/** Prefer same-origin proxy so S3 CORS does not break img/lightbox. */
function toDisplayUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/media-proxy')) return url;
  if (/^https?:\/\//i.test(url)) {
    return `/media-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function resolveRadiologyUrls(
  fileKeys: string[] | undefined,
  presignedUrls: Record<string, string> | undefined
): string[] {
  if (!fileKeys?.length) return [];
  return fileKeys
    .map((key) => {
      const raw = presignedUrls?.[key] || (key.startsWith('http') ? key : '');
      return toDisplayUrl(raw);
    })
    .filter(Boolean);
}

function upsertCell(
  rowsMap: Map<string, CumulativeRow>,
  testName: string,
  section: string,
  columnKey: string,
  value: unknown,
  min?: unknown,
  max?: unknown
) {
  const display = formatCellValue(value);
  if (!display) return;

  const key = `${section}::${testName}`;
  let row = rowsMap.get(key);
  if (!row) {
    row = { testName, section, cells: {} };
    rowsMap.set(key, row);
  }

  const flag = getFlag(value, min, max);
  const existing = row.cells[columnKey];
  if (!existing) {
    row.cells[columnKey] = { value: display, flag };
    return;
  }

  row.cells[columnKey] = {
    ...existing,
    value: existing.value ? `${existing.value}, ${display}` : display,
    flag: existing.flag || flag,
  };
}

function upsertImageCell(
  rowsMap: Map<string, CumulativeRow>,
  testName: string,
  section: string,
  columnKey: string,
  imageUrls: string[]
) {
  if (!imageUrls.length) return;

  const key = `${section}::${testName}`;
  let row = rowsMap.get(key);
  if (!row) {
    row = { testName, section, cells: {} };
    rowsMap.set(key, row);
  }

  const existing = row.cells[columnKey];
  const merged = [...(existing?.imageUrls || []), ...imageUrls];
  // de-dupe
  const unique = Array.from(new Set(merged));
  row.cells[columnKey] = {
    ...existing,
    imageUrls: unique,
    value: existing?.value,
    flag: existing?.flag ?? null,
  };
}

export function buildCumulativeTable(reports: InvestigationReportData[]) {
  const columnsMap = new Map<string, ColumnMeta>();
  const rowsMap = new Map<string, CumulativeRow>();

  const sortedReports = [...reports].sort((a, b) =>
    String(a.analysis_date || '').localeCompare(String(b.analysis_date || ''))
  );

  for (const report of sortedReports) {
    const dateKey = toDateKey(report.analysis_date);
    if (!dateKey) continue;

    // One column per report (same date + different time = separate columns)
    const columnKey = report.report_id || `${dateKey}_${report.analysis_date}`;
    const timeLabel = formatTimeHeader(report.analysis_date);
    columnsMap.set(columnKey, {
      key: columnKey,
      sortKey: `${dateKey}T${report.analysis_date || ''}`,
      dateKey,
      dateLabel: formatDateHeader(dateKey),
      timeLabel,
    });

    const bloodValues = report.blood_analysis?.values;
    if (bloodValues && typeof bloodValues === 'object') {
      Object.entries(bloodValues).forEach(([name, raw]) => {
        const item = raw as any;
        upsertCell(
          rowsMap,
          item?.display_name || item?.parameter || name,
          'Blood Analysis',
          columnKey,
          item?.value,
          item?.min_value,
          item?.max_value
        );
      });
    }

    const arterialValues = report.arterial_analysis?.values;
    if (arterialValues && typeof arterialValues === 'object') {
      Object.entries(arterialValues).forEach(([name, raw]) => {
        const item = raw as any;
        upsertCell(
          rowsMap,
          item?.display_name || item?.parameter || name,
          'Arterial Blood Gas Analysis',
          columnKey,
          item?.value,
          item?.min_value,
          item?.max_value
        );
      });
    }

    const microValues = report.microbiology?.values;
    if (microValues && typeof microValues === 'object') {
      Object.entries(microValues).forEach(([name, raw]) => {
        const item = raw as any;
        upsertCell(
          rowsMap,
          item?.display_name || item?.parameter || name,
          'Microbiology',
          columnKey,
          item?.value ?? item?.formatted_value,
          item?.min_value,
          item?.max_value
        );
      });
    }

    const microTests = (report.microbiology as any)?.tests;
    if (Array.isArray(microTests)) {
      microTests.forEach((test: any) => {
        const label = test?.test_type || 'Microbiology Test';
        const detail = [test?.specimen_source, test?.remarks].filter(Boolean).join(' — ') || 'Done';
        upsertCell(rowsMap, label, 'Microbiology', columnKey, detail);
      });
    }

    if (Array.isArray(report.radiology_list)) {
      report.radiology_list.forEach((rad) => {
        const label = rad.subtype
          ? `${rad.radiology_type} (${rad.subtype})`
          : rad.radiology_type || 'Radiology';
        const urls = resolveRadiologyUrls(rad.file_keys, report.presigned_urls);
        if (urls.length > 0) {
          upsertImageCell(rowsMap, label, 'Radiology', columnKey, urls);
        } else {
          const detail =
            rad.number_of_images != null ? `${rad.number_of_images} image(s)` : 'Done';
          upsertCell(rowsMap, label, 'Radiology', columnKey, detail);
        }
      });
    }
  }

  const isCellFilled = (cell?: ParamCell) => {
    if (!cell) return false;
    if (cell.imageUrls && cell.imageUrls.length > 0) return true;
    if (cell.value != null && String(cell.value).trim() !== '') return true;
    return false;
  };

  const unsortedRows = Array.from(rowsMap.values());

  // Drop time columns where every test cell is empty/Nil
  const columns = Array.from(columnsMap.values())
    .filter((col) => unsortedRows.some((row) => isCellFilled(row.cells[col.key])))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Group remaining time columns under a single date header
  const dateGroups: DateGroup[] = [];
  for (const col of columns) {
    const last = dateGroups[dateGroups.length - 1];
    if (last && last.dateKey === col.dateKey) {
      last.columns.push(col);
    } else {
      dateGroups.push({
        dateKey: col.dateKey,
        dateLabel: col.dateLabel,
        columns: [col],
      });
    }
  }

  const sectionOrder = [
    'Arterial Blood Gas Analysis',
    'Blood Analysis',
    'Microbiology',
    'Radiology',
  ];

  // Fixed display order (only sequence; data unchanged)
  const arterialTestOrder = [
    'pH',
    'pCO2',
    'pO2',
    'HCO3',
    'HCO3 Actual',
    'sO2',
    'Sodium (ABG)',
    'Potassium (ABG)',
    'Chloride (ABG)',
    'Calcium Ionized (ABG)',
    'Base Excess',
    'Anion Gap',
    'Lactate (ABG)',
    'Glucose (ABG)',
    'Hemoglobin (ABG)',
    'Hematocrit (ABG)',
  ];

  const bloodTestOrder = [
    'Haemoglobin',
    'RBC Count',
    'WBC Count',
    'PCV/Hematocrit',
    'MCV',
    'MCH',
    'MCHC',
    'Neutrophils',
    'Lymphocytes',
    'Monocytes',
    'Basophils',
    'Absolute Neutrophil Count',
    'Absolute Lymphocyte',
    'Absolute Monocyte',
    'PT',
    'INR',
    'aPTT',
    'Total Protein',
    'Albumin',
    'Total Bilirubin',
    'Direct Bilirubin',
    'SGPT/ALT',
    'Alkaline Phosphatase',
    'GGT',
    'Blood Urea',
    'Serum Creatinine',
    'Uric Acid',
    'Sodium',
    'Potassium',
    'Bicarbonate',
    'Chloride',
    'Phosphorus',
    'Calcium Total',
    'Magnesium',
    'CPK Total',
    'CPK-MB',
    'Troponin I',
    'T3 Total',
    'T4 Total',
    'TSH',
    'Ammonia',
  ];

  const testOrderIndex = (section: string, testName: string) => {
    if (section === 'Arterial Blood Gas Analysis') {
      const idx = arterialTestOrder.indexOf(testName);
      return idx === -1 ? 1000 : idx;
    }
    if (section === 'Blood Analysis') {
      // Enum value is "Calcium"; display_name is often "Calcium Total"
      const normalized = testName === 'Calcium' ? 'Calcium Total' : testName;
      const idx = bloodTestOrder.indexOf(normalized);
      return idx === -1 ? 1000 : idx;
    }
    return 0;
  };

  const rows = unsortedRows.sort((a, b) => {
    const si = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    if (si !== 0) return si;
    const ai = testOrderIndex(a.section, a.testName);
    const bi = testOrderIndex(b.section, b.testName);
    if (ai !== bi) return ai - bi;
    return a.testName.localeCompare(b.testName);
  });

  return { columns, dateGroups, rows };
}

export default function InvestigationCumulativeModal({
  isOpen,
  onClose,
  reports,
  patientName,
}: InvestigationCumulativeModalProps) {
  const { columns, dateGroups, rows } = buildCumulativeTable(reports);
  const [preview, setPreview] = useState<{ urls: string[]; index: number } | null>(null);

  if (!isOpen) return null;

  const openPreview = (urls: string[], index: number) => {
    setPreview({ urls, index });
  };

  const closePreview = () => setPreview(null);

  const showPrev = () => {
    if (!preview) return;
    setPreview({
      ...preview,
      index: (preview.index - 1 + preview.urls.length) % preview.urls.length,
    });
  };

  const showNext = () => {
    if (!preview) return;
    setPreview({
      ...preview,
      index: (preview.index + 1) % preview.urls.length,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Investigation cumulative results"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Cumulative Investigation Results</h2>
            {patientName ? <p className={styles.subtitle}>{patientName}</p> : null}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={styles.tableWrap}>
          {columns.length === 0 || rows.length === 0 ? (
            <div className={styles.empty}>No investigation data available for this patient.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr className={styles.dateHeaderRow}>
                  <th className={`${styles.stickyCol} ${styles.testNameHeader}`} rowSpan={2}>
                    Test Name
                  </th>
                  {dateGroups.map((group) => (
                    <th
                      key={group.dateKey}
                      className={styles.dateGroupHeader}
                      colSpan={group.columns.length}
                    >
                      {group.dateLabel}
                    </th>
                  ))}
                </tr>
                <tr className={styles.timeHeaderRow}>
                  {dateGroups.flatMap((group) =>
                    group.columns.map((col) => (
                      <th key={col.key} className={styles.timeHeader}>
                        {col.timeLabel || '—'}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const showSectionHeading =
                    rowIndex === 0 || rows[rowIndex - 1].section !== row.section;
                  const colSpan = columns.length + 1;

                  return (
                    <React.Fragment key={`${row.section}-${row.testName}`}>
                      {showSectionHeading && (
                        <tr className={styles.sectionHeadingRow}>
                          <td className={styles.sectionHeadingCell} colSpan={colSpan}>
                            {row.section}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className={styles.stickyCol}>
                          <span className={styles.testName}>{row.testName}</span>
                        </td>
                        {columns.map((col) => {
                          const cell = row.cells[col.key];
                          const hasImages = !!(cell?.imageUrls && cell.imageUrls.length > 0);
                          const hasValue = !!(cell?.value && String(cell.value).trim());

                          return (
                            <td key={col.key}>
                              {!cell || (!hasImages && !hasValue) ? (
                                <span className={styles.nil}>Nil</span>
                              ) : hasImages ? (
                                <div className={styles.thumbRow}>
                                  {cell.imageUrls!.map((url, idx) => (
                                    <button
                                      key={`${url}-${idx}`}
                                      type="button"
                                      className={styles.thumbButton}
                                      onClick={() => openPreview(cell.imageUrls!, idx)}
                                      title="View image"
                                    >
                                      <img
                                        src={url}
                                        alt={`${row.testName} ${idx + 1}`}
                                        className={styles.thumb}
                                      />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span
                                  className={
                                    cell.flag === 'H'
                                      ? styles.high
                                      : cell.flag === 'L'
                                        ? styles.low
                                        : undefined
                                  }
                                >
                                  {String(cell.value)
                                    .split(',')
                                    .map((part, idx, arr) => (
                                      <span key={`${col.key}-${idx}`}>
                                        {part.trim()}
                                        {idx < arr.length - 1 ? (
                                          <span className={styles.comma}>, </span>
                                        ) : null}
                                      </span>
                                    ))}
                                  {cell.flag === 'H' ? (
                                    <span className={styles.flagArrow} title="High" aria-label="High">
                                      {' '}↑
                                    </span>
                                  ) : cell.flag === 'L' ? (
                                    <span className={styles.flagArrow} title="Low" aria-label="Low">
                                      {' '}↓
                                    </span>
                                  ) : null}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {preview && (
        <div
          className={styles.lightbox}
          onClick={closePreview}
          role="presentation"
        >
          <div
            className={styles.lightboxInner}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={closePreview}
              aria-label="Close preview"
            >
              ×
            </button>
            {preview.urls.length > 1 && (
              <button
                type="button"
                className={styles.lightboxNavLeft}
                onClick={showPrev}
                aria-label="Previous image"
              >
                ‹
              </button>
            )}
            <img
              src={preview.urls[preview.index]}
              alt={`Preview ${preview.index + 1}`}
              className={styles.lightboxImage}
            />
            {preview.urls.length > 1 && (
              <button
                type="button"
                className={styles.lightboxNavRight}
                onClick={showNext}
                aria-label="Next image"
              >
                ›
              </button>
            )}
            {preview.urls.length > 1 && (
              <div className={styles.lightboxCounter}>
                {preview.index + 1} / {preview.urls.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
