import React, { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { Modal, Button } from 'react-bootstrap';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import { toBase64 } from '../utils/utils';
import { buildSelectStyles, portalSelectProps } from '../utils/selectStyles';

const EMPTY_FORM = {
  rowid: '',
  name: '',
  category: '',
  amount: '',
  price: '',
  image: '',
  contents: '',
  discount_percent: '',
  status: 'in_stock',
};

const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'no_stock', label: 'No Stock' },
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function buildFormFromProduct(product) {
  if (!product || typeof product !== 'object') return { ...EMPTY_FORM };
  return {
    rowid: product.rowid || product.id || '',
    name: product.name ?? '',
    category: product.category ?? '',
    amount: product.amount ?? '',
    price: product.price ?? '',
    image: product.image ?? '',
    contents: product.contents ?? '',
    discount_percent: product.discount_percent ?? '',
    status: product.status === 'no_stock' ? 'no_stock' : 'in_stock',
  };
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

const ProductModal = memo(function ProductModal({
  show,
  onHide,
  onSave,
  product,
  categories = [],
  isSaving = false,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState('');
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    const nextForm = buildFormFromProduct(product);
    setForm(nextForm);
    setImagePreview(nextForm.image || '');
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [product, show]);

  const categoryOptions = useMemo(() => {
    const unique = Array.isArray(categories) ? [...new Set(categories.filter(Boolean))] : [];
    return unique.map((cat) => ({ label: cat, value: cat }));
  }, [categories]);

  // ----- FIX: ensure new category is displayed even if not in options -----
  const selectedCategory = useMemo(() => {
    if (!form.category) return null;
    const found = categoryOptions.find((opt) => opt.value === form.category);
    if (found) return found;
    // If not found, create a temporary option to display the new category
    return { label: form.category, value: form.category };
  }, [categoryOptions, form.category]);

  const selectedStatus = STATUS_OPTIONS.find((opt) => opt.value === form.status) || STATUS_OPTIONS[0];

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleCategoryChange = useCallback((selected) => {
    setForm((prev) => ({ ...prev, category: selected?.value || '' }));
    setErrors((prev) => ({ ...prev, category: '' }));
  }, []);

  const handleCategoryCreate = useCallback((inputValue) => {
    // Set the new category immediately
    setForm((prev) => ({ ...prev, category: inputValue }));
    setErrors((prev) => ({ ...prev, category: '' }));
  }, []);

  const handleStatusChange = useCallback((selected) => {
    setForm((prev) => ({ ...prev, status: selected?.value || 'in_stock' }));
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      window.alert('Image must be < 2MB.');
      e.target.value = '';
      return;
    }
    try {
      const base64 = await toBase64(file);
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, image: base64 }));
    } catch (err) {
      console.error(err);
      window.alert('Failed to process image.');
    } finally {
      e.target.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImagePreview('');
    setForm((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Product name is required.';
    if (!form.category.trim()) newErrors.category = 'Category is required.';
    const amount = toNumber(form.amount);
    if (amount < 0) newErrors.amount = 'Price must be a positive number.';
    const discount = toNumber(form.discount_percent);
    if (discount < 0 || discount > 100) newErrors.discount = 'Discount must be between 0 and 100.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isSaving) return;
      if (!validateForm()) return;

      const payload = {
        ...(form.rowid ? { rowid: form.rowid } : {}),
        name: form.name.trim(),
        category: form.category.trim(),
        amount: toNumber(form.amount),
        price: toNumber(form.price || form.amount),
        discount_percent: Math.max(0, Math.min(100, toNumber(form.discount_percent))),
        contents: form.contents?.trim?.() || '',
        image: form.image || '',
        status: form.status === 'no_stock' ? 'no_stock' : 'in_stock',
        last_updated: new Date().toISOString(),
      };

      await onSave(payload);
    },
    [form, onSave, isSaving, validateForm]
  );

  return (
    <Modal
      show={show}
      onHide={isSaving ? undefined : onHide}
      size="lg"
      centered
      scrollable
      contentClassName="rounded-4 shadow-lg"
      className="product-modal"
    >
      <Modal.Header closeButton={!isSaving} className="border-0 pb-0">
        <Modal.Title className="d-flex align-items-center gap-2">
          <i className="bi bi-box text-lavender" aria-hidden="true"></i>
          {product ? 'Edit Product' : 'Add New Product'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body
        className="pt-2"
        style={{ background: 'linear-gradient(135deg, #f5f0ff 0%, #e8e0f5 100%)' }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            <div className="col-12 col-md-7">
              {/* Name */}
              <div className="mb-3">
                <label htmlFor="productName" className="form-label fw-semibold">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  id="productName"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isSaving}
                  className={`form-control form-control-lg rounded-3 shadow-sm ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="Product name"
                />
                {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
              </div>

              {/* Category */}
              <div className="mb-3">
                <label htmlFor="productCategory" className="form-label fw-semibold">
                  Category <span className="text-danger">*</span>
                </label>
                <CreatableSelect
                  inputId="productCategory"
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  onCreateOption={handleCategoryCreate}
                  placeholder="Select or create category"
                  isDisabled={isSaving}
                  isClearable
                  {...portalSelectProps}
                  styles={buildSelectStyles(!!errors.category)}
                />
                {errors.category && <div className="text-danger small mt-1">{errors.category}</div>}
              </div>

              {/* Price & Discount */}
              <div className="row g-2">
                <div className="col-6">
                  <label htmlFor="productAmount" className="form-label fw-semibold">
                    Price (₹) <small className="text-muted">(after discount)</small>
                  </label>
                  <input
                    id="productAmount"
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    disabled={isSaving}
                    className={`form-control form-control-lg rounded-3 shadow-sm ${errors.amount ? 'is-invalid' : ''}`}
                  />
                  {errors.amount && <div className="invalid-feedback d-block">{errors.amount}</div>}
                </div>
                <div className="col-6">
                  <label htmlFor="productDiscount" className="form-label fw-semibold">Discount %</label>
                  <input
                    id="productDiscount"
                    type="number"
                    name="discount_percent"
                    value={form.discount_percent}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    disabled={isSaving}
                    className={`form-control form-control-lg rounded-3 shadow-sm ${errors.discount ? 'is-invalid' : ''}`}
                  />
                  {errors.discount && <div className="invalid-feedback d-block">{errors.discount}</div>}
                </div>
              </div>

              {/* Contents */}
              <div className="mb-3 mt-3">
                <label htmlFor="productContents" className="form-label fw-semibold">Contents</label>
                <input
                  id="productContents"
                  type="text"
                  name="contents"
                  value={form.contents}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="form-control form-control-lg rounded-3 shadow-sm"
                  placeholder="e.g. 50 pcs, 12 rockets"
                />
              </div>
            </div>

            <div className="col-12 col-md-5">
              {/* Status */}
              <div className="mb-3">
                <label htmlFor="productStatus" className="form-label fw-semibold">Status</label>
                <Select
                  inputId="productStatus"
                  options={STATUS_OPTIONS}
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  isDisabled={isSaving}
                  isSearchable={false}
                  {...portalSelectProps}
                  styles={buildSelectStyles()}
                />
              </div>

              {/* Image */}
              <div>
                <label htmlFor="productImage" className="form-label fw-semibold">Product Image</label>
                <input
                  id="productImage"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isSaving}
                  className="form-control form-control-lg rounded-3 shadow-sm"
                />
                {imagePreview && (
                  <div className="mt-3 text-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="img-fluid rounded-3 border shadow-sm"
                      style={{ maxHeight: '220px', objectFit: 'contain' }}
                    />
                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      className="mt-2 rounded-3"
                      onClick={handleRemoveImage}
                      disabled={isSaving}
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
            <Button type="button" variant="secondary" size="lg" onClick={onHide} disabled={isSaving} className="rounded-3 px-4">
              Cancel
            </Button>
            <Button variant="primary" size="lg" type="submit" disabled={isSaving} className="rounded-3 px-4">
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Saving...
                </>
              ) : product ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
});

export default ProductModal;