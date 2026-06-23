import React, { useMemo, memo } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import EnquiryStats from './EnquiryStats';

const DashboardHome = memo(({ totalProducts, totalCategories, outOfStock, enquiries }) => {
    const stats = useMemo(
        () => [
            { label: 'Total Products', value: totalProducts, icon: 'bi-box', color: 'primary' },
            { label: 'Categories', value: totalCategories, icon: 'bi-tags', color: 'success' },
            { label: 'Out of Stock', value: outOfStock, icon: 'bi-exclamation-triangle', color: 'danger' },
        ],
        [totalProducts, totalCategories, outOfStock]
    );

    return (
        <>
            <div className="d-flex align-items-center gap-2 mb-4">
                <i className="bi bi-house-door fs-4 text-lavender"></i>
                <h4 className="mb-0 fw-semibold">Dashboard</h4>
            </div>

            <Row className="g-3">
                {stats.map((s, i) => (
                    <Col xs={6} md={4} lg={3} key={i}>
                        <Card className="stat-card h-100">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="text-muted small fw-medium">{s.label}</div>
                                        <div className="h2 fw-bold mt-1 mb-0">{s.value}</div>
                                    </div>
                                    <div
                                        className={`text-${s.color} opacity-75`}
                                        style={{ fontSize: '2.4rem', lineHeight: 1 }}
                                    >
                                        <i className={`bi ${s.icon}`}></i>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}

                <Col xs={12} md={6} lg={3}>
                    <EnquiryStats enquiries={enquiries} />
                </Col>
            </Row>

            <Card className="mt-4 shadow-sm border-0 stat-card">
                <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
                    <i className="bi bi-info-circle fs-4 text-lavender"></i>
                    <div>
                        <h6 className="mb-0 fw-semibold">Quick Actions</h6>
                        <p className="text-muted small mb-0">
                            Use the <strong>Products</strong> menu to manage your inventory. Export/Import
                            available for backups.
                        </p>
                    </div>
                </Card.Body>
            </Card>
        </>
    );
});

export default DashboardHome;