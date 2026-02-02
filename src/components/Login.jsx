import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function Login({ onLogin }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        try {
            // Hash the entered password
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Compare with env variable
            const correctHash = import.meta.env.VITE_AUTH_PASSWORD_HASH;

            if (hashHex === correctHash) {
                onLogin();
            } else {
                setError(true);
                setPassword('');
            }
        } catch (err) {
            console.error("Auth error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card"
                style={{ width: '100%', maxWidth: '400px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        width: '3rem',
                        height: '3rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        color: 'var(--color-accent)'
                    }}>
                        <Lock size={24} />
                    </div>
                    <h2 style={{ margin: 0 }}>Protected Access</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Please enter the access password.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            autoFocus
                            style={{
                                borderColor: error ? '#ef4444' : 'var(--color-border)',
                                background: error ? '#fef2f2' : 'var(--color-surface)'
                            }}
                        />
                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                <AlertCircle size={14} />
                                Incorrect password
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!password || loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Verifying...' : 'Access Application'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
