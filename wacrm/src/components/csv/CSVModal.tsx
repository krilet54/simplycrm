'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Download, Upload } from 'lucide-react';

interface CSVModalProps {
  onClose: () => void;
  onImportSuccess?: () => void;
}

export default function CSVModal({ onClose, onImportSuccess }: CSVModalProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  async function handleImport() {
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setLoading(true);
    try {
      const content = await file.text();
      const res = await fetch('/api/csv/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: content }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const data = await res.json();
      setResults(data.results);
      toast.success(`Imported ${data.results.imported} contacts`);
      if (onImportSuccess) {
        setTimeout(onImportSuccess, 1000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/csv/export');
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Contacts exported');
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">CSV Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 p-6 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => { setMode('import'); setResults(null); setFile(null); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
              mode === 'import'
                ? 'bg-forest-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <Upload size={16} className="inline mr-2" />
            Import
          </button>
          <button
            onClick={() => { setMode('export'); setResults(null); }}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
              mode === 'export'
                ? 'bg-forest-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <Download size={16} className="inline mr-2" />
            Export
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {mode === 'import' ? (
            <>
              {!results ? (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-700 font-medium mb-2">Choose a CSV file</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Required columns: phoneNumber | Optional: name, email, source, interest, estimatedValue
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="csv-file"
                    />
                    <label
                      htmlFor="csv-file"
                      className="btn-secondary inline-block cursor-pointer"
                    >
                      Select File
                    </label>
                    {file && (
                      <p className="text-sm text-green-600 mt-3">
                        ✓ {file.name}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      ✓ Imported: {results.imported} contacts
                    </p>
                  </div>
                  {results.duplicates > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 font-medium">
                        ⚠ Duplicates skipped: {results.duplicates}
                      </p>
                    </div>
                  )}
                  {results.errors && results.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <p className="text-red-800 font-medium mb-2">Errors:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {results.errors.slice(0, 5).map((err: string, i: number) => (
                          <li key={i}>• {err}</li>
                        ))}
                        {results.errors.length > 5 && (
                          <li>... and {results.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-700">
                Download all contacts as CSV for backup or external use.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📥 Includes: Name, Phone, Email, Source, Stage, Tags, Estimated Value
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            onClick={mode === 'import' ? handleImport : handleExport}
            disabled={loading || (mode === 'import' && !file && !results)}
            className="btn-primary flex-1 justify-center"
          >
            {loading ? 'Processing...' : mode === 'import' ? 'Import' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
