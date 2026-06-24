import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  Row,
  Col,
  Form,
  Button,
  Pagination,
  InputGroup,
  Badge,
  Card,
} from 'react-bootstrap';
import ProductModal from './ProductModal';
import ExportImport from './ExportImport';
import { formatINR } from '../utils/utils';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 12;
const FALLBACK_IMAGE =
  'https://via.placeholder.com/400x300/f0edf5/6C5CE7?text=No+Image';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Returns a safe normalized product list so rendering never breaks even if
 * imported / fetched data is slightly malformed.
 */
function normalizeProducts(products) {
  if (!Array.isArray(products)) return [];

  return products.map((product, index) => {
    const safeProduct = product && typeof product === 'object' ? product : {};

    return {
      id: safeProduct.id ?? `product-${index}`,
      name: safeProduct.name ?? '',
      category: safeProduct.category ?? '',
      amount: safeProduct.amount ?? safeProduct.price ?? 0,
      price: safeProduct.price ?? safeProduct.amount ?? 0,
      image: safeProduct.image ?? '',
      contents: safeProduct.contents ?? '',
      discount_percent: Number(safeProduct.discount_percent) || 0,
      status: safeProduct.status === 'no_stock' ? 'no_stock' : 'in_stock',
    };
  });
}

/**
 * Safe text formatter for search/filter matching.
 */
