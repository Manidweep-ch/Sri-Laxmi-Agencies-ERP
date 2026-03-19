import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import { getInvoiceById, updateInvoicePaymentStatus, getInvoiceItems } from "../services/invoiceService";

function InvoiceDetailsPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const [invoiceData, itemsData] = await Promise.all([
        getInvoiceById(id),
        getInvoiceItems(id)
      ]);
      setInvoice(invoiceData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceDetails();
  }, [id]);

  const handlePaymentStatusUpdate = async (newStatus) => {
    try {
      setStatusLoading(true);
      await updateInvoicePaymentStatus(id, newStatus);
      setInvoice(prev => ({...prev, paymentStatus: newStatus}));
    } catch (error) {
      console.error('Error updating payment status:', error);
      setError('Failed to update payment status');
    } finally {
      setStatusLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + item.totalPrice, 0);
  };

  const calculateGST = () => {
    return calculateSubtotal() * 0.18; // 18% GST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <MainLayout><div>Loading...</div></MainLayout>;
  if (!invoice) return <MainLayout><div>Invoice not found</div></MainLayout>;

  return (
    <MainLayout>
      <div className="invoice-container" style={{maxWidth: '800px', margin: '0 auto'}}>
        <div className="no-print" style={{marginBottom: '20px'}}>
          <h2>Invoice Details</h2>
          {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
        </div>

        {/* Invoice Header */}
        <div style={{border: '1px solid #ddd', padding: '20px', marginBottom: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <div>
              <h1 style={{margin: 0, color: '#333'}}>INVOICE</h1>
              <p style={{margin: '5px 0', fontSize: '18px', fontWeight: 'bold'}}>
                {invoice.invoiceNumber || `INV-${invoice.id}`}
              </p>
            </div>
            <div style={{textAlign: 'right'}}>
              <h3 style={{margin: 0}}>Sri Laxmi Agencies</h3>
              <p style={{margin: '5px 0'}}>123 Business Street</p>
              <p style={{margin: '5px 0'}}>City, State 12345</p>
              <p style={{margin: '5px 0'}}>GST: 29XXXXX1234X1ZX</p>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
            <div>
              <h4>Bill To:</h4>
              <p style={{margin: '5px 0', fontWeight: 'bold'}}>{invoice.customer?.name}</p>
              <p style={{margin: '5px 0'}}>{invoice.customer?.address}</p>
              <p style={{margin: '5px 0'}}>GST: {invoice.customer?.gstNumber}</p>
            </div>
            <div style={{textAlign: 'right'}}>
              <p><strong>Invoice Date:</strong> {invoice.invoiceDate}</p>
              <p><strong>Payment Status:</strong> 
                <span style={{
                  marginLeft: '10px',
                  color: invoice.paymentStatus === 'PAID' ? 'green' : 
                         invoice.paymentStatus === 'OVERDUE' ? 'red' : 'orange'
                }}>
                  {invoice.paymentStatus || 'PENDING'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Payment Status Management */}
        <div className="no-print" style={{marginBottom: '20px'}}>
          <h3>Payment Status Management</h3>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            {['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'].map(status => (
              <button
                key={status}
                onClick={() => handlePaymentStatusUpdate(status)}
                disabled={statusLoading || invoice.paymentStatus === status}
                style={{
                  backgroundColor: invoice.paymentStatus === status ? '#007bff' : '#f8f9fa',
                  color: invoice.paymentStatus === status ? 'white' : 'black',
                  border: '1px solid #ddd',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  cursor: invoice.paymentStatus === status ? 'default' : 'pointer'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Items */}
        <div style={{border: '1px solid #ddd', marginBottom: '20px'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{backgroundColor: '#f8f9fa'}}>
                <th style={{padding: '10px', textAlign: 'left', border: '1px solid #ddd'}}>Product</th>
                <th style={{padding: '10px', textAlign: 'center', border: '1px solid #ddd'}}>Qty</th>
                <th style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>Unit Price</th>
                <th style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>Disc %</th>
                <th style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={{padding: '10px', border: '1px solid #ddd'}}>{item.product?.name}</td>
                  <td style={{padding: '10px', textAlign: 'center', border: '1px solid #ddd'}}>{item.quantity}</td>
                  <td style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>₹{item.unitPrice}</td>
                  <td style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>{item.discount || 0}%</td>
                  <td style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>₹{item.totalPrice}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold'}}>
                  Subtotal:
                </td>
                <td style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold'}}>
                  ₹{calculateSubtotal().toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan="4" style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>
                  GST (18%):
                </td>
                <td style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd'}}>
                  ₹{calculateGST().toFixed(2)}
                </td>
              </tr>
              <tr style={{backgroundColor: '#f8f9fa'}}>
                <td colSpan="4" style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '18px'}}>
                  Total Amount:
                </td>
                <td style={{padding: '10px', textAlign: 'right', border: '1px solid #ddd', fontWeight: 'bold', fontSize: '18px'}}>
                  ₹{calculateTotal().toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div className="no-print" style={{display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px'}}>
          <button 
            onClick={handlePrint}
            style={{backgroundColor: '#28a745', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px'}}
          >
            Print Invoice
          </button>
          <Link to={`/invoice/${id}/items`}>
            <button style={{backgroundColor: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px'}}>
              Manage Items
            </button>
          </Link>
          <Link to="/invoices">
            <button style={{backgroundColor: '#6c757d', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px'}}>
              Back to Invoices
            </button>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 20px;
          }
        }
      `}</style>
    </MainLayout>
  );
}

export default InvoiceDetailsPage;
