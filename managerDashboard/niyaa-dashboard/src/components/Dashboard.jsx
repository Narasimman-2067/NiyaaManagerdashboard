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
  Modal,
} from 'react-bootstrap';
import DashboardHome from './DashboardHome';
import ProductsManager from './ProductsManager';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const DASHBOARD_VIEW_KEY = 'dashboardView';
const VALID_VIEWS = ['dashboard', 'products'];

function getStoredView() {
  try {
    const saved = localStorage.getItem(DASHBOARD_VIEW_KEY);
    return VALID_VIEWS.includes(saved) ? saved : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

function setStoredView(view) {
  try {
    localStorage.setItem(DASHBOARD_VIEW_KEY, view);
  } catch {}
}

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
  const safeProducts = Array.isArray(products) ? products : [];
  const safeEnquiries = Array.isArray(enquiries) ? enquiries : [];

  // View state
  const [view, setView] = useState(() => getStoredView());
  const [showOffcanvas, setShowOffcanvas] = useState(false);

  // Filter state for Products view
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);

  // Derived data
  const totalProducts = safeProducts.length;
  const categories = useMemo(() => {
    return [...new Set(safeProducts.map((p) => (p?.category?.trim() || 'Misc')))];
  }, [safeProducts]);

  const outOfStockProducts = useMemo(() => {
    return safeProducts.filter((p) => p?.status === 'no_stock');
  }, [safeProducts]);

  // ----- Filter & navigation handlers -----
  const clearFilters = useCallback(() => {
    setFilterCategory(null);
    setFilterStatus(null);
  }, []);

  const navigateToProductsWithFilter = useCallback((category, status) => {
    setFilterCategory(category || null);
    setFilterStatus(status || null);
    setView('products');
    setShowOffcanvas(false);
  }, []);

  // Dashboard stat click handlers
  const navigateToProducts = useCallback(() => {
    clearFilters();
    setView('products');
    setShowOffcanvas(false);
  }, [clearFilters]);

  const openCategoryModal = useCallback(() => setShowCategoryModal(true), []);
  const closeCategoryModal = useCallback(() => setShowCategoryModal(false), []);

  const openOutOfStockModal = useCallback(() => setShowOutOfStockModal(true), []);
  const closeOutOfStockModal = useCallback(() => setShowOutOfStockModal(false), []);

  // Handlers for modal actions
  const handleCategoryClick = useCallback((cat) => {
    navigateToProductsWithFilter(cat, null);
    closeCategoryModal();
  }, [navigateToProductsWithFilter, closeCategoryModal]);

  const handleViewOutOfStock = useCallback(() => {
    navigateToProductsWithFilter(null, 'no_stock');
    closeOutOfStockModal();
  }, [navigateToProductsWithFilter, closeOutOfStockModal]);

  // Nav / offcanvas handlers
  const closeOffcanvas = useCallback(() => setShowOffcanvas(false), []);
  const toggleOffcanvas = useCallback(() => setShowOffcanvas((p) => !p), []);

  const handleNavClick = useCallback((key) => {
    if (!VALID_VIEWS.includes(key)) return;
    if (key === 'products') clearFilters();
    setView(key);
    setShowOffcanvas(false);
  }, [clearFilters]);

  const handleDesktopNavClick = useCallback((key) => {
    if (!VALID_VIEWS.includes(key)) return;
    if (key === 'products') clearFilters();
    setView(key);
  }, [clearFilters]);

  // Persist view
  useEffect(() => {
    setStoredView(view);
  }, [view]);

  const navItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid' },
      { key: 'products', label: 'Products', icon: 'bi-box' },
    ],
    []
  );

  return (
    <>
      {/* Top Navbar */}
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

            {isSaving && (
              <Badge bg="primary" className="saving-indicator">
                <i className="bi bi-arrow-repeat spin me-1" aria-hidden="true"></i>
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

      {/* Main layout */}
      <Container fluid className="p-0">
        <Row className="g-0">
          {/* Desktop sidebar */}
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

          {/* Main content */}
          <Col xs={12} lg={10} className="main-content">
            {error && (
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
                outOfStock={outOfStockProducts.length}
                enquiries={safeEnquiries}
                onNavigateToProducts={navigateToProducts}
                onShowCategories={openCategoryModal}
                onShowOutOfStock={openOutOfStockModal}
              />
            )}

            {view === 'products' && (
              <ProductsManager
                products={safeProducts}
                categories={categories}
                filterCategory={filterCategory}
                filterStatus={filterStatus}
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

      {/* Category Modal */}
      <Modal show={showCategoryModal} onHide={closeCategoryModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Categories</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {categories.length === 0 ? (
            <p className="text-muted">No categories found.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {categories.map((cat, idx) => (
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between align-items-center clickable-list-item"
                  onClick={() => handleCategoryClick(cat)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCategoryClick(cat);
                    }
                  }}
                >
                  {cat}
                  <Badge bg="secondary" pill>
                    {safeProducts.filter((p) => p.category === cat).length}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCategoryModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Out of Stock Modal */}
      <Modal show={showOutOfStockModal} onHide={closeOutOfStockModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Out of Stock Products</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {outOfStockProducts.length === 0 ? (
            <p className="text-muted">All products are in stock.</p>
          ) : (
            <>
              <ul className="list-group list-group-flush">
                {outOfStockProducts.map((p) => (
                  <li key={p.rowid || p.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-box me-2 text-danger"></i>
                      {p.name || 'Unnamed'}
                    </span>
                    <Badge bg="danger">Out of Stock</Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-center">
                <Button variant="primary" onClick={handleViewOutOfStock}>
                  <i className="bi bi-eye me-1"></i> View All Out of Stock
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeOutOfStockModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Mobile offcanvas */}
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
        <Offcanvas.Body className="d-flex flex-column mt-2">
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