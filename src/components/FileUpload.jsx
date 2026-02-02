import React, { useRef } from 'react';
import { Upload, FileText, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FileUpload({ files, setFiles }) {
    const inputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    };

    const handleFileInput = (e) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (newFiles) => {
        const validFiles = newFiles.filter(file =>
            file.type.startsWith('image/') || file.type === 'application/pdf'
        );
        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <motion.div
            className="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                    border: '2px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(0,0,0,0.02)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileInput}
                    ref={inputRef}
                    style={{ display: 'none' }}
                />
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '1rem',
                    borderRadius: '50%',
                    color: 'var(--color-accent)',
                    display: 'inline-flex',
                    marginBottom: '1rem'
                }}>
                    <Upload size={32} />
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Upload Questions</h3>
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                    Drag & drop images or click to browse
                </p>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <AnimatePresence>
                    {files.map((file, index) => (
                        <motion.div
                            key={`${file.name}-${index}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem',
                                background: 'var(--color-bg)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {file.type.startsWith('image/') ?
                                    <ImageIcon size={20} className="text-blue-500" /> :
                                    <FileText size={20} className="text-orange-500" />
                                }
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{file.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {(file.size / 1024).toFixed(0)} KB
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                style={{
                                    padding: '0.4rem',
                                    background: 'transparent',
                                    color: '#ef4444',
                                    minWidth: 'auto'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
