import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { addStock, getProductStock, consumeStock } from "../services/stockService";
import { getProducts } from "../services/productService";

function StockManagementPage() {

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [stockBatches, setStockBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    purchasePrice: ""
  });

  const [consumeQty, setConsumeQty] = useState("");

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    }
  };

  const loadProductStock = async (productId) => {
    if (!productId) {
      setStockBatches([]);
      return;
    }
    
    try {
      setLoading(true);
      const data = await getProductStock(productId);
      setStockBatches(data);
    } catch (error) {
      console.error('Error loading stock:', error);
      setError('Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleProductSelect = (productId) => {
    setSelectedProduct(productId);
    setForm({...form, productId});
    loadProductStock(productId);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    if (!form.productId || !form.quantity || !form.purchasePrice) {
      setError('All fields are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const payload = {
        productId: form.productId,
        quantity: parseInt(form.quantity),
        purchasePrice: parseFloat(form.purchasePrice)
      };

      await addStock(payload);
      
      setForm({
        productId: form.productId, // Keep same product selected
        quantity: "",
        purchasePrice: ""
      });

      // Reload stock for selected product
      loadProductStock(form.productId);
    } catch (error) {
      console.error('Error adding stock:', error);
      setError('Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const handleConsume = async () => {
    if (!selectedProduct || !consumeQty) {
      setError('Product and Quantity are required for reduction');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const payload = {
        productId: selectedProduct,
        quantity: parseInt(consumeQty)
      };

      await consumeStock(payload);
      
      setConsumeQty("");

      // Reload stock for selected product
      loadProductStock(selectedProduct);
    } catch (error) {
      console.error('Error reducing stock:', error);
      setError(error.response?.data?.message || 'Failed to reduce stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <h2>Stock Management</h2>

      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      {loading && <div style={{color: 'blue', marginBottom: '10px'}}>Loading...</div>}

      <div style={{marginBottom: "20px"}}>
        <h3>Select Product to Manage Stock</h3>
        
        <select
          value={selectedProduct}
          onChange={(e) => handleProductSelect(e.target.value)}
          style={{marginBottom: '10px', width: '200px'}}
        >
          <option value="">Select Product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <div style={{marginBottom: "20px"}}>
          <h3>Add Stock Manually</h3>
          
          <input
            name="quantity"
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={handleChange}
            style={{marginRight: '10px'}}
          />

          <input
            name="purchasePrice"
            type="number"
            step="0.01"
            placeholder="Purchase Price"
            value={form.purchasePrice}
            onChange={handleChange}
            style={{marginRight: '10px'}}
          />

          <button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adding...' : 'Add Stock'}
          </button>
        </div>
      )}

      {selectedProduct && (
        <div style={{marginBottom: "20px", padding: "10px", border: "1px solid #ffcccc", borderRadius: "5px"}}>
          <h3>Manual Stock Reduction (Adjustment)</h3>
          <p style={{fontSize: "0.9em", color: "#666"}}>Use this to manually reduce stock for damages or corrections.</p>
          
          <input
            type="number"
            placeholder="Quantity to reduce"
            value={consumeQty}
            onChange={(e) => setConsumeQty(e.target.value)}
            style={{marginRight: '10px'}}
          />

          <button onClick={handleConsume} disabled={loading} style={{backgroundColor: "#ff4d4d", color: "white", border: "none", padding: "5px 10px", cursor: "pointer"}}>
            {loading ? 'Reducing...' : 'Reduce Stock'}
          </button>
        </div>
      )}

      {selectedProduct && (
        <div>
          <h3>Stock Batches for Selected Product</h3>
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Quantity</th>
                <th>Purchase Price</th>
                <th>Total Value</th>
                <th>Received Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {stockBatches.map(batch => (
                <tr key={batch.id}>
                  <td>{batch.id}</td>
                  <td>{batch.quantity}</td>
                  <td>${batch.purchasePrice}</td>
                  <td>${(batch.quantity * batch.purchasePrice).toFixed(2)}</td>
                  <td>{batch.receivedDate}</td>
                  <td style={{color: batch.active ? 'green' : 'red'}}>
                    {batch.active ? 'Active' : 'Inactive'}
                  </td>
                </tr>
              ))}
              {stockBatches.length === 0 && (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', fontStyle: 'italic'}}>
                    No stock batches found for this product
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{marginTop: '20px', backgroundColor: '#f8f9fa', padding: '10px', border: '1px solid #dee2e6'}}>
        <h4>Stock Management Notes:</h4>
        <ul style={{margin: 0}}>
          <li>Stock is automatically added when GRN items are received</li>
          <li>Use this page for manual stock adjustments or opening stock</li>
          <li>Stock follows FIFO (First In, First Out) consumption pattern</li>
          <li>Inactive batches have been fully consumed</li>
        </ul>
      </div>
    </MainLayout>
  );
}

export default StockManagementPage;