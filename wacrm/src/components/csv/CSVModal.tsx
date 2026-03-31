'use client';

import { useState } from 'react';
import { X, Upload, Download } from 'lucide-react';

interface CSVModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function CSVModal({ onClose, onImportSuccess }: CSVModalProps) {
  const [mode, setMode] = useState<'import' | 'export'>('import');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [csvContent, setCSVContent] = useState('');
  const [importResults, setImportResults] = useState<any>(null);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/csv/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Contacts exported successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCSVContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) {
      setError('Please upload a CSV file');
      return;
    }

    setLoading(true);
    setError('');
    setImportResults(null);

    try {
      const response = await fetch('/api/csv/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const data = await response.json();
      setImportResults(data.results);
      setSuccess(`Imported ${data.results.imported} contacts!`);
      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">CSV Operations</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setMode('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              mode === 'import'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setMode('export')}
            className={`flex items-center gap-2 px-4 py-2 rounded transition ${
              mode === 'export'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Import View */}
        {mode === 'import' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <p className="text-xs text-gray-600 mt-2">
                Required columns: phoneNumber. Optional: name, email, source, interest, estimatedValue
              </p>
            </div>

            {importResults && (
              <div className="space-y-2 p-3 bg-blue-50 rounded">
                <p className="text-sm font-medium">Import Results:</p>
                <p className="text-sm">✅ Imported: {importResults.imported}</p>
                <p className="text-sm">⚠️ Duplicates: {importResults.duplicates}</p>
                {importResults.errors.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">
                      Errors ({importResults.errors.length})
                    </summary>
                    <ul className="mt-2 ml-4 space-y-1">
                      {importResults.errors.slice(0, 5).map((err: string, i: number) => (
                        <li key={i} className="text-red-600">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !csvContent}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        )}

        {/* Export View */}
        {mode === 'export' && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Export all contacts as a CSV file. You can then import this file elsewhere or use it for backup.
            </p>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
