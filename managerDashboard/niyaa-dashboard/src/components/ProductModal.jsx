import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toBase64 } from '../utils/utils';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Default empty form state used for "Add Product" mode.
 * Keeping this in one place avoids repeated object duplication and makes reset
 * logic easier to maintain.
 */
const EMPTY_FORM = {
  name: '',
  category: '',
  amount: '',
  price: '',
  image: '',
  contents: '',
  discount_percent: '',
  status: 'in_stock',
};

/**
 * Maximum upload size for product image (in bytes).
 * Adjust if you want to allow larger images.
 */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Safely converts an incoming product object into the modal form shape.
 * This prevents undefined/null values from leaking into controlled inputs.
 */
function buildFormFromProduct(product) {
  if (!product || typeof product !== 'object') {
    return { ...EMPTY_FORM };
  }

  return {
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

/**
 * Normalizes number-like input values.
 * Returns 0 for invalid / empty values.
 */
function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const ProductModal = memo(function ProductModal({
  show,
  onHide,
  onSave,
  product,
  categories = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const fileInputRef = useRef(null);

  /**
   * When the modal opens or the product changes:
   * - load edit values for existing product
   * - reset to empty form for add mode
   */
  useEffect(() => {
    const nextForm = buildFormFromProduct(product);
    setForm(nextForm);
    setImagePreview(nextForm.image || '');
    setNewCategory('');
    setIsSubmitting(false);

    // Clear the file input so the same image can be re-selected if needed.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [product, show]);

  /**
   * Generic controlled input handler.
   */
  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  /**
   * Handles image upload and converts the image to base64 for storage.
   * Includes basic validation for type + size to reduce bad uploads.
   */
  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      window.alert('Please select a valid image file.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      window.alert('Image size must be less than 2 MB.');
      event.target.value = '';
      return;
    }

    try {
      const base64 = await toBase64(file);
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, image: base64 }));
    } catch (error) {
      console.error('[ProductModal] Failed to process image:', error);
      window.alert('Failed to process image. Please try another file.');
    } finally {
      // Allow selecting the same file again if needed.
      event.target.value = '';
    }
  }, []);

  /**
   * Removes the current image from the form.
   */
  const handleRemoveImage = useCallback(() => {
    setImagePreview('');
    setForm((prev) => ({ ...prev, image: '' }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Handles form submit for both add/edit product flows.
   * Supports async onSave handlers from the parent component.
   */
  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isSubmitting) return;

      const name = form.name.trim();
      const category = (newCategory.trim() || form.category || '').trim();

      if (!name) {
        window.alert('Product name is required.');
        return;
      }

      if (!category) {
        window.alert('Please select or enter a category.');
        return;
      }

      setIsSubmitting(true);

      try {
        /**
         * Keep both amount and price available because the rest of the app
         * currently uses both keys in different places.
         *
         * If your business logic only needs one of them later, we can simplify
         * this structure globally.
         */
        const priceValue = toNumber(form.price || form.amount);
        const amountValue = toNumber(form.amount || form.price);

        const payload = {
          ...form,
          name,
          category,
          amount: amountValue,
          price: priceValue,
          discount_percent: Math.max(0, Math.min(100, toNumber(form.discount_percent))),
          contents: form.contents?.trim?.() || '',
          image: form.image || '',
          status: form.status === 'no_stock' ? 'no_stock' : 'in_stock',
        };

        if (typeof onSave === 'function') {
          await onSave(payload);
        }

        setNewCategory('');
      } catch (error) {
        console.error('[ProductModal] Save failed:', error);
        window.alert('Failed to save product. Please try again.');
        setIsSubmitting(false);
      }
    },
    [form, newCategory, onSave, isSubmitting]
  );

  return (
    <Modal
      show={show}
      onHide={isSubmitting ? undefined : onHide}
      centered
      size="lg"
      scrollable
      contentClassName="rounded-4 shadow-lg"
    >
      <Modal.Header closeButton={!isSubmitting} className="border-0 pb-0">
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
            {/* Left column */}
            <div className="col-12 col-md-7">
              {/* Product name */}
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
                  required
                  disabled={isSubmitting}
                  className="form-control form-control-lg rounded-3 shadow-sm"
                  placeholder="Product name"
                />
              </div>

              {/* Category selection + new category input */}
              <div className="mb-3">
                <label htmlFor="productCategory" className="form-label fw-semibold">
                  Category <span className="text-danger">*</span>
                </label>

                <div className="d-flex flex-wrap gap-2">
                  <select
                    id="productCategory"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="form-select form-select-lg rounded-3 shadow-sm flex-grow-1"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="New Category"
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    disabled={isSubmitting}
                    className="form-control form-control-lg rounded-3 shadow-sm"
                    style={{ width: '180px', minWidth: '140px' }}
                  />
                </div>
              </div>

              {/* Price + Discount */}
              <div className="row g-2">
                <div className="col-6">
                  <label htmlFor="productPrice" className="form-label fw-semibold">
                    Price (₹)
                  </label>
                  <input
                    id="productPrice"
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    disabled={isSubmitting}
                    className="form-control form-control-lg rounded-3 shadow-sm"
                  />
                </div>

                <div className="col-6">
                  <label htmlFor="productDiscount" className="form-label fw-semibold">
                    Discount %
                  </label>
                  <input
                    id="productDiscount"
                    type="number"
                    name="discount_percent"
                    value={form.discount_percent}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    disabled={isSubmitting}
                    className="form-control form-control-lg rounded-3 shadow-sm"
                  />
                </div>
              </div>

              {/* Contents */}
              <div className="mb-3 mt-3">
                <label htmlFor="productContents" className="form-label fw-semibold">
                  Contents
                </label>
                <input
                  id="productContents"
                  type="text"
                  name="contents"
                  value={form.contents}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="form-control form-control-lg rounded-3 shadow-sm"
                  placeholder="e.g. 50 pcs, 12 rockets"
                />
              </div>
            </div>

            {/* Right column */}
            <div className="col-12 col-md-5">
              {/* Status */}
              <div className="mb-3">
                <label htmlFor="productStatus" className="form-label fw-semibold">
                  Status
                </label>
                <select
                  id="productStatus"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="form-select form-select-lg rounded-3 shadow-sm"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="no_stock">No Stock</option>
                </select>
              </div>

              {/* Image upload */}
              <div>
                <label htmlFor="productImage" className="form-label fw-semibold">
                  Product Image
                </label>
                <input
                  id="productImage"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  className="form-control form-control-lg rounded-3 shadow-sm"
                />

                {imagePreview && (
                  <div className="mt-3 text-center">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="img-fluid rounded-3 border shadow-sm"
                      style={{ maxHeight: '220px', objectFit: 'contain' }}
                    />

                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      className="mt-2 rounded-3"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="d-flex justify-content-end gap-3 mt-4 pt-3 border-top">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onHide}
              disabled={isSubmitting}
              className="rounded-3 px-4"
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              className="rounded-3 px-4"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Saving...
                </>
              ) : product ? (
                'Update Product'
              ) : (
                'Add Product'
              )}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  );
});

export default ProductModal;