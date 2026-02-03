import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, FileCheck, AlertCircle, LogOut, Heart, Wifi, WifiOff, FileSpreadsheet, FileText } from 'lucide-react';

import { FileUpload } from './components/FileUpload';
import { Login } from './components/Login';
import { extractContentFromFiles, listAvailableModels } from './services/GeminiService';
import { generateWordDocument } from './services/DocxGenerator';
import { generateExcelDocument } from './services/ExcelGenerator';

/**
 * Main Application Component
 * Manages authentication, file upload, AI processing, and document generation.
 */
function App() {
    // --- State Management ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [apiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');

    // File & Processing State
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [fileName, setFileName] = useState("Math Questions");
    const [format, setFormat] = useState('docx'); // 'docx' | 'excel'

    // System Status
    const [availableModels, setAvailableModels] = useState(null);
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);

    // --- Effects ---

    // Restore session
    useEffect(() => {
        const auth = sessionStorage.getItem('auth_token');
        if (auth === 'valid') {
            setIsAuthenticated(true);
        }
    }, []);

    // Check API connection
    useEffect(() => {
        if (isAuthenticated && apiKey) {
            checkConnection();
        }
    }, [isAuthenticated, apiKey]);

    // --- Handlers ---

    const handleLogin = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('auth_token', 'valid');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('auth_token');
        resetState();
    };

    const checkConnection = async () => {
        if (!apiKey) return;
        setIsCheckingConnection(true);
        try {
            const models = await listAvailableModels(apiKey);
            setAvailableModels(models);
            if (error && error.includes('Connection')) setError(null);
        } catch (err) {
            setAvailableModels(null);
            console.error("Connection check failed:", err);
        } finally {
            setIsCheckingConnection(false);
        }
    };

    const handleProcess = async () => {
        if (!validateRequest()) return;

        setIsProcessing(true);
        setError(null);
        setSuccess(false);

        try {
            const text = await extractContentFromFiles(apiKey, files, format);
            setExtractedText(text);
            setSuccess(true);
        } catch (err) {
            setError(`Failed to extract content: ${err.message}`);
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const validateRequest = () => {
        if (!apiKey) {
            setError("Please configure VITE_GEMINI_API_KEY in .env file.");
            return false;
        }
        if (files.length === 0) {
            setError("Please upload at least one image or PDF.");
            return false;
        }
        return true;
    };

    const handleDownload = () => {
        if (!extractedText) return;

        if (format === 'excel') {
            generateExcelDocument(extractedText, fileName || 'Converted Data');
        } else {
            generateWordDocument(extractedText, fileName);
        }
    };

    const resetState = () => {
        setFiles([]);
        setSuccess(false);
        setExtractedText('');
        setIsProcessing(false);
        setError(null);
    };

    // --- Render ---

    if (!isAuthenticated) {
        return (
            <div className="App">
                <Header title="AI Document Extractor" />
                <Login onLogin={handleLogin} />
                <Footer />
            </div>
        );
    }

    return (
        <div className="App">
            <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <button onClick={handleLogout} style={{ padding: '0.5rem', background: 'transparent', color: 'var(--color-text-muted)' }}>
                    <LogOut size={20} />
                </button>
            </div>

            <Header
                title="Document Extractor"
                subtitle="Convert images of math or tables into editable Word or Excel documents."
            />

            <div className="step-container">
                <ConnectionStatus availableModels={availableModels} isChecking={isCheckingConnection} />

                <FormatSelector format={format} setFormat={setFormat} />

                <FileUpload files={files} setFiles={setFiles} />

                {error && <ErrorMessage message={error} />}

                <ActionButtons
                    success={success}
                    isProcessing={isProcessing}
                    apiKey={apiKey}
                    availableModels={availableModels}
                    files={files}
                    format={format}
                    fileName={fileName}
                    setFileName={setFileName}
                    handleProcess={handleProcess}
                    handleDownload={handleDownload}
                    reset={resetState}
                />

                {success && <Preview content={extractedText} />}

                <Footer />
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

// --- Sub-components for Cleaner JSX ---

const Header = ({ title, subtitle }) => (
    <header className="header" style={{ marginBottom: subtitle ? undefined : '1rem' }}>
        <h1>{title}</h1>
        {subtitle && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                {subtitle}
            </p>
        )}
    </header>
);

const Footer = () => (
    <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        Made with <Heart size={14} style={{ display: 'inline', color: '#ef4444', verticalAlign: 'middle' }} /> by Rino
    </footer>
);

const ConnectionStatus = ({ availableModels, isChecking }) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        {availableModels ? (
            <StatusBadge icon={Wifi} color="#15803d" bg="#dcfce7" text="System Online" />
        ) : (
            <StatusBadge icon={WifiOff} color="#b91c1c" bg="#fee2e2" text={isChecking ? 'Connecting...' : 'System Offline'} />
        )}
    </div>
);

const StatusBadge = ({ icon: Icon, color, bg, text }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem',
            color, background: bg, padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 500
        }}
    >
        <Icon size={18} />
        <span>{text}</span>
    </motion.div>
);

