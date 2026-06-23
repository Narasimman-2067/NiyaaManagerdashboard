import React, { useState, useMemo, memo, useCallback } from 'react';
import {
  Container, Navbar, Button, Offcanvas, Row, Col, Badge, Image
} from 'react-bootstrap';
import DashboardHome from './DashboardHome';
import ProductsManager from './ProductsManager';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Dashboard = memo(({
  products = [],
  enquiries = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleStatus,
  onLogout,
  error,
  onReset,
  onExport,
  onImport,
  isSaving = false,
}) => {
  const { darkMode } = useTheme();
  const [view, setView] = useState('dashboard');
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  // Memoized derived data
  const totalProducts = useMemo(() => products.length, [products]);
  const categories = useMemo(() =>
    [...new Set(products.map((p) => p.category || 'Misc'))],
    [products]
  );
  const outOfStock = useMemo(() =>
    products.filter((p) => p.status === 'no_stock').length,
    [products]
  );

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid' },
    { key: 'products', label: 'Products', icon: 'bi-box' },
  ];

  const handleNavClick = useCallback((key) => {
    setView(key);
    setShowOffcanvas(false);
  }, []);

  const NavButton = memo(({ item, active, onClick }) => (
    <Button
      variant={active ? 'primary' : 'outline-primary'}
      className={`mb-2 text-start w-100 d-flex align-items-center gap-2 btn-3d ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <i className={`bi ${item.icon} fs-5`}></i>
      <span>{item.label}</span>
    </Button>
  ));

  return (
    <>
      <Navbar
        bg={darkMode ? 'dark' : 'white'}
        variant={darkMode ? 'dark' : 'light'}
        className="border-bottom shadow-sm sticky-top"
        style={{ zIndex: 1050 }}
        expand="lg"
      >
        <Container fluid>
          <Navbar.Toggle
            aria-controls="offcanvasNavbar"
            onClick={() => setShowOffcanvas(true)}
            className="border-0 d-lg-none"
          />

          <Navbar.Brand className="d-flex align-items-center gap-2">
            <i className="bi bi-box-seam text-lavender"></i>
            <span className="fw-semibold">Niyaa</span>
            {isSaving && (
              <Badge bg="primary" className="saving-indicator">
                <i className="bi bi-arrow-repeat spin me-1"></i>
                Saving...
              </Badge>
            )}
          </Navbar.Brand>

          <div className="d-flex align-items-center gap-2">
            <ThemeToggle />
            <Image
              src="https://ui-avatars.com/api/?name=Admin&background=6C5CE7&color=fff&size=32"
              roundedCircle
              alt="Admin"
              className="d-none d-sm-inline-block cursor-pointer"
              style={{ width: '32px', height: '32px' }}
              onClick={() => setShowOffcanvas(true)}
              tabIndex={0}
              role="button"
              aria-label="Open user menu"
            />
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={onLogout}
              className="d-flex align-items-center gap-1"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span className="d-none d-sm-inline">Logout</span>
            </Button>
          </div>
        </Container>
      </Navbar>

      <Container fluid className="p-0">
        <Row className="g-0">
          {/* Desktop Sidebar */}
          <Col
            lg={2}
            className="d-none d-lg-block sidebar-desktop vh-100 overflow-auto"
            style={{
              background: darkMode ? '#1a1628' : '#fcfaff',
              borderRight: `1px solid ${darkMode ? '#2d2d3f' : '#e9e4f0'}`,
            }}
          >
            <div className="d-flex flex-column p-3 h-100">
              {navItems.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={view === item.key}
                  onClick={() => setView(item.key)}
                />
              ))}

              <hr className="my-3" />

              <Button
                variant="danger"
                className="text-start d-flex align-items-center gap-2 btn-3d mt-2"
                onClick={onLogout}
              >
                <i className="bi bi-box-arrow-right fs-5"></i>
                <span>Logout</span>
              </Button>

              <div className="mt-auto pt-4">
                <small className="text-muted d-block text-center">
                  <i className="bi bi-database me-1"></i>
                  {totalProducts} products
                </small>
              </div>
            </div>
          </Col>

          {/* Main Content */}
          <Col xs={12} lg={10} className="main-content">
            {error && (
              <div className="alert alert-warning border-0 m-3 d-flex flex-wrap align-items-center justify-content-between">
                <span>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={onReset}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Reset
                </Button>
              </div>
            )}

            {view === 'dashboard' && (
              <DashboardHome
                totalProducts={totalProducts}
                totalCategories={categories.length}
                outOfStock={outOfStock}
                enquiries={enquiries}
              />
            )}

            {view === 'products' && (
              <ProductsManager
                products={products}
                categories={categories}
                onAdd={onAdd}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
                onExport={onExport}
                onImport={onImport}
              />
            )}
          </Col>
        </Row>
      </Container>

      {/* Mobile Offcanvas */}
      <Offcanvas
        id="offcanvasNavbar"
        show={showOffcanvas}
        onHide={() => setShowOffcanvas(false)}
        placement="start"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-box-seam me-2 text-lavender"></i>
            Niyaa
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          <div
            className="d-flex align-items-center gap-3 mb-4 p-3 rounded"
            style={{ background: darkMode ? '#2d2d3f' : '#f0edf5' }}
          >
            <Image
              src="https://ui-avatars.com/api/?name=Admin&background=6C5CE7&color=fff&size=48"
              roundedCircle
              alt="Admin"
              style={{ width: '48px', height: '48px' }}
            />
            <div>
              <div className="fw-bold">Admin</div>
              <small className="text-muted">admin@example.com</small>
            </div>
          </div>

          {navItems.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={view === item.key}
              onClick={() => handleNavClick(item.key)}
            />
          ))}

          <hr className="my-3" />

          <Button
            variant="danger"
            className="text-start d-flex align-items-center gap-2 btn-3d"
            onClick={() => {
              onLogout();
              setShowOffcanvas(false);
            }}
          >
            <i className="bi bi-box-arrow-right fs-5"></i>
            <span>Logout</span>
          </Button>

          <div className="mt-auto pt-4">
            <small className="text-muted d-block text-center">
              <i className="bi bi-database me-1"></i>
              {totalProducts} products
            </small>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
                .btn-3d {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
                    border-radius: 12px;
                }
                .btn-3d:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                }
                .btn-3d.active {
                    box-shadow: 0 4px 15px rgba(108, 92, 231, 0.35);
                    transform: translateY(-1px);
                }
                .sidebar-desktop {
                    min-height: 100vh;
                }
            `}</style>
    </>
  );
});

export default Dashboard;