import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getInvoiceItems, createInvoiceItem } from "../services/invoiceItemService";
import { getProducts } from "../services/productService";

function InvoiceItemsPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    unitPrice: ""
  });

  const loadItems = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getInvoiceItems(id);
      setItems(data);
    } catch (error) {
      console.error('Error loading invoice items:', error);
      setError('Failed to load invoice items');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    }
  };

  useEffect(() => {
    loadItems();
    loadProducts();
  }, [id]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    if (!form.productId || !form.quantity || !form.unitPrice) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const totalPrice = parseFloat(form.quantity) * parseFloat(form.unitPrice);
      
      const payload = {
        invoice: { id: id },
        product: { id: form.productId },
        quantity: parseInt(form.quantity),
        unitPrice: parseFloat(form.unitPrice),
        totalPrice: totalPrice
      };

      await createInvoiceItem(payload);
      
      setForm({
        productId: "",
        quantity: "",
        unitPrice: ""
      });

      loadItems();
    } catch (error) {
      console.error('Error adding invoice item:', error);
      setError('Failed to add invoice item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <h2>Invoice Items - Invoice #{id}</h2>

      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      {loading && <div style={{color: 'blue', marginBottom: '10px'}}>Loading...</div>}

      <div style={{marginBottom: "20px"}}>
        <h3>Add Item to Invoice</h3>
        
        <select
          name="productId"
          value={form.productId}
          onChange={handleChange}
          style={{marginRight: '10px'}}
        >
          <option value="">Select Product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          name="quantity"
          type="number"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          style={{marginRight: '10px'}}
        />

        <input
          name="unitPrice"
          type="number"
          step="0.01"
          placeholder="Unit Price"
          value={form.unitPrice}
          onChange={handleChange}
          style={{marginRight: '10px'}}
        />

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Adding...' : 'Add Item'}
        </button>
      </div>

      <div>
        <h3>Invoice Items</h3>
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Price</th>
            </tr>
          </thead>

          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.product?.name}</td>
                <td>{item.quantity}</td>
                <td>₹{item.unitPrice}</td>
                <td>₹{item.totalPrice}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="4" style={{textAlign: 'center', fontStyle: 'italic'}}>
                  No items added to this invoice yet
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{backgroundColor: '#f8f9fa', fontWeight: 'bold'}}>
              <td colSpan="3" style={{textAlign: 'right'}}>Total:</td>
              <td>
                ₹{items.reduce((total, item) => total + item.totalPrice, 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{marginTop: '20px'}}>
        <p><strong>Note:</strong> Adding items to invoice will consume stock automatically.</p>
      </div>
    </MainLayout>
  );
}

export default InvoiceItemsPage;