import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import { getPrices, createPrice, updatePrice } from "../services/priceService";
import { getProducts, createProduct } from "../services/productService";
import { getBrands, createBrand } from "../services/brandService";
import { getCategories, createCategory } from "../services/categoryService";
import { usePageStyles } from "../hooks/usePageStyles";

const emptyProductForm = { name: "", size: "", unit: "", hsnCode: "", gst: "", brandId: "", categoryId: "", newBrand: "", newCategory: "", costPrice: "", basePrice: "", baseDiscount: "" };
const emptyPriceForm = { productId: "", costPrice: "", basePrice: "", baseDiscount: "", validFrom: "" };

export default function PriceListPage() {
  const [products, setProducts] = useState([]);
  const [prices, setPrices] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [search, setSearch] = useState("");
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [priceForm, setPriceForm] = useState(emptyPriceForm);
  const ps = usePageStyles();
  const { t } = ps;
  const today = new Date().toISOString().split("T")[0];

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.hsnCode?.toLowerCase().includes(search.toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [p, pr, b, c] = await Promise.all([getProducts(), getPrices(), getBrands(), getCategories()]);
      setProducts(p); setPrices(pr); setBrands(b); setCategories(c);
    } catch { setError("Failed to load data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getCurrentPrice = (productId) =>
    prices.filter(p => p.product?.id === productId && p.active)
      .filter(p => p.validFrom <= today && (!p.validTo || p.validTo >= today))
      .sort((a, b) => new Date(b.validFrom) - new Date(a.validFrom))[0];

  const getHistory = (productId) =>
    prices.filter(p => p.product?.id === productId)
      .sort((a, b) => new Date(b.validFrom) - new Date(a.validFrom));

  const handleSavePrice = async () => {
    if (!priceForm.productId || !priceForm.basePrice || (!editEntry && !priceForm.validFrom)) {
      setError("Product, Price and Valid From are required"); return;
    }
    try {
      setLoading(true); setError("");
      if (editEntry) {
        await updatePrice(editEntry.id, { basePrice: parseFloat(priceForm.basePrice), costPrice: parseFloat(priceForm.costPrice) || 0, baseDiscount: parseFloat(priceForm.baseDiscount) || 0 });
      } else {
        await createPrice({ product: { id: parseInt(priceForm.productId) }, costPrice: parseFloat(priceForm.costPrice) || 0, basePrice: parseFloat(priceForm.basePrice), baseDiscount: parseFloat(priceForm.baseDiscount) || 0, validFrom: priceForm.validFrom });
      }
      setPriceForm(emptyPriceForm); setShowPriceForm(false); setEditEntry(null); load();
    } catch { setError("Failed to save price"); }
    finally { setLoading(false); }
  };

  const handleEditPrice = (entry) => {
    setEditEntry(entry);
    setPriceForm({ productId: entry.product?.id, costPrice: entry.costPrice || 0, basePrice: entry.basePrice, baseDiscount: entry.baseDiscount || 0, validFrom: entry.validFrom });
    setShowPriceForm(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) { setError("Product name is required"); return; }
    try {
      setLoading(true); setError("");
      const saved = await createProduct({
        name: productForm.name, size: productForm.size, unit: productForm.unit,
        hsnCode: productForm.hsnCode, gst: parseFloat(productForm.gst) || 0,
        brand: productForm.brandId ? { id: parseInt(productForm.brandId) } : null,
        category: productForm.categoryId ? { id: parseInt(productForm.categoryId) } : null,
      });
      if (productForm.basePrice) {
        await createPrice({ product: { id: saved.id }, costPrice: parseFloat(productForm.costPrice) || 0, basePrice: parseFloat(productForm.basePrice), baseDiscount: parseFloat(productForm.baseDiscount) || 0, validFrom: today });
      }
      setProductForm(emptyProductForm); setShowProductForm(false); load();
    } catch { setError("Failed to save product"); }
    finally { setLoading(false); }
  };

  const handleAddBrand = async () => {
    if (!productForm.newBrand.trim()) return;
    try {
      const b = await createBrand({ name: productForm.newBrand });
      setBrands(prev => [...prev, b]);
      setProductForm(f => ({ ...f, brandId: b.id, newBrand: "" }));
    } catch { setError("Failed to add brand"); }
  };

  const handleAddCategory = async () => {
    if (!productForm.newCategory.trim()) return;
    try {
      const c = await createCategory({ name: productForm.newCategory });
      setCategories(prev => [...prev, c]);
      setProductForm(f => ({ ...f, categoryId: c.id, newCategory: "" }));
    } catch { setError("Failed to add category"); }
  };

  const inp = { ...ps.input, marginBottom: 0 };
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" };

  return (
    <MainLayout>
      <div className="erp-page">
      <div style={ps.pageHeader}>
        <div>
          <h2 style={ps.pageTitle}>Price List</h2>
          <div style={{ fontSize: "12px", color: t.textMuted, marginTop: "2px" }}>
            {products.length} products · manage pricing and catalogue
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input className="erp-input" style={ps.searchInput} placeholder="Search product, brand, category..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="erp-btn" style={ps.btnSuccess} onClick={() => { setShowProductForm(true); setProductForm(emptyProductForm); }}>+ Add Product</button>
        </div>
      </div>

      {error && <div style={ps.alertError}>⚠ {error}</div>}
      {loading && <div style={ps.alertInfo}>Loading...</div>}

      {showProductForm && (
        <div style={ps.formBox}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>Add New Product</div>
          <div style={grid2}>
            <div><label style={ps.label}>Product Name *</label><input style={inp} placeholder="e.g. Ashirvad CPVC Pipe" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={ps.label}>Size</label><input style={inp} placeholder="e.g. 1 inch" value={productForm.size} onChange={e => setProductForm(f => ({ ...f, size: e.target.value }))} /></div>
            <div><label style={ps.label}>Unit</label><input style={inp} placeholder="e.g. Piece / Meter" value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} /></div>
            <div><label style={ps.label}>HSN Code</label><input style={inp} placeholder="HSN Code" value={productForm.hsnCode} onChange={e => setProductForm(f => ({ ...f, hsnCode: e.target.value }))} /></div>
            <div><label style={ps.label}>GST %</label><input style={inp} type="number" placeholder="18" value={productForm.gst} onChange={e => setProductForm(f => ({ ...f, gst: e.target.value }))} /></div>
            <div><label style={ps.label}>Cost Price / CP (₹)</label><input style={inp} type="number" placeholder="0.00" value={productForm.costPrice} onChange={e => setProductForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
            <div><label style={ps.label}>Selling Price / SP (₹)</label><input style={inp} type="number" placeholder="0.00" value={productForm.basePrice} onChange={e => setProductForm(f => ({ ...f, basePrice: e.target.value }))} /></div>
            <div><label style={ps.label}>Discount (%)</label><input style={inp} type="number" placeholder="0" value={productForm.baseDiscount} onChange={e => setProductForm(f => ({ ...f, baseDiscount: e.target.value }))} /></div>
          </div>
          <div style={grid2}>
            <div>
              <label style={ps.label}>Brand</label>
              <select style={inp} value={productForm.brandId} onChange={e => setProductForm(f => ({ ...f, brandId: e.target.value }))}>
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <input style={{ ...inp, flex: 1 }} placeholder="New brand name" value={productForm.newBrand} onChange={e => setProductForm(f => ({ ...f, newBrand: e.target.value }))} />
                <button style={ps.btnSmPrimary} onClick={handleAddBrand}>Add</button>
              </div>
            </div>
            <div>
              <label style={ps.label}>Category</label>
              <select style={inp} value={productForm.categoryId} onChange={e => setProductForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <input style={{ ...inp, flex: 1 }} placeholder="New category name" value={productForm.newCategory} onChange={e => setProductForm(f => ({ ...f, newCategory: e.target.value }))} />
                <button style={ps.btnSmPrimary} onClick={handleAddCategory}>Add</button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={ps.btnSuccess} onClick={handleSaveProduct} disabled={loading}>Save Product</button>
            <button style={ps.btnGhost} onClick={() => setShowProductForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showPriceForm && (
        <div style={ps.formBox}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: t.text, marginBottom: "16px" }}>{editEntry ? "Update Price" : "Add New Price"}</div>
          {!editEntry ? (
            <div style={{ marginBottom: "14px" }}>
              <label style={ps.label}>Product *</label>
              <select style={inp} value={priceForm.productId} onChange={e => setPriceForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.size ? ` - ${p.size}` : ""} ({p.brand?.name || "No Brand"})</option>)}
              </select>
            </div>
          ) : (
            <p style={{ margin: "0 0 14px", color: t.textSub, fontSize: "13px" }}>Product: <strong style={{ color: t.text }}>{editEntry.product?.name}</strong></p>
          )}
          <div style={grid2}>
            <div><label style={ps.label}>Cost Price / CP (₹) *</label><input style={inp} type="number" placeholder="0.00" value={priceForm.costPrice} onChange={e => setPriceForm(f => ({ ...f, costPrice: e.target.value }))} /></div>
            <div><label style={ps.label}>Selling Price / SP (₹) *</label><input style={inp} type="number" placeholder="0.00" value={priceForm.basePrice} onChange={e => setPriceForm(f => ({ ...f, basePrice: e.target.value }))} /></div>
            <div><label style={ps.label}>Discount (%)</label><input style={inp} type="number" placeholder="0" value={priceForm.baseDiscount} onChange={e => setPriceForm(f => ({ ...f, baseDiscount: e.target.value }))} /></div>
            {!editEntry && <div><label style={ps.label}>Valid From *</label><input style={inp} type="date" value={priceForm.validFrom} onChange={e => setPriceForm(f => ({ ...f, validFrom: e.target.value }))} /></div>}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={ps.btnPrimary} onClick={handleSavePrice} disabled={loading}>{editEntry ? "Update" : "Save"}</button>
            <button style={ps.btnGhost} onClick={() => { setShowPriceForm(false); setEditEntry(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={ps.tableWrap}>
        <table style={ps.table}>
          <thead>
            <tr style={ps.thead}>
              <th style={ps.th}>Product</th><th style={ps.th}>Brand</th><th style={ps.th}>Category</th>
              <th style={ps.th}>HSN</th><th style={ps.th}>Size / Unit</th>
              <th style={ps.th}>Cost Price</th><th style={ps.th}>Selling Price</th>
              <th style={ps.th}>Discount</th><th style={ps.th}>Valid From</th><th style={ps.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && !loading && (
              <tr><td colSpan={10} style={{ ...ps.td, textAlign: "center", color: t.textMuted, padding: "32px" }}>No products found</td></tr>
            )}
            {filteredProducts.map(product => {
              const cp = getCurrentPrice(product.id);
              return (
                <tr key={product.id} className="erp-tr" style={{ ...ps.tr, background: t.surface }}>
                  <td style={{ ...ps.td, fontWeight: 600 }}>{product.name}</td>
                  <td style={ps.tdSub}>{product.brand?.name || "-"}</td>
                  <td style={ps.tdSub}>{product.category?.name || "-"}</td>
                  <td style={ps.tdSub}>{product.hsnCode || "-"}</td>
                  <td style={ps.tdSub}>{product.size || "-"} / {product.unit || "-"}</td>
                  <td style={ps.td}>{cp ? <span style={{ color: t.primary, fontWeight: 600 }}>₹{cp.costPrice ?? "-"}</span> : <span style={{ color: t.danger, fontSize: "12px" }}>Not Set</span>}</td>
                  <td style={ps.td}>{cp ? <span style={{ color: t.success, fontWeight: 600 }}>₹{cp.basePrice}</span> : <span style={{ color: t.danger, fontSize: "12px" }}>Not Set</span>}</td>
                  <td style={ps.tdSub}>{cp ? `${cp.baseDiscount || 0}%` : "-"}</td>
                  <td style={ps.tdSub}>{cp ? cp.validFrom : "-"}</td>
                  <td style={ps.td}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {cp && <button style={{ ...ps.btnSmGhost, color: t.warning, borderColor: t.warning }} onClick={() => handleEditPrice(cp)}>Edit</button>}
                      <button style={ps.btnSmPrimary} onClick={() => setShowHistory(showHistory === product.id ? null : product.id)}>
                        {showHistory === product.id ? "Hide" : "History"}
                      </button>
                      <button style={ps.btnSmSuccess} onClick={() => { setShowPriceForm(true); setEditEntry(null); setPriceForm({ ...emptyPriceForm, productId: product.id, validFrom: today }); }}>
                        + Price
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showHistory && (
        <div style={{ ...ps.formBox, marginTop: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: t.text, marginBottom: "14px" }}>
            Price History — {products.find(p => p.id === showHistory)?.name}
          </div>
          <div style={ps.tableWrap}>
            <table style={ps.table}>
              <thead>
                <tr style={ps.thead}>
                  <th style={ps.th}>CP (₹)</th><th style={ps.th}>SP (₹)</th><th style={ps.th}>Discount</th>
                  <th style={ps.th}>Valid From</th><th style={ps.th}>Valid To</th>
                  <th style={ps.th}>Status</th><th style={ps.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {getHistory(showHistory).map(entry => {
                  const isActive = entry.validFrom <= today && (!entry.validTo || entry.validTo >= today) && entry.active;
                  return (
                    <tr key={entry.id} style={{ ...ps.tr, background: isActive ? t.successBg : t.surface }}>
                      <td style={ps.td}>₹{entry.costPrice ?? "-"}</td>
                      <td style={{ ...ps.td, fontWeight: 600 }}>₹{entry.basePrice}</td>
                      <td style={ps.tdSub}>{entry.baseDiscount || 0}%</td>
                      <td style={ps.tdSub}>{entry.validFrom}</td>
                      <td style={ps.tdSub}>{entry.validTo || "Open"}</td>
                      <td style={ps.td}>
                        <span style={{ ...ps.badge, background: isActive ? t.success : t.border, color: isActive ? "white" : t.textSub }}>
                          {isActive ? "Current" : "Previous"}
                        </span>
                      </td>
                      <td style={ps.td}>
                        <button style={{ ...ps.btnSmGhost, color: t.warning, borderColor: t.warning }} onClick={() => handleEditPrice(entry)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}