function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const ProductsManager = memo(function ProductsManager({
  products = [],
  categories = [],
  onAdd,
  onUpdate,
  onDelete,
  onToggleStatus,
  onExport,
  onImport,
}) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  /**
   * Normalize incoming props to keep rendering stable.
   */
  const safeProducts = useMemo(() => normalizeProducts(products), [products]);
  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter(Boolean) : []),
    [categories]
  );

  /**
   * Filter products by search query + selected category.
   */
  const filtered = useMemo(() => {
    const query = normalizeText(search);

    return safeProducts.filter((product) => {
      const matchesSearch =
        !query ||
        normalizeText(product.name).includes(query) ||
        normalizeText(product.category).includes(query);

      const matchesCategory =
        !filterCategory || product.category === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [safeProducts, search, filterCategory]);

  /**
   * Total number of pages based on current filtered result.
   */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /**
   * If filters/search reduce the result set and the current page becomes invalid,
   * automatically move back to the last valid page.
   */
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /**
   * Paginated slice for the current page.
   */
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  /* ---------------------------------------------------------------------- */
  /* Modal Handlers                                                         */
  /* ---------------------------------------------------------------------- */

  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((product) => {
    setEditingProduct(product);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingProduct(null);
  }, []);

  /**
   * Save handler used by ProductModal.
   * Supports async parent handlers.
   */
  const handleSave = useCallback(
    async (productData) => {
      if (editingProduct) {
        if (typeof onUpdate === 'function') {
          await onUpdate(editingProduct.id, productData);
        }
      } else if (typeof onAdd === 'function') {
        await onAdd(productData);
      }

      closeModal();
    },
    [editingProduct, onAdd, onUpdate, closeModal]
  );

  /* ---------------------------------------------------------------------- */
  /* Product Action Handlers                                                */
  /* ---------------------------------------------------------------------- */

  const handleDelete = useCallback(
    (productId) => {
      if (typeof onDelete === 'function') {
        onDelete(productId);
      }
    },
    [onDelete]
  );

  const handleToggleStatus = useCallback(
    (productId) => {
      if (typeof onToggleStatus === 'function') {
        onToggleStatus(productId);
      }
    },
    [onToggleStatus]
  );

  /* ---------------------------------------------------------------------- */
  /* Pagination UI                                                          */
  /* ---------------------------------------------------------------------- */

  const visiblePages = useMemo(() => {
    const maxVisible = 7;
    let start = Math.max(1, currentPage - 3);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-box fs-4 text-lavender" aria-hidden="true"></i>
          <h4 className="mb-0 fw-semibold">Products</h4>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <ExportImport onExport={onExport} onImport={onImport} />

          <Button variant="primary" size="sm" onClick={openAddModal}>
            <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
            Add Product
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                            */}
      {/* ------------------------------------------------------------------ */}
      <Row className="g-2 mb-4">
       <Col xs={12} md={6} lg={5}>
  <InputGroup>
    <InputGroup.Text>
      <i className="bi bi-search"></i>
    </InputGroup.Text>

    <Form.Control
      type="search"
      placeholder="Search products..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setCurrentPage(1);
      }}
    />

    {search && (
      <Button
        variant="link"
        className="border-0 text-muted px-3"
        onClick={() => {
          setSearch('');
          setCurrentPage(1);
        }}
        aria-label="Clear search"
        style={{ textDecoration: 'none' }}
      >
        <i className="bi bi-x-circle-fill"></i>
      </Button>
    )}
  </InputGroup>
</Col>

        <Col xs={12} md={6} lg={4}>
          <Form.Select
            value={filterCategory}
            onChange={(event) => {
              setFilterCategory(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {safeCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col xs={12} lg={3} className="text-lg-end d-flex align-items-center">
          <small className="text-muted">{filtered.length} products</small>
        </Col>
      </Row>

      {/* ------------------------------------------------------------------ */}
      {/* Product Grid                                                       */}
      {/* ------------------------------------------------------------------ */}
      {paginated.length > 0 ? (
        <Row className="g-3">
          {paginated.map((product) => {
            const displayPrice =
              Number(product.amount) > 0
                ? Number(product.amount)
                : Number(product.price) || 0;

            return (
              <Col xs={6} sm={6} md={4} lg={3} key={product.id}>
                <Card className="h-100 product-card shadow-sm border-0 overflow-hidden">
                  <div
                    className="position-relative"
                    style={{ height: '190px', background: '#f0edf5' }}
                  >
                    <Card.Img
                      variant="top"
                      src={product.image || FALLBACK_IMAGE}
                      alt={product.name || 'Product image'}
                      style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                      onError={(event) => {
                        event.target.onerror = null;
                        event.target.src = FALLBACK_IMAGE;
                      }}
                      loading="lazy"
                    />

                    {product.discount_percent > 0 && (
                      <Badge
                        className="discount-badge"
                        style={{ position: 'absolute', top: '8px', right: '8px' }}
                      >
                        {product.discount_percent}% OFF
                      </Badge>
                    )}
                  </div>

                  <Card.Body className="d-flex flex-column">
                    <Card.Title
                      className="fs-6 fw-bold text-truncate mb-1"
                      title={product.name}
                    >
                      {product.name || 'Untitled Product'}
                    </Card.Title>

                    <span className="category-badge">
                      {product.category || 'Others'}
                    </span>

                    <div className="mt-auto pt-2">
                      <div className="d-flex justify-content-between align-items-end gap-2">
                        <strong className="fs-5">
                          ₹{formatINR(displayPrice)}
                        </strong>

                        <Badge
                          bg={product.status === 'in_stock' ? 'success' : 'danger'}
                          pill
                        >
                          {product.status === 'in_stock' ? 'In Stock' : 'No Stock'}
                        </Badge>
                      </div>
                    </div>
                  </Card.Body>

                  <Card.Footer className="bg-transparent border-0 pt-0 pb-3">
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-fill"
                        onClick={() => openEditModal(product)}
                        title="Edit product"
                      >
                        <i className="bi bi-pencil-square" aria-hidden="true"></i>
                      </Button>

                      <Button
                        variant={product.status === 'in_stock' ? 'success' : 'danger'}
                        size="sm"
                        className="flex-fill stock-toggle"
                        onClick={() => handleToggleStatus(product.id)}
                        title="Toggle stock status"
                      >
                        <i
                          className={`bi ${
                            product.status === 'in_stock'
                              ? 'bi-check-circle-fill'
                              : 'bi-x-circle-fill'
                          }`}
                          aria-hidden="true"
                        ></i>
                        <span className="ms-1 small d-none d-sm-inline">
                          {product.status === 'in_stock' ? 'In' : 'Out'}
                        </span>
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-fill"
                        onClick={() => handleDelete(product.id)}
                        title="Delete product"
                      >
                        <i className="bi bi-trash" aria-hidden="true"></i>
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1 mb-3" aria-hidden="true"></i>
          <p className="mb-3">No products found</p>
          <Button variant="primary" onClick={openAddModal}>
            Add First Product
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Pagination                                                         */}
      {/* ------------------------------------------------------------------ */}
      {totalPages > 1 && paginated.length > 0 && (
        <Pagination className="justify-content-center mt-4">
          <Pagination.Prev
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          />

          {visiblePages.map((page) => (
            <Pagination.Item
              key={page}
              active={page === currentPage}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Pagination.Item>
          ))}

          <Pagination.Next
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
          />
        </Pagination>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Add / Edit Product Modal                                           */}
      {/* ------------------------------------------------------------------ */}
      <ProductModal
        show={showModal}
        onHide={closeModal}
        onSave={handleSave}
        product={editingProduct}
        categories={safeCategories}
      />
    </>
  );
});

export default ProductsManager;