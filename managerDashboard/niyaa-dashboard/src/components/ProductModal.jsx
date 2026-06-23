import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { toBase64 } from '../utils/utils';

const ProductModal = memo(({ show, onHide, onSave, product, categories = [] }) => {
    const [form, setForm] = useState({
        name: '', category: '', amount: '', price: '', image: '',
        contents: '', discount_percent: '', status: 'in_stock',
    });
    const [imagePreview, setImagePreview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    // Reset form
    useEffect(() => {
        if (product) {
            setForm({
                name: product.name || '',
                category: product.category || '',
                amount: product.amount || product.price || '',
                price: product.price || product.amount || '',
                image: product.image || '',
                contents: product.contents || '',
                discount_percent: product.discount_percent || '',
                status: product.status || 'in_stock',
            });
            setImagePreview(product.image || '');
        } else {
            setForm({ name: '', category: '', amount: '', price: '', image: '', contents: '', discount_percent: '', status: 'in_stock' });
            setImagePreview('');
        }
        setNewCategory('');
        setIsSubmitting(false);
    }, [product, show]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64 = await toBase64(file);
                setImagePreview(base64);
                setForm(prev => ({ ...prev, image: base64 }));
            } catch (err) {
                alert('Failed to process image');
            }
        }
    }, []);

    const handleRemoveImage = useCallback(() => {
        setImagePreview('');
        setForm(prev => ({ ...prev, image: '' }));
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            alert('Product name is required.');
            return;
        }

        const finalCategory = newCategory.trim() || form.category;

        setIsSubmitting(true);
        const payload = {
            ...form,
            category: finalCategory,
            amount: Number(form.amount) || Number(form.price) || 0,
            price: Number(form.price) || Number(form.amount) || 0,
            discount_percent: Number(form.discount_percent) || 0,
        };

        onSave(payload);
        setNewCategory('');
    }, [form, newCategory, onSave]);

    return (
        <Modal show={show} onHide={onHide} centered size="lg" scrollable>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="bi bi-box me-2 text-lavender"></i>
                    {product ? 'Edit Product' : 'Add New Product'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Row className="g-3">
                        <Col lg={7}>
                            <Form.Group className="mb-3">
                                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Product name" />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Category</Form.Label>
                                <div className="d-flex gap-2">
                                    <Form.Select name="category" value={form.category} onChange={handleChange} className="flex-grow-1">
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </Form.Select>
                                    <Form.Control
                                        type="text"
                                        placeholder="New Category"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        style={{ width: '160px' }}
                                    />
                                </div>
                            </Form.Group>

                            <Row className="g-3">
                                <Col sm={6}>
                                    <Form.Group>
                                        <Form.Label>Price (₹)</Form.Label>
                                        <Form.Control type="number" name="price" value={form.price} onChange={handleChange} step="0.01" min="0" />
                                    </Form.Group>
                                </Col>
                                <Col sm={6}>
                                    <Form.Group>
                                        <Form.Label>Discount %</Form.Label>
                                        <Form.Control type="number" name="discount_percent" value={form.discount_percent} onChange={handleChange} min="0" max="100" />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3 mt-3">
                                <Form.Label>Contents</Form.Label>
                                <Form.Control type="text" name="contents" value={form.contents} onChange={handleChange} placeholder="e.g. 50 pcs, 12 rockets" />
                            </Form.Group>
                        </Col>

                        <Col lg={5}>
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select name="status" value={form.status} onChange={handleChange}>
                                    <option value="in_stock">In Stock</option>
                                    <option value="no_stock">No Stock</option>
                                </Form.Select>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label>Product Image</Form.Label>
                                <Form.Control type="file" accept="image/*" onChange={handleFileChange} />
                                {imagePreview && (
                                    <div className="mt-3 text-center">
                                        <img src={imagePreview} alt="Preview" className="img-fluid rounded border" style={{ maxHeight: '220px', objectFit: 'contain' }} />
                                        <Button variant="outline-danger" size="sm" className="mt-2" onClick={handleRemoveImage}>
                                            Remove Image
                                        </Button>
                                    </div>
                                )}
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
});

export default ProductModal;