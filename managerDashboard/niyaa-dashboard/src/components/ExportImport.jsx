// ============================================================
// FILE: src/components/ExportImport.js
// ============================================================
import React, { useRef } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';

const ExportImport = ({ onExport, onImport }) => {
    const fileInputRef = useRef(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onImport(file);
            e.target.value = ''; // reset so same file can be re-imported
        }
    };

    return (
        <ButtonGroup size="sm">
            <Button
                variant="outline-success"
                onClick={onExport}
                className="d-flex align-items-center gap-1"
            >
                <i className="bi bi-download"></i>
                <span className="d-none d-sm-inline">Export</span>
            </Button>
            <Button
                variant="outline-primary"
                onClick={handleImportClick}
                className="d-flex align-items-center gap-1"
            >
                <i className="bi bi-upload"></i>
                <span className="d-none d-sm-inline">Import</span>
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleFileChange}
            />
        </ButtonGroup>
    );
};

export default ExportImport;