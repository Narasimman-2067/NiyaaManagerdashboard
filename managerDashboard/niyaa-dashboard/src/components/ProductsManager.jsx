import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Row,
  Col,
  Form,
  Button,
  //Pagination,
  InputGroup,
  Badge,
  Card,
  Modal,
} from 'react-bootstrap';
import Select from 'react-select';
import ProductModal from './ProductModal';
import AlertModal from './AlertModal';
import ExportImport from './ExportImport';
import { fetchDashboardData, saveDashboardData } from '../utils/dataService';
import { formatINR, generateId } from '../utils/utils';
import { reactSelectStyles, portalSelectProps } from '../utils/selectStyles';

//const PAGE_SIZE_OPTIONS = [20, 40, 80, 200, 500];
const FALLBACK_IMAGE = 'https://via.placeholder.com/400x300/f0edf5/6C5CE7?text=No+Image';

function normalizeProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.map((p) => ({
    rowid: p.rowid || p.id || `local-${Date.now()}-${Math.random()}`,
    name: p.name ?? '',
    category: p.category ?? '',
    amount: p.amount ?? p.price ?? 0,
    price: p.price ?? p.amount ?? 0,
    image: p.image ?? '',
    contents: p.contents ?? '',
    discount_percent: Number(p.discount_percent) || 0,
    status: p.status === 'no_stock' ? 'no_stock' : 'in_stock',
  }));
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

