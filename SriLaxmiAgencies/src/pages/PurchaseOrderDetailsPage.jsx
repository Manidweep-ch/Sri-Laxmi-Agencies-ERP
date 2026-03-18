import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getPurchaseOrderById, updatePurchaseOrderStatus } from "../services/purchaseService";
import { getPOItems } from "../services/purchaseItemService";

function PurchaseOrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const [orderData, itemsData] = await Promise.all([
        getPurchaseOrderById(id),
        getPOItems(id)
      ]);
      setOrder(orderData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading order details:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setStatusLoading(true);
      await updatePurchaseOrderStatus(id, newStatus);
      setOrder(prev => ({...prev, status: newStatus}));
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.expectedPrice), 0).toFixed(2);
  };

  if (loading) return <MainLayout><div>Loading...</div></MainLayout>;
  if (!order) return <MainLayout><div>Order not found</div></MainLayout>;

  return (
    <MainLayout>
      <h2>Purchase Order Details</h2>

      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}

      <div style={{marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}}>
        <h3>Order Information</h3>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
          <div><strong>PO Number:</strong> {order.poNumber || `PO-${order.id}`}</div>
          <div><strong>Supplier:</strong> {order.supplier?.name}</div>
          <div><strong>Order Date:</strong> {order.orderDate}</div>
          <div>
            <strong>Status:</strong> 
            <span style={{
              marginLeft: '10px',
              color: order.status === 'Completed' ? 'green' : 
                     order.status === 'Cancelled' ? 'red' : 
                     order.status === 'Sent' ? 'blue' : 'orange'
            }}>
              {order.status || 'Draft'}
            </span>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '20px'}}>
        <h3>Status Management</h3>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          {['Draft', 'Sent', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusUpdate(status)}
              disabled={statusLoading || order.status === status}
              style={{
                backgroundColor: order.status === status ? '#007bff' : '#f8f9fa',
                color: order.status === status ? 'white' : 'black',
                border: '1px solid #ddd',
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: order.status === status ? 'default' : 'pointer'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div style={{marginBottom: '20px'}}>
        <h3>Order Items</h3>
        <div style={{marginBottom: '10px'}}>
          <Link to={`/purchase-order/${id}/items`}>
            <button style={{backgroundColor: '#28a745', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '3px'}}>
              Manage Items
            </button>
          </Link>
        </div>
        
        <table border="1" width="100%">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Expected Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{item.product?.name}</td>
                <td>{item.quantity}</td>
                <td>${item.expectedPrice}</td>
                <td>${(item.quantity * item.expectedPrice).toFixed(2)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="4" style={{textAlign: 'center', fontStyle: 'italic'}}>
                  No items added to this purchase order yet
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{backgroundColor: '#f8f9fa', fontWeight: 'bold'}}>
              <td colSpan="3" style={{textAlign: 'right'}}>Total Amount:</td>
              <td>${calculateTotal()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{marginTop: '20px'}}>
        <Link to="/purchase">
          <button style={{backgroundColor: '#6c757d', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '3px'}}>
            Back to Purchase Orders
          </button>
        </Link>
      </div>
    </MainLayout>
  );
}

export default PurchaseOrderDetailsPage;