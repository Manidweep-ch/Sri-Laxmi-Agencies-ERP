import { useEffect, useState } from "react";
import MainLayout from "../layout/MainLayout";
import {
  getProducts,
  createProduct
} from "../services/productService";
import { getBrands, createBrand } from "../services/brandService";
import { getCategories, createCategory } from "../services/categoryService";

function ProductsPage() {

  const [products,setProducts] = useState([]);
  const [brands,setBrands] = useState([]);
  const [categories,setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form,setForm] = useState({
    name:"",
    size:"",
    unit:"",
    hsnCode:"",
    gst:0,
    brandId:"",
    categoryId:"",
    newBrand:"",
    newCategory:""
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
      setError("");
    } catch (err) {
      setError("Failed to load products: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (err) {
      console.error("Failed to load brands:", err);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  useEffect(()=>{
    loadProducts();
    loadBrands();
    loadCategories();
  },[]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:e.target.value
    });
  };

  const handleAddBrand = async () => {
    if (!form.newBrand.trim()) return;
    
    try {
      const newBrand = await createBrand({ name: form.newBrand });
      setBrands([...brands, newBrand]);
      setForm({...form, brandId: newBrand.id, newBrand: ""});
    } catch (err) {
      setError("Failed to create brand: " + err.message);
    }
  };

  const handleAddCategory = async () => {
    if (!form.newCategory.trim()) return;
    
    try {
      const newCategory = await createCategory({ name: form.newCategory });
      setCategories([...categories, newCategory]);
      setForm({...form, categoryId: newCategory.id, newCategory: ""});
    } catch (err) {
      setError("Failed to create category: " + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Product name is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Create product object matching backend entity
      const productData = {
        name: form.name,
        size: form.size,
        unit: form.unit,
        hsnCode: form.hsnCode,
        gst: parseFloat(form.gst) || 0,
        brand: form.brandId ? { id: form.brandId } : null,
        category: form.categoryId ? { id: form.categoryId } : null,
        active: true
      };

      await createProduct(productData);

      setForm({
        name:"",
        size:"",
        unit:"",
        hsnCode:"",
        gst:0,
        brandId:"",
        categoryId:"",
        newBrand:"",
        newCategory:""
      });

      loadProducts();
    } catch (err) {
      setError("Failed to create product: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <MainLayout>

      <h2>Products Management</h2>

      {error && <div style={{color:"red", marginBottom:"10px"}}>{error}</div>}

      <div style={{marginBottom:"25px"}}>

        <div style={{marginBottom:"15px"}}>
          <input
            name="name"
            placeholder="Product Name"
            value={form.name}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"200px"}}
          />

          <input
            name="size"
            placeholder="Size (e.g., 1 inch)"
            value={form.size}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"150px"}}
          />

          <input
            name="unit"
            placeholder="Unit (Pieces/Meter)"
            value={form.unit}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"150px"}}
          />
        </div>

        <div style={{marginBottom:"15px"}}>
          <input
            name="hsnCode"
            placeholder="HSN Code"
            value={form.hsnCode}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"120px"}}
          />

          <input
            name="gst"
            type="number"
            placeholder="GST %"
            value={form.gst}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"80px"}}
          />
        </div>

        <div style={{marginBottom:"15px"}}>
          <select
            name="brandId"
            value={form.brandId}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"150px"}}
          >
            <option value="">Select Brand</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>

          <input
            name="newBrand"
            placeholder="Or add new brand"
            value={form.newBrand}
            onChange={handleChange}
            style={{marginRight:"5px", padding:"5px", width:"120px"}}
          />
          <button onClick={handleAddBrand} style={{marginRight:"10px"}}>Add</button>

          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            style={{marginRight:"10px", padding:"5px", width:"150px"}}
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <input
            name="newCategory"
            placeholder="Or add new category"
            value={form.newCategory}
            onChange={handleChange}
            style={{marginRight:"5px", padding:"5px", width:"120px"}}
          />
          <button onClick={handleAddCategory}>Add</button>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{padding:"8px 15px"}}>
          {loading ? "Adding..." : "Add Product"}
        </button>

      </div>

      {loading && <div>Loading products...</div>}

      <table border="1" width="100%" style={{borderCollapse:"collapse"}}>

        <thead>

          <tr>
            <th style={{padding:"10px"}}>ID</th>
            <th style={{padding:"10px"}}>Name</th>
            <th style={{padding:"10px"}}>Size</th>
            <th style={{padding:"10px"}}>Unit</th>
            <th style={{padding:"10px"}}>HSN Code</th>
            <th style={{padding:"10px"}}>GST %</th>
            <th style={{padding:"10px"}}>Brand</th>
            <th style={{padding:"10px"}}>Category</th>
          </tr>

        </thead>

        <tbody>

          {products.map((p)=> (

            <tr key={p.id}>

              <td style={{padding:"10px"}}>{p.id}</td>
              <td style={{padding:"10px"}}>{p.name}</td>
              <td style={{padding:"10px"}}>{p.size || "-"}</td>
              <td style={{padding:"10px"}}>{p.unit}</td>
              <td style={{padding:"10px"}}>{p.hsnCode || "-"}</td>
              <td style={{padding:"10px"}}>{p.gst}%</td>
              <td style={{padding:"10px"}}>{p.brand?.name || "-"}</td>
              <td style={{padding:"10px"}}>{p.category?.name || "-"}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </MainLayout>

  );
}

export default ProductsPage;