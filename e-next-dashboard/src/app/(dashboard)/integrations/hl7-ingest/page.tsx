'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/common/Breadcrumb';
import { API_ENDPOINTS } from '@/constants/api';
import { fetchApi } from '@/utils/api';
import styles from './hl7-ingest.module.css';

type VitalValue = {
  value: number;
  unit?: string;
  source?: string;
};

type IngestResult = {
  id: string;
  vendor: string;
  observed_at?: string;
  vitals: Record<string, VitalValue>;
  progress_sheet_vitals: Record<string, string>;
  progress_sheet_id?: string | null;
  progress_sheet_date?: string | null;
  progress_sheet_time?: string | null;
  progress_sheet_note?: string | null;
  match: {
    hospital_name: string;
    icu_name: string;
    bed_number: number;
    patient_id?: string | null;
    patient_unique_id?: string | null;
  };
};

function formatHl7Time(raw?: string | null) {
  if (!raw) return '—';
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return raw;
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+05:30`;
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSheetDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatHourSlot(time?: string | null) {
  if (!time) return '—';
  const hour = Number(time.split(':')[0]);
  if (Number.isNaN(hour)) return time;
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}

function progressSheetHref(result: IngestResult) {
  const patientId = result.match.patient_id;
  const date = result.progress_sheet_date;
  if (!patientId || !date) return null;
  if (result.progress_sheet_id && result.progress_sheet_time) {
    return `/patients/${patientId}/progress-sheet/date/${date}/${result.progress_sheet_id}/view/${encodeURIComponent(result.progress_sheet_time)}`;
  }
  return `/patients/${patientId}/progress-sheet/date/${date}`;
}

const DUMMY_ORU = `MSH|^~\\&|MINDRAY_EGATEWAY^00A03700273EDE18^EUI-64|MINDRAY|||20260912120000.0000+0530||ORU^R01^ORU_R01|23545|P|2.6|||AL|NE||UNICODE UTF-8|||IHE_PCD_001^IHE PCD^1.3.6.1.4.1.19376.1.6.1.1.1^ISO
PID|||^^^Hospital^PI|JOHN SMITH|||||unknownrace
PV1||I|ICU^^5^XYZ HOSPITAL^^^^^00-0F-14-50-72-99
OBR|1|23545^MINDRAY_EGATEWAY^00A03700273EDE18^EUI-64|23545^MINDRAY_EGATEWAY^00A03700273EDE18^EUI-64|182777000^monitoring of patient^SCT|||20260912120000.0000+0530
OBX|1|NM|150456^MDC_PULS_OXIM_SAT_O2^MDC|1.3.1.150456|98|262688^MDC_DIM_PERCENT^MDC|||||R|||20260912120000.0000+0530||||000F14049B507238^BIG_DIPPER^000F14049B507238^EUI-64
OBX|2|NM|149530^MDC_PULS_OXIM_PULS_RATE^MDC|1.3.1.149530|65|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|3|NM|150488^MDC_BLD_PERF_INDEX^MDC|1.3.1.150488|1.76|262688^MDC_DIM_PERCENT^MDC|||||R|||20260912120000.0000+0530
OBX|4|NM|151658^MDC_PULS_OXIM_PLETH_RESP_RATE^MDC|1.3.1.151658|19|264928^MDC_DIM_RESP_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|5|NM|151578^MDC_TTHOR_RESP_RATE^MDC|1.7.1.151578|17|264928^MDC_DIM_RESP_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|6|NM|148066^MDC_ECG_V_P_C_RATE^MDC|1.7.2.148066|1|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|7|NM|108^MNDRY_ECG_PAUSE_RATE^99MNDRY|1.7.2.108|0|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|8|NM|352^MNDRY_ECG_VPB_RATE^99MNDRY|1.7.2.352|0|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|9|NM|579^MNDRY_ECG_RHY_V_P_C_CPLT_RATE^99MNDRY|1.7.2.579|0|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|10|NM|580^MNDRY_ECG_RHY_MISSB_RATE^99MNDRY|1.7.2.580|0|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|11|NM|581^MNDRY_ECG_BEAT_V_P_C_RonT_RATE^99MNDRY|1.7.2.581|0|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
OBX|12|NM|148216^MDC_ECG_SV_BEATS^MDC|1.7.2.148216|0|262656^MDC_DIM_DIMLESS^MDC|||||R|||20260912120000.0000+0530
OBX|13|NM|147842^MDC_ECG_HEART_RATE^MDC|1.7.4.147842|66|264864^MDC_DIM_BEAT_PER_MIN^MDC|||||R|||20260912120000.0000+0530
`;

export default function Hl7IngestPage() {
  const [raw, setRaw] = useState(DUMMY_ORU);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<IngestResult | null>(null);

  const loadSample = async () => {
    setError('');
    try {
      const response = await fetchApi<{ name: string; raw_hl7: string }>(
        API_ENDPOINTS.INTEGRATIONS.HL7_SAMPLE
      );
      if (response.data?.raw_hl7) {
        setRaw(response.data.raw_hl7);
      }
    } catch {
      setRaw(DUMMY_ORU);
    }
  };

  useEffect(() => {
    loadSample();
  }, []);

  const save = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetchApi<IngestResult>(
        API_ENDPOINTS.INTEGRATIONS.HL7_INGEST,
        {
          method: 'POST',
          body: JSON.stringify({ raw_hl7: raw }),
        }
      );
      setResult(response.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 style={{ fontSize: '28px', fontWeight: 600 }}>Save monitor HL7</h1>
      <Breadcrumb items={[{ label: 'Monitor HL7' }]} />
      {/* <p className={styles.lead}>
        Dummy Mindray message matches hospital <strong>XYZ HOSPITAL</strong> and
        bed <strong>5</strong>. Save writes Heart Rate and SpO2 onto that bed
        and onto the same Progress Sheet date and hour as the HL7 time
        (12 Sep 2026, 12:00 becomes <strong>12:00 PM</strong>).
      </p> */}

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>HL7 message</h2>
          <textarea
            className={styles.textarea}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            spellCheck={false}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={loading || !raw.trim()}
              onClick={save}
            >
              {loading ? 'Saving…' : 'Save to bed'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={loading}
              onClick={() => {
                setResult(null);
                setError('');
                loadSample();
              }}
            >
              Reset dummy sample
            </button>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          {result ? (
            <p className={styles.ok}>
              Saved on {result.match.hospital_name} / {result.match.icu_name} /
              Bed {result.match.bed_number}
              {result.match.patient_unique_id
                ? ` → patient ${result.match.patient_unique_id}`
                : ' (no admitted patient on this bed yet)'}
            </p>
          ) : null}
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Saved vitals</h2>
          {!result ? (
            <p className={styles.empty}>Click Save to bed to store this sample.</p>
          ) : (
            <>
              <div className={styles.meta}>
                <div>Vendor: {result.vendor}</div>
                <div>Monitor time: {formatHl7Time(result.observed_at)}</div>
              </div>
              <div className={styles.sheetBox}>
                <div className={styles.sheetTitle}>Where it is on Progress Sheet</div>
                {result.progress_sheet_date && result.progress_sheet_time ? (
                  <>
                    <div>
                      Date: <strong>{formatSheetDate(result.progress_sheet_date)}</strong>
                    </div>
                    <div>
                      Hour: <strong>{formatHourSlot(result.progress_sheet_time)}</strong>{' '}
                      ({result.progress_sheet_time})
                    </div>
                    {progressSheetHref(result) ? (
                      <Link className={styles.sheetLink} href={progressSheetHref(result) || '#'}>
                        Open that hour on Progress Sheet
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <div>
                    Not written on Progress Sheet yet.
                    {result.match.patient_id
                      ? ''
                      : ' Admit a patient on Bed 5 first, then save again.'}
                  </div>
                )}
                {result.progress_sheet_note ? (
                  <p className={styles.sheetNote}>{result.progress_sheet_note}</p>
                ) : null}
              </div>
              <table className={styles.vitals}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.progress_sheet_vitals).map(([label, value]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
