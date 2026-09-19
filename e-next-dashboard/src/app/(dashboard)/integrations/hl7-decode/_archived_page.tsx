/*
ORIGINAL HL7 Decode page — kept commented, do not delete.

'use client';

import React, { useRef, useState } from 'react';
import Breadcrumb from '@/components/common/Breadcrumb';
import { API_ENDPOINTS } from '@/constants/api';
import { fetchApi } from '@/utils/api';
import styles from './hl7-decode.module.css';

type VitalValue = {
  value: number;
  unit?: string;
  source?: string;
  code?: string;
};

type DecodedMessage = {
  vendor: string;
  message_type: string;
  control_id: string;
  sent_at?: string;
  observed_at?: string;
  patient: { id: string; name: string; sex: string };
  location: { department: string; room: string; bed: string };
  vitals: Record<string, VitalValue>;
  progress_sheet_vitals: Record<string, string>;
  observation_count: number;
};

type DecodeResponse = {
  message_count: number;
  messages: DecodedMessage[];
};

const VITAL_ORDER = [
  'heart_rate',
  'spo2',
  'systolic',
  'diastolic',
  'temp_oral',
  'cvp',
  'respiratory_rate',
  'mean_bp',
];

const VITAL_LABELS: Record<string, string> = {
  heart_rate: 'Heart Rate',
  spo2: 'SpO2',
  systolic: 'Systolic',
  diastolic: 'Diastolic',
  temp_oral: 'Temp Oral',
  cvp: 'CVP',
  respiratory_rate: 'Respiratory Rate',
  mean_bp: 'Mean BP',
};

export default function Hl7DecodePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DecodeResponse | null>(null);
  const [index, setIndex] = useState(0);

  const message = result?.messages[index];

  const decode = async (text: string) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetchApi<DecodeResponse>(
        API_ENDPOINTS.INTEGRATIONS.HL7_DECODE,
        {
          method: 'POST',
          body: JSON.stringify({ raw_hl7: text }),
        }
      );
      setResult(response.data);
      setIndex(0);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Decode failed');
    } finally {
      setLoading(false);
    }
  };

  const loadSample = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetchApi<{ name: string; raw_hl7: string }>(
        API_ENDPOINTS.INTEGRATIONS.HL7_SAMPLE
      );
      setRaw(response.data.raw_hl7);
      await decode(response.data.raw_hl7);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sample');
      setLoading(false);
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    await decode(text);
    event.target.value = '';
  };

  return (
    <div className={styles.page}>
      <h1 style={{ fontSize: '28px', fontWeight: 600 }}>HL7 Decode</h1>
      <Breadcrumb items={[{ label: 'HL7 Decode' }]} />
      <p className={styles.lead}>
        Paste a Mindray eGateway or Philips ORU^R01 message. This only decodes
        numbers — it does not save to the progress sheet yet.
      </p>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Raw HL7</h2>
          <textarea
            className={styles.textarea}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="MSH|^~\\&|MINDRAY_EGATEWAY..."
            spellCheck={false}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={loading || !raw.trim()}
              onClick={() => decode(raw)}
            >
              {loading ? 'Decoding…' : 'Decode'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={loading}
              onClick={loadSample}
            >
              Load Mindray sample
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={loading}
              onClick={() => fileRef.current?.click()}
            >
              Open HL7 file
            </button>
            <input
              ref={fileRef}
              className={styles.fileInput}
              type="file"
              accept=".txt,.hl7,.oru,.log,text/plain"
              onChange={onFile}
            />
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Decoded vitals</h2>
          {!message ? (
            <p className={styles.empty}>
              Decode a message to see Heart Rate, SpO2, BP and temperature.
            </p>
          ) : (
            <>
              {result && result.message_count > 1 ? (
                <div className={styles.pager}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={index === 0}
                    onClick={() => setIndex((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Message {index + 1} of {result.message_count}
                  </span>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={index >= result.message_count - 1}
                    onClick={() => setIndex((value) => value + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}

              <dl className={styles.meta}>
                <div>
                  <dt>Vendor</dt>
                  <dd>{message.vendor || '—'}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{message.message_type || '—'}</dd>
                </div>
                <div>
                  <dt>Patient ID</dt>
                  <dd>{message.patient.id || 'empty — type IPID on monitor'}</dd>
                </div>
                <div>
                  <dt>Bed</dt>
                  <dd>
                    {[message.location.department, message.location.room, message.location.bed]
                      .filter(Boolean)
                      .join(' / ') || '—'}
                  </dd>
                </div>
              </dl>

              <table className={styles.vitals}>
                <thead>
                  <tr>
                    <th>Progress sheet field</th>
                    <th>Value</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {VITAL_ORDER.filter((key) => message.vitals[key]).map((key) => {
                    const vital = message.vitals[key];
                    return (
                      <tr key={key}>
                        <td>{VITAL_LABELS[key] || key}</td>
                        <td>
                          {vital.value}
                          {vital.unit ? ` ${vital.unit}` : ''}
                        </td>
                        <td>{vital.source || vital.code}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
*/
export {};
