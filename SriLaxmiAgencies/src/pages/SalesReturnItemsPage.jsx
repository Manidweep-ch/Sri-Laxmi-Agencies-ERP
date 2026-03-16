import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getSalesReturnItems, createSalesReturnItem } from "../services/salesReturnItemService";
import { getInvoiceItems } from "../services/invoiceItemService";

function SalesReturnItemsPage() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
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
      const data = await getSalesReturnItems(id);
      setItems(data);
    } catch (error) {
      console.error('Error loading return items:', error);
      setError('Failed to load return items');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceItems = async () => {
    try {
      // For now, we'll use a placeholder since we need the invoice ID
      // In a real implementation, you'd get the invoice ID from the sales return
      setInvoiceItems([]);
    } catch (error) {
      console.error('Error loading invoice items:', error);
    }
  };

  useEffect(() => {
    loadItems();
    loadInvoiceItems();
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
      
      const totalAmount = parseFloat(form.quantity) * parseFloat(form.unitPrice);
      
      const payload = {
        salesReturn: { id: id },
        product: { id: form.productId },
        quantity: parseInt(form.quantity),
        unitPrice: parseFloat(form.unitPrice),
        totalAmount: totalAmount
      };

      await createSalesReturnItem(payload);
      
      setForm({
        productId: "",
        quantity: "",
        unitPrice: ""
      });

      loadItems();
    } catch (error) {
      console.error('Error adding return item:', error);
      setError('Failed to add return item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <h2>Sales Return Items - Return #{id}</h2>

      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      {loading && <div style={{color: 'blue', marginBottom: '10px'}}>Loading...</div>}

      <div style={{marginBottom: "20px"}}>
        <h3>Add Item to Return</h3>
        
        <input
          name="productId"
          type="number"
          placeholder="Product ID"
          value={form.productId}
          onChange={handleChange}
          style={{marginRight: '10px'}}
        />

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
        <h3>Return Items</h3>
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Amount</th>
            </tr>
          </thead>

          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.product?.name}</td>
                <td>{item.quantity}</td>
                <td>${item.unitPrice}</td>
                <td>${item.totalAmount}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', fontStyle: 'italic'}}>
                  No items added to this return yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{marginTop: '20px'}}>
        <p><strong>Note:</strong> Adding items to sales return will restore stock automatically.</p>
      </div>
    </MainLayout>
  );
}

export default SalesReturnItemsPage;