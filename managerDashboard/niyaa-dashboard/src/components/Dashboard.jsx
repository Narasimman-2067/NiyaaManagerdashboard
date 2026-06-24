import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import {
  Container,
  Navbar,
  Button,
  Offcanvas,
  Row,
  Col,
  Badge,
  Image,
} from 'react-bootstrap';
import DashboardHome from './DashboardHome';
import ProductsManager from './ProductsManager';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * LocalStorage key used to persist the active dashboard tab.
 * Kept in one place to avoid typo bugs.
 */
const DASHBOARD_VIEW_KEY = 'dashboardView';

/**
 * Allowed views in the dashboard.
 * Used to validate values restored from localStorage.
 */
const VALID_VIEWS = ['dashboard', 'products'];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Safely read a value from localStorage.
 * Prevents console/runtime errors in environments where localStorage is blocked
 * or unavailable.
 */
function getStoredView() {
  try {
    const saved = localStorage.getItem(DASHBOARD_VIEW_KEY);
    return VALID_VIEWS.includes(saved) ? saved : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

/**
 * Safely persist the selected dashboard view.
 */
function setStoredView(view) {
  try {
    localStorage.setItem(DASHBOARD_VIEW_KEY, view);
  } catch {
    // Intentionally ignore storage failures.
    // The dashboard should continue to work even if persistence is blocked.
  }
}

/* -------------------------------------------------------------------------- */
/* Reusable Nav Button                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Sidebar / mobile nav button.
 * Defined outside the parent component to avoid re-creating the component
 * function on every render.
 */
const NavButton = memo(function NavButton({ item, active, onClick }) {
  return (
    <Button
      variant={active ? 'primary' : 'outline-primary'}
      className={`mb-2 text-start w-100 d-flex align-items-center gap-2 ${
        active ? 'active' : ''
      }`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
    >
      <i className={`bi ${item.icon} fs-5`} aria-hidden="true"></i>
      <span>{item.label}</span>
    </Button>
  );
});

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

const Dashboard = memo(function Dashboard({
  products = [],
  enquiries = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleStatus,
  error = null,
  onReset,
  onExport,
  onImport,
  isSaving = false,
}) {
  const { darkMode } = useTheme();

  /**
   * Keep incoming props safe even if parent accidentally passes invalid values.
   * This avoids `.map`, `.filter`, `.length` errors in the dashboard.
   */
  const safeProducts = Array.isArray(products) ? products : [];
  const safeEnquiries = Array.isArray(enquiries) ? enquiries : [];

  /**
   * Initialize current view from localStorage once on first render.
   * This avoids an unnecessary extra render compared to reading inside useEffect.
   */
  const [view, setView] = useState(() => getStoredView());

  /**
   * Controls mobile offcanvas visibility.
   */
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Persist current view                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    setStoredView(view);
  }, [view]);

  /* ---------------------------------------------------------------------- */
  /* Derived dashboard metrics                                              */
  /* ---------------------------------------------------------------------- */

  const totalProducts = useMemo(() => safeProducts.length, [safeProducts]);

  const categories = useMemo(() => {
    return [...new Set(
      safeProducts.map((product) => {
        const category = typeof product?.category === 'string'
          ? product.category.trim()
          : '';
        return category || 'Misc';
      })
    )];
  }, [safeProducts]);

  const outOfStock = useMemo(() => {
    return safeProducts.filter((product) => product?.status === 'no_stock').length;
  }, [safeProducts]);

  /**
   * Navigation config used by both desktop sidebar and mobile offcanvas.
   */
  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid' },
      { key: 'products', label: 'Products', icon: 'bi-box' },
    ],
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Event Handlers                                                         */
  /* ---------------------------------------------------------------------- */

  const closeOffcanvas = useCallback(() => {
    setShowOffcanvas(false);
  }, []);

  const toggleOffcanvas = useCallback(() => {
    setShowOffcanvas((prev) => !prev);
  }, []);

  /**
   * Handles navigation click from mobile offcanvas.
   * Also closes the offcanvas after navigation.
   */
  const handleNavClick = useCallback((key) => {
    if (!VALID_VIEWS.includes(key)) return;
    setView(key);
    setShowOffcanvas(false);
  }, []);

  /**
   * Handles navigation click from desktop sidebar.
   */
  const handleDesktopNavClick = useCallback((key) => {
    if (!VALID_VIEWS.includes(key)) return;
    setView(key);
  }, []);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Top Navbar                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Navbar
        bg={darkMode ? 'dark' : 'white'}
        variant={darkMode ? 'dark' : 'light'}
        className="border-bottom shadow-sm sticky-top"
        style={{ zIndex: 1050 }}
        expand="lg"
      >
        <Container fluid>
          <Navbar.Toggle
            aria-controls="dashboard-offcanvas"
            onClick={toggleOffcanvas}
            className="border-0 d-lg-none"
          />

          <Navbar.Brand className="d-flex align-items-center gap-2">
            <i className="bi bi-box-seam text-lavender" aria-hidden="true"></i>
            <span className="fw-semibold">Niyaa</span>

            {/* Show saving indicator only when an actual save is in progress */}
            {isSaving && (
              <Badge bg="primary" className="saving-indicator">
                <i className="bi bi-arrow-repeat spin me-1" aria-hidden="true"></i>
                Saving...
              </Badge>
            )}
          </Navbar.Brand>

          <div className="d-flex align-items-center gap-2">
            <ThemeToggle />

            {/* Avatar doubles as mobile menu trigger */}
            <Image
              src="https://ui-avatars.com/api/?name=Admin&background=6C5CE7&color=fff&size=32"
              roundedCircle
              alt="Admin"
              className="d-none d-sm-inline-block cursor-pointer"
              style={{ width: '32px', height: '32px' }}
              onClick={toggleOffcanvas}
              tabIndex={0}
              role="button"
              aria-label="Open dashboard menu"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleOffcanvas();
                }
              }}
            />
          </div>
        </Container>
      </Navbar>

      {/* ------------------------------------------------------------------ */}
      {/* Main Layout                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Container fluid className="p-0">
        <Row className="g-0">
          {/* -------------------------------------------------------------- */}
          {/* Desktop Sidebar                                                */}
          {/* -------------------------------------------------------------- */}
          <Col
            lg={2}
            className="d-none d-lg-block sidebar-desktop vh-100 overflow-auto"
            style={{
              background: darkMode ? '#1a1628' : '#ffffff',
              borderRight: `1px solid ${darkMode ? '#2d2d3f' : '#e9e4f0'}`,
            }}
          >
            <div className="d-flex flex-column p-3 h-100">
              {navItems.map((item) => (
                <NavButton
                  key={item.key}
                  item={item}
                  active={view === item.key}
                  onClick={() => handleDesktopNavClick(item.key)}
                />
              ))}

              <div className="mt-auto pt-4">
                <small className="text-muted d-block text-center">
                  <i className="bi bi-database me-1" aria-hidden="true"></i>
                  {totalProducts} products
                </small>
              </div>
            </div>
          </Col>

          {/* -------------------------------------------------------------- */}
          {/* Main Content                                                   */}
          {/* -------------------------------------------------------------- */}
          <Col xs={12} lg={10} className="main-content">
            {Boolean(error) && (
              <div className="alert alert-warning border-0 m-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span>
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
                  {error}
                </span>

                {typeof onReset === 'function' && (
                  <Button variant="outline-secondary" size="sm" onClick={onReset}>
                    <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>
                    Reset
                  </Button>
                )}
              </div>
            )}

            {view === 'dashboard' && (
              <DashboardHome
                totalProducts={totalProducts}
                totalCategories={categories.length}
                outOfStock={outOfStock}
                enquiries={safeEnquiries}
              />
            )}

            {view === 'products' && (
              <ProductsManager
                products={safeProducts}
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

      {/* ------------------------------------------------------------------ */}
      {/* Mobile Offcanvas                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Offcanvas
        id="dashboard-offcanvas"
        show={showOffcanvas}
        onHide={closeOffcanvas}
        placement="start"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-box-seam me-2 text-lavender" aria-hidden="true"></i>
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

          <div className="mt-auto pt-4">
            <small className="text-muted d-block text-center">
              <i className="bi bi-database me-1" aria-hidden="true"></i>
              {totalProducts} products
            </small>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
});

export default Dashboard;