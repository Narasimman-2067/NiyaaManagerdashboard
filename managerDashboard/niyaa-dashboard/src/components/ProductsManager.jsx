import React, { useState, useMemo, useCallback, memo } from 'react';
import { Row, Col, Form, Button, Pagination, InputGroup, Badge, Card } from 'react-bootstrap';
import ProductModal from './ProductModal';
import { formatINR } from '../utils/utils';

const ProductsManager = memo(({
  products = [],
  categories = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleStatus,
  onExport,
  onImport,
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const filtered = useMemo(() => {
    let list = products;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    if (filterCategory) list = list.filter(p => p.category === filterCategory);
    return list;
  }, [products, search, filterCategory]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const handleAdd = () => { setEditingProduct(null); setShowModal(true); };
  const handleEdit = (product) => { setEditingProduct(product); setShowModal(true); };

  const handleSave = (productData) => {
    if (editingProduct) onUpdate(editingProduct.id, productData);
    else onAdd(productData);
    setShowModal(false);
    setEditingProduct(null);
  };

  return (
    <>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-box fs-4 text-lavender"></i>
          <h4 className="mb-0 fw-semibold">Products</h4>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-primary" size="sm" onClick={onExport} className="btn-3d">
            <i className="bi bi-download me-1"></i>Export
          </Button>
          <Button variant="outline-success" size="sm" onClick={onImport} className="btn-3d">
            <i className="bi bi-upload me-1"></i>Import
          </Button>
          <Button variant="primary" size="sm" onClick={handleAdd} className="btn-3d">
            <i className="bi bi-plus-lg me-1"></i>Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Row className="g-2 mb-4">
        <Col xs={12} md={6} lg={5}>
          <InputGroup>
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </InputGroup>
        </Col>
        <Col xs={12} md={6} lg={4}>
          <Form.Select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Form.Select>
        </Col>
        <Col xs={12} lg={3} className="text-lg-end d-flex align-items-center">
          <small className="text-muted">{filtered.length} products</small>
        </Col>
      </Row>

      {/* Product Grid */}
      <Row className="g-3">
        {paginated.map((p) => (
          <Col xs={12} sm={6} lg={4} xl={3} key={p.id}>
            <Card className="h-100 product-card shadow-sm border-0 overflow-hidden">
              <div className="position-relative">
                <Card.Img
                  variant="top"
                  src={p.image || 'https://placehold.co/300x200/e9e4f0/6C5CE7?text=No+Image'}
                  style={{ height: '190px', objectFit: 'cover' }}
                  onError={(e) => e.target.src = 'https://placehold.co/300x200/e9e4f0/6C5CE7?text=No+Image'}
                  loading="lazy"
                />
                {p.discount_percent > 0 && (
                  <Badge className="discount-badge">
                    {p.discount_percent}% OFF
                  </Badge>
                )}
              </div>

              <Card.Body className="d-flex flex-column">
                <Card.Title className="fs-6 fw-bold text-truncate mb-1" title={p.name}>
                  {p.name}
                </Card.Title>

                {/* Offer Style Category */}
                <div className="category-offer">
                  {p.category || 'Others'}
                </div>

                <div className="mt-auto pt-2">
                  <div className="d-flex justify-content-between align-items-end">
                    <strong className="fs-5">₹{formatINR(p.amount || p.price)}</strong>
                    <Badge bg={p.status === 'in_stock' ? 'success' : 'danger'} pill>
                      {p.status === 'in_stock' ? 'In Stock' : 'No Stock'}
                    </Badge>
                  </div>
                </div>
              </Card.Body>

              <Card.Footer className="bg-transparent border-0 pt-0 pb-3">
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="flex-fill btn-3d"
                    onClick={() => handleEdit(p)}
                  >
                    <i className="bi bi-pencil-square"></i>
                  </Button>

                  <Button
                    variant={p.status === 'in_stock' ? "outline-success" : "outline-danger"}
                    size="sm"
                    className="flex-fill btn-3d stock-toggle"
                    onClick={() => onToggleStatus(p.id)}
                    title={p.status === 'in_stock' ? "Mark as Out of Stock" : "Mark as In Stock"}
                  >
                    <i className={`bi ${p.status === 'in_stock' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                    <span className="ms-1 small">
                      {p.status === 'in_stock' ? 'In' : 'Out'}
                    </span>
                  </Button>

                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="flex-fill btn-3d"
                    onClick={() => onDelete(p.id)}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {paginated.length === 0 && (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1 mb-3"></i>
          <p>No products found</p>
          <Button variant="primary" onClick={handleAdd}>Add First Product</Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="justify-content-center mt-4">
          <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} />
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page = currentPage > 4 ? currentPage - 3 + i : i + 1;
            if (page > totalPages) return null;
            return (
              <Pagination.Item
                key={page}
                active={page === currentPage}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Pagination.Item>
            );
          })}
          <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} />
        </Pagination>
      )}

      <ProductModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditingProduct(null); }}
        onSave={handleSave}
        product={editingProduct}
        categories={categories}
      />
    </>
  );
});

export default ProductsManager;