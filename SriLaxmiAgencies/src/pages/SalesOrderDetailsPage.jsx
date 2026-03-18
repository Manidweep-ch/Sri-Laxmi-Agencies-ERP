import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getSalesOrderById, updateSalesOrderStatus } from "../services/salesService";
import { getSalesOrderItems } from "../services/salesItemService";

function SalesOrderDetailsPage() {
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
        getSalesOrderById(id),
        getSalesOrderItems(id)
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
      await updateSalesOrderStatus(id, newStatus);
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
      <h2>Sales Order Details</h2>

      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}

      <div style={{marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}}>
        <h3>Order Information</h3>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
          <div><strong>Order Number:</strong> {order.orderNumber || `SO-${order.id}`}</div>
          <div><strong>Customer:</strong> {order.customer?.name}</div>
          <div><strong>Order Date:</strong> {order.orderDate}</div>
          <div>
            <strong>Status:</strong> 
            <span style={{
              marginLeft: '10px',
              color: order.status === 'Delivered' ? 'green' : 
                     order.status === 'Cancelled' ? 'red' : 
                     order.status === 'Shipped' ? 'blue' : 'orange'
            }}>
              {order.status || 'Draft'}
            </span>
          </div>
        </div>
      </div>

      <div style={{marginBottom: '20px'}}>
        <h3>Status Management</h3>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          {['Draft', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
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
          <Link to={`/sales-order/${id}/items`}>
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
              <th>Price</th>
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
                  No items added to this sales order yet
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
        <Link to="/sales-orders">
          <button style={{backgroundColor: '#6c757d', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '3px'}}>
            Back to Sales Orders
          </button>
        </Link>
      </div>
    </MainLayout>
  );
}

export default SalesOrderDetailsPage;