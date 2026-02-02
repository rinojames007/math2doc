import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Login } from './components/Login';
import { extractContentFromFiles, listAvailableModels } from './services/GeminiService';
import { generateWordDocument } from './services/DocxGenerator';
import { Loader2, FileCheck, AlertCircle, RefreshCw, LogOut, Heart, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [apiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [availableModels, setAvailableModels] = useState(null);
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [fileName, setFileName] = useState("Math Questions");

    // Check if session persisted (simple approach)
    useEffect(() => {
        const auth = sessionStorage.getItem('auth_token');
        if (auth === 'valid') {
            setIsAuthenticated(true);
        }
    }, []);

    // Auto-check connection when authenticated and API key exists
    useEffect(() => {
        if (isAuthenticated && apiKey) {
            checkConnection();
        }
    }, [isAuthenticated, apiKey]);

    const handleLogin = () => {
        setIsAuthenticated(true);
        sessionStorage.setItem('auth_token', 'valid');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('auth_token');
        reset();
    };

    const checkConnection = async () => {
        if (!apiKey) return;
        setIsCheckingConnection(true);
        // Don't clear available models immediately to avoid flicker if re-checking
        try {
            const models = await listAvailableModels(apiKey);
            setAvailableModels(models);
            // If previous error was connection related, clear it
            if (error && error.includes('Connection')) setError(null);
        } catch (err) {
            setAvailableModels(null); // Clear on error
            console.error("Connection check failed:", err);
            // We don't always want to show a big error banner for background check,
            // but the icon will reflect status.
        } finally {
            setIsCheckingConnection(false);
        }
    };

    const handleProcess = async () => {
        if (!apiKey) {
            setError("Please configure VITE_GEMINI_API_KEY in .env file.");
            return;
        }
        if (files.length === 0) {
            setError("Please upload at least one image or PDF.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setSuccess(false);

        try {
            const text = await extractContentFromFiles(apiKey, files);
            setExtractedText(text);
            setSuccess(true);
        } catch (err) {
            setError(`Failed to extract content: ${err.message}`);
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (extractedText) {
            generateWordDocument(extractedText, fileName);
        }
    };

    const reset = () => {
        setFiles([]);
        setSuccess(false);
        setExtractedText('');
        setIsProcessing(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="App">
                <header className="header" style={{ marginBottom: '1rem' }}>
                    <h1>Math Extractor</h1>
                </header>
                <Login onLogin={handleLogin} />
                <footer style={{ marginTop: 'auto', padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Made with <Heart size={14} style={{ display: 'inline', color: '#ef4444', verticalAlign: 'middle' }} /> by Rino
                </footer>
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

            <header className="header">
                <h1>Math Extractor</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
                    Convert handwritten or printed math questions into editable Word document.
                </p>
            </header>

            <div className="step-container">

                {/* Connection Status Indicator */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    {availableModels ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                color: '#15803d',
                                background: '#dcfce7',
                                padding: '0.5rem 1rem',
                                borderRadius: '2rem',
                                fontWeight: 500
                            }}
                        >
                            <Wifi size={18} />
                            <span>System Online</span>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                                color: '#b91c1c',
                                background: '#fee2e2',
                                padding: '0.5rem 1rem',
                                borderRadius: '2rem',
                                fontWeight: 500
                            }}
                        >
                            <WifiOff size={18} />
                            <span>{isCheckingConnection ? 'Connecting...' : 'System Offline'}</span>
                        </motion.div>
                    )}
                </div>

                <FileUpload files={files} setFiles={setFiles} />

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            padding: '1rem',
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <AlertCircle size={20} />
                        <div>
                            <strong>Error: </strong> {error}
                        </div>
                    </motion.div>
                )}

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
                            ) : (
                                "Extract & Convert"
                            )}
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
                                Download Word Doc
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

                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginTop: '2rem',
                            padding: '1rem',
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        <h3 style={{ marginTop: 0 }}>Preview</h3>
                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            background: 'var(--color-bg)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            {extractedText}
                        </div>
                    </motion.div>
                )}

                <footer style={{ marginTop: '4rem', marginBottom: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Made with <Heart size={14} style={{ display: 'inline', color: '#ef4444', verticalAlign: 'middle' }} /> by Rino
                </footer>
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

export default App;