const FormatSelector = ({ format, setFormat }) => (
    <div style={{ marginBottom: '1.5rem', background: 'var(--color-bg)', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem' }}>
        <FormatButton
            active={format === 'docx'}
            onClick={() => setFormat('docx')}
            icon={FileText}
            label="Word (Math)"
            color="var(--color-primary)"
        />
        <FormatButton
            active={format === 'excel'}
            onClick={() => setFormat('excel')}
            icon={FileSpreadsheet}
            label="Excel (Table)"
            color="#10b981"
        />
    </div>
);

const FormatButton = ({ active, onClick, icon: Icon, label, color }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: 'none',
            background: active ? color : 'transparent',
            color: active ? (color === "var(--color-primary)" ? "var(--color-bg)" : "#fff") : 'var(--color-text-muted)',
            cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
        }}
    >
        <Icon size={18} />
        {label}
    </button>
);

const ErrorMessage = ({ message }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
            padding: '1rem', background: '#fef2f2', border: '1px solid #fee2e2',
            color: '#dc2626', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}
    >
        <AlertCircle size={20} />
        <div><strong>Error: </strong> {message}</div>
    </motion.div>
);

const ActionButtons = ({ success, isProcessing, apiKey, availableModels, files, format, fileName, setFileName, handleProcess, handleDownload, reset }) => (
    <div className="responsive-flex-col" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
        {!success ? (
            <button
                onClick={handleProcess}
                disabled={isProcessing || !apiKey || !availableModels || files.length === 0}
                className="responsive-w-full"
                style={{ width: '100%', maxWidth: '300px', fontSize: '1.1rem' }}
            >
                {isProcessing ? (
                    <>
                        <Loader2 size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        Processing...
                    </>
                ) : "Extract & Convert"}
            </button>
        ) : (
            <div className="responsive-flex-col" style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <div className="responsive-w-full" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '200px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>File Name (Optional)</label>
                    <input
                        type="text"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Math Questions"
                        style={{ padding: '0.6rem' }}
                    />
                </div>
                <button
                    onClick={handleDownload}
                    className="responsive-w-full"
                    style={{ background: '#10b981', minWidth: '200px', height: 'fit-content', alignSelf: 'flex-end' }}
                >
                    <FileCheck size={20} />
                    {format === 'excel' ? 'Download Excel' : 'Download Word Doc'}
                </button>
                <button
                    onClick={reset}
                    className="responsive-w-full"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', height: 'fit-content', alignSelf: 'flex-end' }}
                >
                    Remove All and Convert Again
                </button>
            </div>
        )}
    </div>
);

const Preview = ({ content }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
            marginTop: '2rem', padding: '1rem', background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)'
        }}
    >
        <h3 style={{ marginTop: 0 }}>Preview</h3>
        <div style={{
            maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap',
            fontFamily: 'monospace', fontSize: '0.9rem', background: 'var(--color-bg)',
            padding: '1rem', borderRadius: 'var(--radius-md)'
        }}>
            {content}
        </div>
    </motion.div>
);

export default App;
