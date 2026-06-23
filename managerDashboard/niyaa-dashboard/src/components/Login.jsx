// ============================================================
// FILE: src/components/Login.js
// ============================================================
import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../utils/constants';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate async check (no backend)
        setTimeout(() => {
            if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                onLogin();
            } else {
                setError('Invalid username or password.');
            }
            setLoading(false);
        }, 400);
    };

    return (
        <Container
            fluid
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: '100vh', background: 'var(--bs-body-bg)' }}
        >
            <Row className="w-100 justify-content-center">
                <Col xs={11} sm={8} md={6} lg={4} xl={3}>
                    <Card className="shadow-lg border-0" style={{ borderRadius: '20px' }}>
                        <Card.Body className="p-4 p-md-5">
                            <div className="text-center mb-4">
                                <div className="bg-soft-lavender rounded-circle d-inline-flex p-3 mb-3">
                                    <i className="bi bi-box-seam fs-1 text-lavender"></i>
                                </div>
                                <h4 className="fw-bold" style={{ color: '#4a3a6b' }}>
                                    Niyaa Admin
                                </h4>
                                <p className="text-muted small">Firecracker Inventory</p>
                            </div>

                            {error && (
                                <Alert variant="danger" className="py-2 small">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    {error}
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-semibold">Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                        className="rounded-pill"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="small fw-semibold">Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="rounded-pill"
                                    />
                                </Form.Group>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-100 rounded-pill py-2 fw-semibold"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Signing in…
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-box-arrow-in-right me-2"></i>
                                            Sign In
                                        </>
                                    )}
                                </Button>
                            </Form>

                            <div className="text-center mt-3">
                                <small className="text-muted">
                                    <i className="bi bi-shield-lock me-1"></i>
                                    Demo: admin / niyaa@2026
                                </small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;