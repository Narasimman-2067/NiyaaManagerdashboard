import React, { useRef, useCallback } from 'react';
import { Button } from 'react-bootstrap';

/**
 * ExportImport
 * ----------------------------------------------------------------------------
 * Handles:
 * - Exporting dashboard/store data
 * - Importing a JSON backup file
 *
 * Notes:
 * - Uses a hidden file input for JSON import
 * - Validates file type before calling onImport
 * - Resets file input value so the same file can be re-imported
 */
const ExportImport = ({ onExport, onImport, disabled = false }) => {
  const fileInputRef = useRef(null);

  /**
   * Opens the hidden file picker.
   */
  const handleImportClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  /**
   * Handles file selection for JSON import.
   * Adds basic validation before calling the import handler.
   */
  const handleFileChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];

      // Reset value at the end so the same file can be selected again
      const resetInput = () => {
        event.target.value = '';
      };

      if (!file) {
        resetInput();
        return;
      }

      /**
       * Basic file validation:
       * - accept .json extension
       * - accept JSON mime type when available
       */
      const isJsonFile =
        file.name.toLowerCase().endsWith('.json') ||
        file.type === 'application/json' ||
        file.type === 'text/json';

      if (!isJsonFile) {
        window.alert('Please select a valid JSON file.');
        resetInput();
        return;
      }

      if (typeof onImport === 'function') {
        onImport(file);
      }

      resetInput();
    },
    [onImport]
  );

  /**
   * Safe export click handler.
   */
  const handleExportClick = useCallback(() => {
    if (disabled) return;
    if (typeof onExport === 'function') {
      onExport();
    }
  }, [disabled, onExport]);

  return (
    <>
      {/* Action container */}
      <div className="d-flex flex-wrap align-items-center gap-2">
        <Button
          type="button"
          variant="outline-success"
          onClick={handleExportClick}
          disabled={disabled}
          className="d-flex align-items-center gap-1"
        >
          <i className="bi bi-download" aria-hidden="true"></i>
          <span className="d-none d-sm-inline">Export</span>
        </Button>

        <Button
          type="button"
          variant="outline-primary"
          onClick={handleImportClick}
          disabled={disabled}
          className="d-flex align-items-center gap-1"
        >
          <i className="bi bi-upload" aria-hidden="true"></i>
          <span className="d-none d-sm-inline">Import</span>
        </Button>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
};

export default ExportImport;