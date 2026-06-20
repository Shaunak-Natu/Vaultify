import { useState, useRef } from 'react';
import { CloseIcon, DownloadIcon, UploadIcon } from './Icons';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function ImportExportModal({ onClose, onImported }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('export');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  async function doExport(fmt) {
    try {
      const res = fmt === 'json' ? await api.exportJSON() : await api.exportCSV();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vaultify-export-${Date.now()}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported as ${fmt.toUpperCase()}`, 'success');
    } catch (err) {
      toast('Export failed: ' + err.message, 'error');
    }
  }

  async function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let result;
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        result = await api.importJSON(parsed);
      } else {
        result = await api.importCSV(text);
      }
      toast(`Imported ${result.imported} entries${result.skipped ? ` (${result.skipped} skipped)` : ''}`, 'success');
      onImported();
      onClose();
    } catch (err) {
      toast('Import failed: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Import / Export</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="tabs">
          <button className={`tab ${tab === 'export' ? 'active' : ''}`} onClick={() => setTab('export')}>Export</button>
          <button className={`tab ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>Import</button>
        </div>

        {tab === 'export' ? (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Download all your vault entries in plaintext. Store the file securely — it contains your unencrypted passwords.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => doExport('json')}>
                <DownloadIcon /> Export JSON
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => doExport('csv')}>
                <DownloadIcon /> Export CSV
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
              Import entries from a Vaultify export file, or a compatible CSV from Bitwarden / 1Password / Chrome.
            </p>
            <div style={{ padding: '16px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Supports <strong>.json</strong> and <strong>.csv</strong> files
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                <UploadIcon /> {importing ? 'Importing…' : 'Choose File'}
              </button>
              <input ref={fileRef} type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={doImport} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              ⚠️ Imported entries are encrypted and added to your existing vault. Duplicates will be added as new entries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
