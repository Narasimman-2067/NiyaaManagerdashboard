import React, { useMemo, memo } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import EnquiryStats from './EnquiryStats';

/**
 * DashboardHome
 * ---------------------------------------------------------------------------
 * Summary view for the admin dashboard.
 * Shows:
 * - total products
 * - total categories
 * - out-of-stock count
 * - enquiry summary widget
 */
const DashboardHome = memo(function DashboardHome({
  totalProducts = 0,
  totalCategories = 0,
  outOfStock = 0,
  enquiries = [],
}) {
  /**
   * Defensive safety in case parent accidentally passes a non-array value.
   */
  const safeEnquiries = Array.isArray(enquiries) ? enquiries : [];

  /**
   * Dashboard stat cards are memoized because they only depend on numeric props.
   */
  const stats = useMemo(
    () => [
      {
        key: 'total-products',
        label: 'Total Products',
        value: totalProducts,
        icon: 'bi-box',
        color: 'primary',
      },
      {
        key: 'categories',
        label: 'Categories',
        value: totalCategories,
        icon: 'bi-tags',
        color: 'success',
      },
      {
        key: 'out-of-stock',
        label: 'Out of Stock',
        value: outOfStock,
        icon: 'bi-exclamation-triangle',
        color: 'danger',
      },
    ],
    [totalProducts, totalCategories, outOfStock]
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Page Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="d-flex align-items-center gap-2 mb-4">
        <i className="bi bi-house-door fs-4 text-primary-custom" aria-hidden="true"></i>
        <h4 className="mb-0 fw-semibold">Dashboard</h4>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat Cards + Enquiry Widget                                        */}
      {/* ------------------------------------------------------------------ */}
      <Row className="g-3">
        {stats.map((stat) => (
          <Col xs={6} md={4} lg={3} key={stat.key}>
            <Card className="stat-card stat-card-light h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small fw-medium">{stat.label}</div>
                    <div className="h2 fw-bold mt-1 mb-0">{stat.value}</div>
                  </div>

                  <div
                    className={`text-${stat.color} opacity-75`}
                    style={{ fontSize: '2.4rem', lineHeight: 1 }}
                    aria-hidden="true"
                  >
                    <i className={`bi ${stat.icon}`}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}

        <Col xs={12} md={6} lg={3}>
          <EnquiryStats enquiries={safeEnquiries} />
        </Col>
      </Row>

      {/* ------------------------------------------------------------------ */}
      {/* Quick Actions Info Card                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mt-4 shadow-sm border-0 stat-card">
        <Card.Body className="d-flex align-items-center gap-3 flex-wrap">
          <i className="bi bi-info-circle fs-4 text-primary-custom" aria-hidden="true"></i>

          <div>
            <h6 className="mb-0 fw-semibold">Quick Actions</h6>
            <p className="text-muted small mb-0">
              Use the <strong>Products</strong> menu to manage your inventory.
              Export/Import is available for backups and bulk updates.
            </p>
          </div>
        </Card.Body>
      </Card>
    </>
  );
});

export default DashboardHome;