export default function ProductManager() {
  // ---------- State ----------
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  // const [pageSize, setPageSize] = useState(5000);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [deleting, setDeleting] = useState(false);
const [showImageModal, setShowImageModal] = useState(false);
const [selectedImage, setSelectedImage] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [alert, setAlert] = useState({
    show: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'OK',
    onConfirm: null,
    showCancel: false,
    cancelText: 'Cancel',
    onCancel: null,
  });

  // Refs for touch swipe
  const gridContainerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const deleteProcessingRef = useRef(false);

  // ---------- Load Data ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDashboardData();
      const normalized = normalizeProducts(result.products);
      setProducts(normalized);
      const uniqueCategories = [...new Set(normalized.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      setError(null);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- Save to Firebase ----------
  const saveProducts = useCallback(async (newProducts, successMessage = 'Changes saved successfully') => {
    setIsSaving(true);
    try {
      await saveDashboardData({ products: newProducts });
      setIsSaving(false);
      showAlert('Success', successMessage, 'success');
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      setIsSaving(false);
      setError('Failed to save changes. Check console.');
      showAlert('Error', 'Failed to save changes. Please try again.', 'danger');
      return false;
    }
  }, []);

  // ---------- CRUD Handlers ----------
  const handleAdd = useCallback(async (payload) => {
    const newProduct = {
      ...payload,
      rowid: generateId(),
      last_updated: new Date().toISOString(),
    };
    const updated = [...products, newProduct];
    setProducts(updated);
    setCategories([...new Set(updated.map(p => p.category).filter(Boolean))]);
    await saveProducts(updated, 'Product added successfully');
  }, [products, saveProducts]);

  const handleUpdate = useCallback(async (payload) => {
    const { rowid, ...updates } = payload;
    const updated = products.map((p) =>
      p.rowid === rowid
        ? { ...p, ...updates, rowid: p.rowid, last_updated: new Date().toISOString() }
        : p
    );
    setProducts(updated);
    setCategories([...new Set(updated.map(p => p.category).filter(Boolean))]);
    await saveProducts(updated, 'Product updated successfully');
  }, [products, saveProducts]);

  const handleDelete = useCallback(
    (rowid) => {
      if (deleteProcessingRef.current) return;
      deleteProcessingRef.current = true;

      setAlert({
        show: true,
        title: 'Confirm Delete',
        message: 'Are you sure you want to delete this product?',
        variant: 'danger',
        confirmText: 'Delete',
        showCancel: true,
        cancelText: 'Cancel',
        onConfirm: async () => {
          setAlert((prev) => ({ ...prev, show: false }));
          setDeleting(true);
          try {
            const updated = products.filter((p) => p.rowid !== rowid);
            setProducts(updated);
            setCategories([...new Set(updated.map(p => p.category).filter(Boolean))]);
            await saveProducts(updated, 'Product deleted successfully');
          } catch (error) {
            console.error('Delete error:', error);
            showAlert('Error', 'Failed to delete product.', 'danger');
          } finally {
            setDeleting(false);
            deleteProcessingRef.current = false;
          }
        },
        onCancel: () => {
          setAlert((prev) => ({ ...prev, show: false }));
          deleteProcessingRef.current = false;
        },
      });
    },
    [products, saveProducts]
  );

  const handleToggleStatus = useCallback(async (rowid) => {
    const updated = products.map((p) =>
      p.rowid === rowid
        ? { ...p, status: p.status === 'in_stock' ? 'no_stock' : 'in_stock', last_updated: new Date().toISOString() }
        : p
    );
    setProducts(updated);
    await saveProducts(updated, 'Status toggled');
  }, [products, saveProducts]);

  // ---------- Modal controls ----------
  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setShowProductModal(true);
  }, []);

  const openEditModal = useCallback((product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setShowProductModal(false);
    setEditingProduct(null);
  }, []);

  // ---------- Alert helper ----------
  const showAlert = (title, message, variant = 'info', confirmText = 'OK') => {
    setAlert({
      show: true,
      title,
      message,
      variant,
      confirmText,
      showCancel: false,
      onConfirm: () => setAlert((prev) => ({ ...prev, show: false })),
    });
  };

  // ---------- Filter & Pagination ----------
  const filtered = useMemo(() => {
    const query = normalizeText(search);
    return products.filter((p) => {
      const matchesSearch = !query || normalizeText(p.name).includes(query) || normalizeText(p.category).includes(query);
      const matchesCategory = !filterCategory || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, filterCategory]);

  // const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // useEffect(() => {
  //   if (currentPage > totalPages) setCurrentPage(totalPages);
  // }, [currentPage, totalPages]);

  // const paginated = useMemo(() => {
  //   const start = (currentPage - 1) * pageSize;
  //   return filtered.slice(start, start + pageSize);
  // }, [filtered, currentPage, pageSize]);

  // ---------- Touch swipe ----------
  // useEffect(() => {
  //   const container = gridContainerRef.current;
  //   if (!container) return;

  //   const handleTouchStart = (e) => {
  //     touchStartX.current = e.changedTouches[0].screenX;
  //     touchStartY.current = e.changedTouches[0].screenY;
  //     isSwiping.current = false;
  //   };

  //   const handleTouchMove = (e) => {
  //     const deltaX = e.changedTouches[0].screenX - touchStartX.current;
  //     const deltaY = e.changedTouches[0].screenY - touchStartY.current;
  //     if (Math.abs(deltaX) > 20 && Math.abs(deltaX) > Math.abs(deltaY)) {
  //       e.preventDefault();
  //       isSwiping.current = true;
  //     }
  //   };

  //   // const handleTouchEnd = (e) => {
  //   //   if (!isSwiping.current) return;
  //   //   const deltaX = e.changedTouches[0].screenX - touchStartX.current;
  //   //   if (Math.abs(deltaX) < 50) return;

  //   //   if (deltaX < 0 && currentPage < totalPages) {
  //   //     setCurrentPage((p) => p + 1);
  //   //   } else if (deltaX > 0 && currentPage > 1) {
  //   //     setCurrentPage((p) => p - 1);
  //   //   }
  //   // };

  //   container.addEventListener('touchstart', handleTouchStart, { passive: true });
  //   container.addEventListener('touchmove', handleTouchMove, { passive: false });
  //   container.addEventListener('touchend', handleTouchEnd, { passive: true });

  //   return () => {
  //     container.removeEventListener('touchstart', handleTouchStart);
  //     container.removeEventListener('touchmove', handleTouchMove);
  //     container.removeEventListener('touchend', handleTouchEnd);
  //   };
  // }, [currentPage, totalPages]);

  // ---------- Back to top ----------
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ---------- Category filter options ----------
  const categoryOptions = useMemo(() => categories.map(c => ({ label: c, value: c })), [categories]);
  const selectedFilterCategory = categoryOptions.find(opt => opt.value === filterCategory) || null;

  // ---------- Export/Import ----------
  const handleExport = useCallback(() => {
    const payload = { products, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [products]);

  const handleImport = useCallback(async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedProducts = parsed?.products;
        if (!Array.isArray(importedProducts) || importedProducts.length === 0) {
          showAlert('Error', 'No products found in the file.', 'danger');
          return;
        }
        setAlert({
          show: true,
          title: 'Confirm Import',
          message: `This will replace ALL existing products with ${importedProducts.length} products from the file. Continue?`,
          variant: 'warning',
          confirmText: 'Import',
          showCancel: true,
          cancelText: 'Cancel',
          onConfirm: async () => {
            setAlert((prev) => ({ ...prev, show: false }));
            const normalized = normalizeProducts(importedProducts);
            setProducts(normalized);
            setCategories([...new Set(normalized.map(p => p.category).filter(Boolean))]);
            await saveProducts(normalized, 'Import successful!');
          },
          onCancel: () => setAlert((prev) => ({ ...prev, show: false })),
        });
      } catch (err) {
        showAlert('Error', 'Invalid JSON file.', 'danger');
      }
    };
    reader.readAsText(file);
  }, [saveProducts]);

  // ---------- Render ----------
  if (loading && products.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger rounded-3 mb-3" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-box fs-4 text-lavender" aria-hidden="true"></i>
          <span className="pt-3"><h4 className="mb-0 fw-semibold">Products</h4></span>
          <span className="badge bg-secondary ms-2">{filtered.length} total</span>
          {isSaving && <span className="badge bg-primary ms-2">Saving...</span>}
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {/* <ExportImport onExport={handleExport} onImport={handleImport} /> */}
          <Button variant="primary" size="sm" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i> Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Row className="g-2 mb-4 align-items-center">
        <Col xs={11} md={6} lg={4} className="mx-auto">
          <InputGroup>
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </InputGroup>
        </Col>
        <Col xs={11} md={5} lg={6} className="mx-auto">
          <Select
            options={categoryOptions}
            value={selectedFilterCategory}
            onChange={(selected) => { setFilterCategory(selected?.value || ''); setCurrentPage(1); }}
            placeholder="All Categories"
            isClearable
            {...portalSelectProps}
            styles={reactSelectStyles}
          />
        </Col>
      </Row>

      {/* Product Grid */}
      <div className="product-grid-wrapper">
        <div ref={gridContainerRef} className="product-grid-container">
          <div className="product-grid">
            {filtered.length > 0 ? (
              <Row className="g-3">
                {filtered.map((product) => {
                  const displayPrice = Number(product.amount) > 0 ? Number(product.amount) : Number(product.price) || 0;
                  return (
                    <Col xs={11} sm={6} md={4} lg={6} key={product.rowid} className="mx-auto"> 
                      <Card className="h-60 product-card shadow-sm border-0 overflow-hidden">
                        <div className="d-flex flex-row ">
                          {/* LEFT: Image */}
                          <div
                            className="position-relative flex-shrink-0"
                            style={{ width: '140px', minHeight: '200px', background: '#f0edf5' }}
                          >
                            {/* <Card.Img
                              variant="top"
                              src={product.image || FALLBACK_IMAGE}
                              alt={product.name || 'Product'}
                              style={{
                                height: '100%',
                                width: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.3s ease',
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = FALLBACK_IMAGE;
                              }}
                              loading="lazy"
                            /> */}
                            <Card.Img
                              variant="top"
                              src={product.image || FALLBACK_IMAGE}
                              alt={product.name || "Product"}
                              style={{
                                height: "100%",
                                width: "100%",
                                objectFit: "cover",
                                cursor: "pointer",
                                transition: "transform 0.3s ease",
                              }}
                              onClick={() => {
                                setSelectedImage(product.image || FALLBACK_IMAGE);
                                setShowImageModal(true);
                              }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = FALLBACK_IMAGE;
                              }}
                              loading="lazy"
                            />
                            {product.discount_percent > 0 && (
                              <Badge
                                className="discount-badge"
                                style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '0.65rem' }}
                              >
                                {product.discount_percent}% OFF
                              </Badge>
                            )}
                          </div>

                          {/* RIGHT: Content + Buttons */}
                          <Card.Body className="d-flex flex-column flex-grow-1 p-2">
                            <Card.Title
                              className="fs-6 fw-bold text-truncate "
                              title={product.name}
                            >
                              {product.name || 'Untitled'}
                            </Card.Title>
                            <span className="category-badge small">
                              {product.category || 'Others'}
                            </span>
                            <span className="d-flex small  gap-2 content-text">
                            {product.contents ? `${product.contents}` : ''}
                               <span className="text-decoration-line-through fw-bold text-muted">
                              {product.price ? `₹${formatINR(product.price)}` : ''}
                            </span>
                            </span>
                            <div className="mt-auto pt-2">
                              <div className="d-flex justify-content-between align-items-center gap-2">
                                <strong className="fs-5">₹{formatINR(displayPrice)}</strong>
                                <Badge
                                  bg={product.status === 'in_stock' ? 'success' : 'danger'}
                                  pill
                                >
                                  {product.status === 'in_stock' ? 'In Stock' : 'No Stock'}
                                </Badge>
                              </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="d-flex gap-2 mt-3">
                              <Button
                                variant="primary"
                                size="sm"
                                className="flex-fill"
                                onClick={() => openEditModal(product)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil-square" aria-hidden="true"></i>
                              </Button>
                              <Button
                                variant={product.status === 'in_stock' ? 'success' : 'danger'}
                                size="sm"
                                className="flex-fill stock-toggle"
                                onClick={() => handleToggleStatus(product.rowid)}
                                title="Toggle stock"
                              >
                                <i className={`bi ${product.status === 'in_stock' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} aria-hidden="true"></i>
                                <span className="ms-1 small d-none d-sm-inline">
                                  {product.status === 'in_stock' ? 'In' : 'Out'}
                                </span>
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="flex-fill"
                                onClick={() => handleDelete(product.rowid)}
                                disabled={deleting}
                                title="Delete"
                              >
                                <i className="bi bi-trash" aria-hidden="true"></i>
                              </Button>
                            </div>
                          </Card.Body>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 mb-3" aria-hidden="true"></i>
                <p className="mb-3">No products found</p>
                <Button variant="primary" onClick={openAddModal}>Add First Product</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Footer */}
      {/* <Row className="g-2 mt-3 align-items-center">
        <Col xs={12} md={4} lg={3} className="d-flex align-items-center gap-2">
          <span className="text-muted small">Show</span>
          <Form.Select
            size="sm"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            className="entries-select"
            style={{ width: '90px', flexShrink: 0 }}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={12} md={12} lg={2} className="text-lg-end text-md-center text-start">
          <small className="text-muted">Page {currentPage} of {totalPages}</small>
        </Col>
      </Row> */}

      {/* Pagination Controls */}
      {/* {totalPages > 1 && paginated.length > 0 && (
        <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 mt-4">
          <span className="text-muted small">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <Pagination className="mb-0 justify-content-center">
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            />
            {(() => {
              const pages = [];
              const maxVisible = 7;
              let start = Math.max(1, currentPage - 3);
              let end = Math.min(totalPages, currentPage + 3);
              if (end - start < maxVisible - 1) {
                if (currentPage < totalPages / 2) {
                  end = Math.min(totalPages, start + maxVisible - 1);
                } else {
                  start = Math.max(1, end - maxVisible + 1);
                }
              }
              if (start > 1) {
                pages.push(<Pagination.Item key={1} onClick={() => setCurrentPage(1)}>1</Pagination.Item>);
                if (start > 2) pages.push(<Pagination.Ellipsis key="ellipsis-start" />);
              }
              for (let page = start; page <= end; page++) {
                pages.push(
                  <Pagination.Item key={page} active={page === currentPage} onClick={() => setCurrentPage(page)}>
                    {page}
                  </Pagination.Item>
                );
              }
              if (end < totalPages) {
                if (end < totalPages - 1) pages.push(<Pagination.Ellipsis key="ellipsis-end" />);
                pages.push(
                  <Pagination.Item key={totalPages} onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                  </Pagination.Item>
                );
              }
              return pages;
            })()}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            />
          </Pagination>
        </div>
      )} */}


 <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        centered
        className="image-modal"
        backdrop="static"
        keyboard={true}
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Product Image</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex justify-content-center align-items-center p-3">
          <img
            src={selectedImage}
            alt="Product preview"
            style={{
              width: '50%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
          />
        </Modal.Body>
      </Modal>


      {/* Back to Top */}
      {showBackToTop && (
        <Button
          variant="warning"
          className="back-to-top-3d"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <i className="bi bi-arrow-up"></i>
        </Button>
      )}

      {/* Product Modal */}
      <ProductModal
        show={showProductModal}
        onHide={closeProductModal}
        onSave={editingProduct ? handleUpdate : handleAdd}
        product={editingProduct}
        categories={categories}
        isSaving={isSaving}
      />

      {/* Alert Modal */}
      <AlertModal
        show={alert.show}
        onHide={() => setAlert((prev) => ({ ...prev, show: false }))}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        confirmText={alert.confirmText}
        onConfirm={alert.onConfirm}
        showCancel={alert.showCancel}
        cancelText={alert.cancelText}
        onCancel={alert.onCancel}
      />
    </>
  );
}