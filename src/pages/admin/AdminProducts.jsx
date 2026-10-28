import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  ExternalLink, 
  Check, 
  X, 
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Layers,
  Sliders,
  Sparkles,
  Info,
  ChevronRight
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { api, formatINR } from '../../services/api';
import { TOY_CATEGORIES, AGE_GROUPS } from '../../data/mockToys';
import './AdminProducts.css';

export default function AdminProducts() {
  const [toys, setToys] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Tabs in Product Form: 'general', 'media', 'variants', 'specs'
  const [activeTab, setActiveTab] = useState('general');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToyId, setEditingToyId] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());

  // Bulk Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFormat, setImportFormat] = useState('json'); // 'json' | 'csv'
  const [importText, setImportText] = useState('');
  const [importUpdateExisting, setImportUpdateExisting] = useState(true);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [importing, setImporting] = useState(false);

  function getEmptyFormData() {
    return {
      name: '',
      sku: `TY-IN-${Math.floor(100000 + Math.random() * 900000)}`,
      category: 'STEM & Learning',
      ageGroup: '6-8 yrs',
      brand: 'ToyVerse India',
      price: '1999',
      originalPrice: '2499',
      stock: '25',
      images: [
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'
      ],
      newImageUrl: '',
      description: 'Handcrafted with BIS child-safe non-toxic materials (IS-9873 compliant). Inspires problem-solving, cognitive development, and creative play for Indian children.',
      features: [
        'BIS Certified (IS-9873 Part 1, 2, 3 child safety)',
        '100% non-toxic, lead-free eco-friendly materials',
        'Includes detailed illustrated bilingual activity guide (English & Hindi)'
      ],
      newFeature: '',
      specs: {
        'BIS Safety Standard': 'IS-9873 Certified',
        'Dimensions': '30 x 20 x 12 cm',
        'Weight': '650 grams',
        'Material': 'Non-toxic ABS & Natural Wood',
        'Country of Origin': 'India',
        'Warranty': '6 Months Brand Warranty'
      },
      newSpecKey: '',
      newSpecValue: '',
      variants: [
        { id: 'v-1', name: 'Standard Edition', sku: `TY-STD-${Math.floor(1000 + Math.random() * 9000)}`, price: '1999', stock: '15', color: '#FF5E7E' },
        { id: 'v-2', name: 'Deluxe Collector Kit', sku: `TY-DLX-${Math.floor(1000 + Math.random() * 9000)}`, price: '2499', stock: '10', color: '#5E60CE' }
      ],
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true
    };
  }

  const loadProducts = () => {
    setLoading(true);
    api.products.getAll({
      search: searchFilter || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      inStock: stockFilter === 'out' ? 'false' : undefined
    })
      .then(data => {
        let items = data || [];
        if (stockFilter === 'low') {
          items = items.filter(t => t.stock <= 5);
        } else if (stockFilter === 'out') {
          items = items.filter(t => t.stock === 0);
        }
        setToys(items);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, stockFilter]);

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingToyId(null);
    setFormData(getEmptyFormData());
    setActiveTab('general');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (toy) => {
    setEditingToyId(toy.id);
    setFormData({
      name: toy.name || '',
      sku: toy.sku || '',
      category: toy.category || 'STEM & Learning',
      ageGroup: toy.ageGroup || '6-8 yrs',
      brand: toy.brand || 'ToyVerse India',
      price: String(toy.price || '0'),
      originalPrice: String(toy.originalPrice || toy.price || '0'),
      stock: String(toy.stock || '0'),
      images: Array.isArray(toy.images) && toy.images.length ? toy.images : (toy.image ? [toy.image] : []),
      newImageUrl: '',
      description: toy.description || '',
      features: Array.isArray(toy.features) ? toy.features : [],
      newFeature: '',
      specs: toy.specs && typeof toy.specs === 'object' ? { ...toy.specs } : {},
      newSpecKey: '',
      newSpecValue: '',
      variants: Array.isArray(toy.variants) ? toy.variants : [],
      isFeatured: Boolean(toy.isFeatured),
      isBestSeller: Boolean(toy.isBestSeller),
      isNewArrival: Boolean(toy.isNewArrival)
    });
    setActiveTab('general');
    setIsModalOpen(true);
  };

  // Image Gallery Handlers
  const handleAddImage = () => {
    if (formData.newImageUrl && formData.newImageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, prev.newImageUrl.trim()],
        newImageUrl: ''
      }));
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSetPrimaryImage = (index) => {
    setFormData(prev => {
      const selected = prev.images[index];
      const remaining = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: [selected, ...remaining]
      };
    });
  };

  // Feature Bullet Handlers
  const handleAddFeature = () => {
    if (formData.newFeature && formData.newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, prev.newFeature.trim()],
        newFeature: ''
      }));
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Specification Handlers
  const handleAddSpec = () => {
    if (formData.newSpecKey && formData.newSpecValue) {
      setFormData(prev => ({
        ...prev,
        specs: {
          ...prev.specs,
          [prev.newSpecKey.trim()]: prev.newSpecValue.trim()
        },
        newSpecKey: '',
        newSpecValue: ''
      }));
    }
  };

  const handleRemoveSpec = (key) => {
    setFormData(prev => {
      const copy = { ...prev.specs };
      delete copy[key];
      return { ...prev, specs: copy };
    });
  };

  // Variant Handlers
  const handleAddVariant = () => {
    const newVariant = {
      id: `v-${Date.now()}`,
      name: 'Special Edition',
      sku: `${formData.sku}-V${(formData.variants?.length || 0) + 1}`,
      price: formData.price || '1999',
      stock: '10',
      color: '#4CC9F0'
    };
    setFormData(prev => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant]
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.variants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleRemoveVariant = (index) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  // Save Product (Add or Edit)
  const handleSaveToy = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      ageGroup: formData.ageGroup,
      brand: formData.brand,
      price: parseFloat(formData.price) || 0,
      originalPrice: parseFloat(formData.originalPrice) || parseFloat(formData.price),
      stock: parseInt(formData.stock, 10) || 0,
      images: formData.images.length ? formData.images : ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'],
      description: formData.description,
      features: formData.features,
      specs: formData.specs,
      variants: formData.variants,
      isFeatured: formData.isFeatured,
      isBestSeller: formData.isBestSeller,
      isNewArrival: formData.isNewArrival
    };

    try {
      if (editingToyId) {
        await api.products.update(editingToyId, payload);
      } else {
        await api.products.create(payload);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      alert(`Failed to save product: ${err.message}`);
    }
  };

  // Delete Toy
  const handleDeleteToy = async (toyId, toyName) => {
    if (window.confirm(`Are you sure you want to permanently delete "${toyName}" from the Indian catalog?`)) {
      try {
        await api.products.delete(toyId);
        loadProducts();
      } catch (err) {
        alert('Failed to delete product.');
      }
    }
  };

  // Quick Stock Adjustment
  const handleStockAdjust = async (toyId, change) => {
    try {
      await api.products.adjustStock(toyId, change);
      setToys(prev => prev.map(t => t.id === toyId ? { ...t, stock: Math.max(0, t.stock + change) } : t));
    } catch (err) {
      alert('Failed to update stock.');
    }
  };

  // Discount Calculation Helper
  const discountPercentage = useMemo(() => {
    const regular = parseFloat(formData.price) || 0;
    const original = parseFloat(formData.originalPrice) || 0;
    if (original > regular && regular > 0) {
      return Math.round(((original - regular) / original) * 100);
    }
    return 0;
  }, [formData.price, formData.originalPrice]);

  // Industrial-Grade RFC-4180 CSV Parser & Multi-Row Variant Collapsing Engine
  // Capable of importing multi-row catalog CSVs (e.g. 3,263 rows, 1,151 products, 1,155 variants, 38 columns)
  // without losing variant matrices or creating duplicate products.
  function parseCSV(text) {
    if (!text || !text.trim()) return [];

    // 1. RFC 4180 Tokenizer: accurately handles quotes, escaped quotes (""), and multiline fields
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const rawHeaders = rows[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Map raw rows to key-value objects
    const rawObjects = [];
    for (let i = 1; i < rows.length; i++) {
      const rowValues = rows[i];
      const obj = {};
      rawHeaders.forEach((h, idx) => {
        obj[h] = rowValues[idx] !== undefined ? rowValues[idx] : '';
      });
      rawObjects.push(obj);
    }

    // 2. Multi-Row Grouping & Product Deduplication
    // In catalog CSVs (e.g. 3,263 rows for 1,151 products), multiple rows share the same Handle / ID / Title / Parent SKU
    const productsMap = new Map();

    for (const row of rawObjects) {
      // Group key priority: Handle > Product ID > Title > SKU > Name
      const handle = (
        row['Handle'] || 
        row['handle'] || 
        row['Product ID'] || 
        row['id'] || 
        row['Title'] || 
        row['name'] || 
        row['SKU'] || 
        row['sku'] || 
        ''
      ).trim();

      if (!handle) continue;

      if (!productsMap.has(handle)) {
        // Base Parent Product
        const title = row['Title'] || row['name'] || handle;
        const price = parseFloat(row['Variant Price'] || row['price'] || row['Price'] || 0) || 999;
        const originalPrice = parseFloat(row['Variant Compare At Price'] || row['originalPrice'] || row['original_price'] || row['Compare At Price'] || price);
        const stock = (row['Variant Inventory Qty'] !== undefined && row['Variant Inventory Qty'] !== '' && !isNaN(Number(row['Variant Inventory Qty'])))
          ? parseInt(row['Variant Inventory Qty'], 10)
          : (row['stock'] !== undefined && row['stock'] !== '' && !isNaN(Number(row['stock'])) ? parseInt(row['stock'], 10) : 50);
        const parentSku = row['Variant SKU'] || row['sku'] || row['SKU'] || `TY-${handle.replace(/\s+/g, '-').toUpperCase()}`;

        // Images collection
        const images = [];
        const rawImg = row['Image Src'] || row['image'] || row['images'] || row['Image'];
        if (rawImg) {
          rawImg.split(/[;,]/).forEach(s => {
            const trimmed = s.trim();
            if (trimmed && !images.includes(trimmed)) images.push(trimmed);
          });
        }

        // Variants collection
        const variants = [];
        const opt1Val = row['Option1 Value'] || row['Option 1 Value'] || row['variant_name'] || '';
        const opt2Val = row['Option2 Value'] || row['Option 2 Value'] || '';
        const varSku = row['Variant SKU'] || row['variant_sku'] || '';
        const varPrice = parseFloat(row['Variant Price'] || price);
        const varStock = (row['Variant Inventory Qty'] !== undefined && row['Variant Inventory Qty'] !== '' && !isNaN(Number(row['Variant Inventory Qty'])))
          ? parseInt(row['Variant Inventory Qty'], 10)
          : 50; // Initial stock quantity of 50 for every imported variant

        if (opt1Val || varSku) {
          variants.push({
            id: `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: [opt1Val, opt2Val].filter(Boolean).join(' / ') || 'Standard Edition',
            sku: varSku || `${parentSku}-V1`,
            price: varPrice,
            stock: varStock,
            barcode: row['Variant Barcode'] || row['Barcode'] || ''
          });
        }

        // All 38 Columns Mapping & Rich Metadata
        const specs = {};
        if (row['HSN Code']) specs['HSN Code'] = row['HSN Code'];
        if (row['BIS Standard'] || row['BIS Safety']) specs['BIS Safety'] = row['BIS Standard'] || row['BIS Safety'] || 'IS-9873 Certified';
        if (row['Country of Origin']) specs['Country of Origin'] = row['Country of Origin'];
        if (row['Dimensions']) specs['Dimensions'] = row['Dimensions'];
        if (row['Variant Grams'] || row['Weight']) specs['Weight'] = `${row['Variant Grams'] || row['Weight']}g`;
        if (row['Variant Barcode'] || row['Barcode']) specs['Barcode'] = row['Variant Barcode'] || row['Barcode'];
        if (row['SEO Title']) specs['SEO Title'] = row['SEO Title'];
        if (row['SEO Description']) specs['SEO Description'] = row['SEO Description'];
        if (row['Google Shopping / Google Product Category']) specs['Google Category'] = row['Google Shopping / Google Product Category'];

        // Tags parsing
        const tagsStr = row['Tags'] || row['tags'] || '';
        const isFeatured = tagsStr.toLowerCase().includes('featured');
        const isBestSeller = tagsStr.toLowerCase().includes('bestseller');
        const isNewArrival = tagsStr.toLowerCase().includes('new') || true;

        // Features parsing
        let features = [];
        const rawFeatures = row['Features'] || row['features'] || '';
        if (rawFeatures) {
          features = rawFeatures.split(/[|\n]/).map(f => f.trim()).filter(Boolean);
        }

        productsMap.set(handle, {
          handle,
          name: title,
          sku: parentSku,
          category: row['Category'] || row['Standard Product Type'] || row['Type'] || 'STEM & Learning',
          ageGroup: row['Age Recommendation'] || row['Age Group'] || row['ageGroup'] || '6-8 yrs',
          brand: row['Vendor'] || row['Brand'] || row['brand'] || 'ToyVerse India',
          price,
          originalPrice,
          stock,
          isFeatured,
          isBestSeller,
          isNewArrival,
          images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'],
          description: row['Body (HTML)'] || row['Description'] || row['description'] || '',
          features,
          specs,
          variants
        });
      } else {
        // Subsequent Row: Group into existing parent product
        const existing = productsMap.get(handle);

        // 1. Aggregate additional images
        const extraImg = row['Image Src'] || row['image'] || row['images'];
        if (extraImg) {
          extraImg.split(/[;,]/).forEach(s => {
            const trimmed = s.trim();
            if (trimmed && !existing.images.includes(trimmed)) existing.images.push(trimmed);
          });
        }

        // 2. Aggregate additional variants
        const opt1Val = row['Option1 Value'] || row['Option 1 Value'] || '';
        const opt2Val = row['Option2 Value'] || row['Option 2 Value'] || '';
        const varSku = row['Variant SKU'] || row['variant_sku'] || '';

        if (opt1Val || varSku) {
          const varPrice = parseFloat(row['Variant Price'] || existing.price);
          const varStock = (row['Variant Inventory Qty'] !== undefined && row['Variant Inventory Qty'] !== '' && !isNaN(Number(row['Variant Inventory Qty'])))
            ? parseInt(row['Variant Inventory Qty'], 10)
            : 50; // Initial stock quantity of 50 for every imported variant
          const variantAlreadyAdded = existing.variants.some(v => v.sku === varSku);

          if (!variantAlreadyAdded) {
            existing.variants.push({
              id: `v-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: [opt1Val, opt2Val].filter(Boolean).join(' / ') || `Variant ${existing.variants.length + 1}`,
              sku: varSku || `${existing.sku}-V${existing.variants.length + 1}`,
              price: varPrice,
              stock: varStock,
              barcode: row['Variant Barcode'] || row['Barcode'] || ''
            });
            existing.stock += varStock;
          }
        }
      }
    }

    return Array.from(productsMap.values());
  }

  // Pre-load Sample Toys for Instant Testing
  const handleLoadSampleToys = () => {
    const sampleData = [
      {
        name: "ISRO Gaganyaan Modular Space Habitat Kit",
        sku: "ISRO-GAG-044",
        category: "STEM & Learning",
        ageGroup: "9-12 yrs",
        brand: "ISRO SpaceLab India",
        price: 3499,
        originalPrice: 4299,
        stock: 45,
        images: [
          "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1517976487502-5f65f04b2b2b?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Official scale space habitat STEM building set celebrating India's human spaceflight program. Includes crew capsule, solar panels, and astronaut figures.",
        features: [
          "680 high-precision interlocking blocks",
          "Features realistic solar array wings and docking node",
          "BIS IS-9873 child-safety certified",
          "Detailed mission briefing handbook"
        ],
        specs: {
          "BIS Standard": "IS-9873 Certified",
          "Material": "Eco-friendly non-toxic ABS",
          "Piece Count": "680 pieces",
          "Dimensions": "42 x 28 x 18 cm",
          "Country of Origin": "India"
        },
        variants: [
          { name: "Standard Orbital Habitat", sku: "ISRO-GAG-STD", price: 3499, stock: 30 },
          { name: "Mission Commander Collector Edition", sku: "ISRO-GAG-DLX", price: 4299, stock: 15 }
        ],
        isFeatured: true,
        isNewArrival: true
      },
      {
        name: "Ancient Hastinapur Deluxe Wooden Chess & Strategy Board",
        sku: "BRD-HAS-055",
        category: "Board Games & Puzzles",
        ageGroup: "6-8 yrs",
        brand: "MythicPlay India",
        price: 2499,
        originalPrice: 2999,
        stock: 20,
        images: [
          "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=800&q=80"
        ],
        description: "Handcrafted Sheesham wood board with carved battle elephants, war chariots, and imperial pawns with brass inlays.",
        features: [
          "100% Solid Indian Sheesham wood",
          "Felted bottoms on all 32 chessmen",
          "Dual storage drawers with velvet lining"
        ],
        specs: {
          "Material": "Solid Sheesham & Rosewood",
          "Dimensions": "36 x 36 x 5 cm",
          "Weight": "1.8 kg",
          "BIS Safety": "Natural organic beeswax polish"
        },
        variants: [
          { name: "Classic Rosewood", sku: "BRD-HAS-RSW", price: 2499, stock: 12 },
          { name: "Imperial Brass Inlay", sku: "BRD-HAS-BRS", price: 3199, stock: 8 }
        ],
        isBestSeller: true
      },
      {
        name: "SpeedX Thar Desert All-Terrain 4WD Rock Crawler",
        sku: "RC-THR-066",
        category: "RC Vehicles & Drones",
        ageGroup: "6-8 yrs",
        brand: "SpeedX India",
        price: 3299,
        originalPrice: 3999,
        stock: 18,
        images: [
          "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80"
        ],
        description: "High-torque 4-wheel drive RC crawler equipped with oversized deep-tread tires, waterproof electronics, and 2.4GHz anti-interference transmitter.",
        features: [
          "4WD dual high-torque motors",
          "Spring suspension shocks for rough terrain",
          "Rechargeable 7.4V Li-ion battery (35 min drive time)",
          "Includes USB fast charger"
        ],
        specs: {
          "Scale": "1:14 Scale",
          "Top Speed": "20 km/h",
          "Range": "80 meters",
          "BIS Safety": "IS-9873 and WPC India Compliant"
        },
        variants: [
          { name: "Desert Sand Yellow", sku: "RC-THR-YEL", price: 3299, stock: 10, color: "#E0A96D" },
          { name: "Monsoon Military Green", sku: "RC-THR-GRN", price: 3299, stock: 8, color: "#4B5320" }
        ],
        isFeatured: true
      }
    ];

    setImportFormat('json');
    setImportText(JSON.stringify(sampleData, null, 2));
    setImportStatus({
      type: 'info',
      message: 'Loaded 3 Indian STEM, Heritage & RC toys with multiple images, specifications, and variants! Click "Execute Bulk Import" below.'
    });
  };

  // File Upload Handler (for .csv and .json catalog files)
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setImportText(content);
      if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      } else if (file.name.endsWith('.json')) {
        setImportFormat('json');
      }
      setImportStatus({
        type: 'info',
        message: `Loaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Click "Execute Bulk Import" to process.`
      });
    };
    reader.readAsText(file);
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    if (!importText.trim()) {
      setImportStatus({ type: 'error', message: 'Please enter JSON or CSV data to import.' });
      return;
    }

    let parsedProducts = [];
    try {
      if (importFormat === 'json') {
        const parsed = JSON.parse(importText);
        parsedProducts = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        parsedProducts = parseCSV(importText);
      }
    } catch (e) {
      setImportStatus({ type: 'error', message: `Syntax error: ${e.message}` });
      return;
    }

    if (parsedProducts.length === 0) {
      setImportStatus({ type: 'error', message: 'No valid toys found in the provided data.' });
      return;
    }

    setImporting(true);
    setImportStatus(null);

    try {
      const res = await api.products.bulkImport({
        products: parsedProducts,
        updateExisting: importUpdateExisting
      });

      setImportStatus({
        type: 'success',
        message: res.message || `Successfully imported ${res.importedCount} toys and updated ${res.updatedCount}!`
      });

      // Reload products catalog
      loadProducts();
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: `Import failed: ${err.message}`
      });
    } finally {
      setImporting(false);
    }
  };

  // Export Catalog
  const handleExportCatalog = (format = 'json') => {
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(toys, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `toyverse_catalog_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      // CSV
      const headers = ['name', 'sku', 'category', 'ageGroup', 'brand', 'price', 'originalPrice', 'stock', 'images', 'description'];
      const csvRows = [headers.join(',')];
      toys.forEach(t => {
        const imagesStr = (t.images || [t.image]).join(';');
        const row = [
          `"${(t.name || '').replace(/"/g, '""')}"`,
          `"${t.sku || ''}"`,
          `"${t.category || ''}"`,
          `"${t.ageGroup || ''}"`,
          `"${(t.brand || '').replace(/"/g, '""')}"`,
          t.price,
          t.originalPrice || t.price,
          t.stock,
          `"${imagesStr.replace(/"/g, '""')}"`,
          `"${(t.description || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `toyverse_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  return (
    <AdminLayout>
      <div className="admin-products-root animate-fade-in">
        {/* Header with Title and Action Buttons */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Catalog & Inventory Command 🇮🇳</h1>
            <p className="admin-page-sub">
              Manage Indian toys with multiple images, specifications, variants, pricing, and bulk-import
            </p>
          </div>
          <div className="admin-header-actions">
            <button className="btn btn-outline" onClick={() => handleExportCatalog('json')} title="Export full catalog to JSON">
              <Download size={16} />
              <span>Export JSON</span>
            </button>
            <button className="btn btn-outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={16} />
              <span>Bulk Import</span>
            </button>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={18} />
              <span>Add New Toy</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="admin-prods-toolbar card">
          <form 
            onSubmit={(e) => { e.preventDefault(); loadProducts(); }}
            className="admin-search-wrap"
          >
            <Search size={16} className="text-muted" />
            <input
              type="text"
              placeholder="Search by title, SKU, brand, or category..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="admin-search-input"
            />
          </form>

          <div className="admin-filter-selects">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Categories</option>
              {TOY_CATEGORIES.slice(1).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Stock Statuses</option>
              <option value="low">Low Stock (&le; 5 units)</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table Card */}
        <div className="table-card card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product & SKUs</th>
                  <th>Category</th>
                  <th>Age Range</th>
                  <th>Price & Discounts</th>
                  <th>Variants & Media</th>
                  <th>Warehouse Stock</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {toys.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem' }}>
                      <Package size={40} className="text-muted" style={{ margin: '0 auto 1rem', display: 'block' }} />
                      <p style={{ fontWeight: 600 }}>No matching toys found in the database.</p>
                      <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleOpenAddModal}>
                        Add Your First Toy
                      </button>
                    </td>
                  </tr>
                ) : (
                  toys.map(toy => {
                    const discount = toy.originalPrice && toy.originalPrice > toy.price
                      ? Math.round(((toy.originalPrice - toy.price) / toy.originalPrice) * 100)
                      : 0;
                    const imagesCount = Array.isArray(toy.images) ? toy.images.length : (toy.image ? 1 : 0);
                    const variantsCount = Array.isArray(toy.variants) ? toy.variants.length : 0;

                    return (
                      <tr key={toy.id}>
                        <td>
                          <div className="prod-cell-flex">
                            <img 
                              src={toy.images?.[0] || toy.image} 
                              alt={toy.name} 
                              className="prod-cell-thumb" 
                            />
                            <div>
                              <strong className="prod-cell-name">{toy.name}</strong>
                              <span className="prod-cell-sku">
                                SKU: <code>{toy.sku}</code> • {toy.brand || 'ToyVerse India'}
                              </span>
                              {toy.isFeatured && <span className="cell-mini-badge badge-featured">Featured</span>}
                              {toy.isBestSeller && <span className="cell-mini-badge badge-bestseller">Best Seller</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{toy.category}</span>
                        </td>
                        <td>
                          <span className="badge badge-outline">{toy.ageGroup}</span>
                        </td>
                        <td>
                          <div className="price-stack">
                            <strong className="price-main">{formatINR(toy.price)}</strong>
                            {discount > 0 && (
                              <div className="discount-tag-wrap">
                                <span className="table-sub-date strikethrough">{formatINR(toy.originalPrice)}</span>
                                <span className="discount-pill">-{discount}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="media-variant-badges">
                            <span className="badge-count" title={`${imagesCount} photos in gallery`}>
                              <ImageIcon size={12} /> {imagesCount}
                            </span>
                            {variantsCount > 0 ? (
                              <span className="badge-count badge-variant" title={`${variantsCount} active variants`}>
                                <Layers size={12} /> {variantsCount} vars
                              </span>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>Standard</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="stock-stepper-cell">
                            <button 
                              className="stock-btn" 
                              onClick={() => handleStockAdjust(toy.id, -1)}
                              disabled={toy.stock <= 0}
                              title="Decrease 1 unit"
                            >-</button>
                            <span className={`stock-count-val ${toy.stock <= 5 ? 'stock-low' : ''}`}>
                              {toy.stock}
                            </span>
                            <button 
                              className="stock-btn" 
                              onClick={() => handleStockAdjust(toy.id, 1)}
                              title="Increase 1 unit"
                            >+</button>
                          </div>
                          {toy.stock <= 5 && toy.stock > 0 && (
                            <span className="low-stock-warning">Low stock</span>
                          )}
                          {toy.stock === 0 && (
                            <span className="out-of-stock-warning">Out of stock</span>
                          )}
                        </td>
                        <td>
                          <div className="table-row-actions">
                            <a 
                              href={`/product/${toy.id}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-icon btn-ghost" 
                              title="Preview on Storefront"
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button 
                              className="btn btn-icon btn-ghost" 
                              onClick={() => handleOpenEditModal(toy)} 
                              title="Full Product Editor"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="btn btn-icon btn-ghost text-danger" 
                              onClick={() => handleDeleteToy(toy.id, toy.name)} 
                              title="Delete Product"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COMPREHENSIVE ADD / EDIT PRODUCT MODAL                    */}
        {/* ========================================================= */}
        {isModalOpen && (
          <div className="modal-backdrop animate-fade-in">
            <div className="modal-dialog admin-modal-wide">
              {/* Modal Header */}
              <div className="modal-header-row">
                <div>
                  <h3 className="modal-title">
                    {editingToyId ? 'Edit Toy & Specifications' : 'Add New Toy to Indian Catalog'}
                  </h3>
                  <p className="modal-subtitle">
                    Configure titles, multiple gallery photos, Indian pricing (₹), BIS safety, variants & specs
                  </p>
                </div>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="modal-tabs-nav">
                <button 
                  className={`modal-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                  onClick={() => setActiveTab('general')}
                >
                  <Info size={16} />
                  <span>General & Pricing</span>
                </button>
                <button 
                  className={`modal-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
                  onClick={() => setActiveTab('media')}
                >
                  <ImageIcon size={16} />
                  <span>Photos ({formData.images.length})</span>
                </button>
                <button 
                  className={`modal-tab-btn ${activeTab === 'variants' ? 'active' : ''}`}
                  onClick={() => setActiveTab('variants')}
                >
                  <Layers size={16} />
                  <span>Variants ({formData.variants?.length || 0})</span>
                </button>
                <button 
                  className={`modal-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('specs')}
                >
                  <Sliders size={16} />
                  <span>BIS Specs & Features</span>
                </button>
              </div>

              <form onSubmit={handleSaveToy} className="modal-form-content">
                {/* ----------------- TAB 1: GENERAL & PRICING ----------------- */}
                {activeTab === 'general' && (
                  <div className="tab-pane animate-fade-in">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Toy Title *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="form-input"
                          placeholder="e.g. ISRO Gaganyaan Modular Space Habitat Kit"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SKU Code *</label>
                        <div className="input-with-button">
                          <input
                            type="text"
                            required
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            className="form-input"
                          />
                          <button 
                            type="button" 
                            className="btn btn-outline btn-sm"
                            onClick={() => setFormData({ ...formData, sku: `TY-IN-${Math.floor(100000 + Math.random() * 900000)}` })}
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="form-grid-3">
                      <div className="form-group">
                        <label className="form-label">Category *</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="form-select"
                        >
                          {TOY_CATEGORIES.slice(1).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Age Recommendation *</label>
                        <select
                          value={formData.ageGroup}
                          onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                          className="form-select"
                        >
                          {AGE_GROUPS.slice(1).map(ag => (
                            <option key={ag.id} value={ag.id}>{ag.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Brand Name</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          className="form-input"
                          placeholder="e.g. MythicPlay India"
                        />
                      </div>
                    </div>

                    <div className="pricing-box-card">
                      <div className="form-grid-3">
                        <div className="form-group">
                          <label className="form-label">Sale Price (₹ INR) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="form-input form-input-lg"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Original / MRP Price (₹ INR)</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.originalPrice}
                            onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                            className="form-input form-input-lg"
                            placeholder="Same as sale price if no discount"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Stock Units in Warehouse *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            className="form-input form-input-lg"
                          />
                        </div>
                      </div>

                      {discountPercentage > 0 && (
                        <div className="discount-calc-banner">
                          <Sparkles size={16} />
                          <span>Calculated Customer Discount: <strong>{discountPercentage}% OFF</strong> (Saves {formatINR((parseFloat(formData.originalPrice) || 0) - (parseFloat(formData.price) || 0))})</span>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Detailed Product Description</label>
                      <textarea
                        rows="4"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="form-textarea"
                        placeholder="Detailed narrative describing play pattern, educational benefits, BIS compliance..."
                      ></textarea>
                    </div>

                    <div className="badges-toggles-row">
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={formData.isFeatured} 
                          onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })} 
                        />
                        <span>Featured on Homepage</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={formData.isBestSeller} 
                          onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })} 
                        />
                        <span>Best Seller Badge</span>
                      </label>
                      <label className="checkbox-label">
                        <input 
                          type="checkbox" 
                          checked={formData.isNewArrival} 
                          onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })} 
                        />
                        <span>New Arrival Badge</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ----------------- TAB 2: MULTIPLE IMAGES ----------------- */}
                {activeTab === 'media' && (
                  <div className="tab-pane animate-fade-in">
                    <div className="form-group">
                      <label className="form-label">Add Image URL to Gallery</label>
                      <div className="input-with-button">
                        <input
                          type="url"
                          value={formData.newImageUrl}
                          onChange={(e) => setFormData({ ...formData, newImageUrl: e.target.value })}
                          className="form-input"
                          placeholder="https://images.unsplash.com/photo-..."
                        />
                        <button 
                          type="button" 
                          className="btn btn-primary"
                          onClick={handleAddImage}
                        >
                          <Plus size={16} />
                          <span>Add Image</span>
                        </button>
                      </div>
                      <span className="form-hint">Tip: The first image will be used as the primary catalog cover.</span>
                    </div>

                    <div className="images-preview-grid">
                      {formData.images.map((imgUrl, idx) => (
                        <div key={idx} className={`image-card-thumb ${idx === 0 ? 'primary-thumb' : ''}`}>
                          <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                          {idx === 0 && <span className="primary-badge">Primary Cover</span>}
                          <div className="image-card-actions">
                            {idx > 0 && (
                              <button 
                                type="button" 
                                className="thumb-action-btn"
                                onClick={() => handleSetPrimaryImage(idx)}
                                title="Make this image primary cover"
                              >
                                Set Primary
                              </button>
                            )}
                            <button 
                              type="button" 
                              className="thumb-action-btn text-danger"
                              onClick={() => handleRemoveImage(idx)}
                              title="Delete photo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {formData.images.length === 0 && (
                      <div className="empty-box-hint">
                        <ImageIcon size={32} className="text-muted" />
                        <p>No images added yet. Add at least 1 image URL for customer viewing.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------- TAB 3: VARIANTS ----------------- */}
                {activeTab === 'variants' && (
                  <div className="tab-pane animate-fade-in">
                    <div className="variants-header-row">
                      <div>
                        <h4 className="section-title">Toy Variants & Editions</h4>
                        <p className="form-hint">Provide color variations, bundled sets, or edition levels with distinct SKUs, prices, and inventory counts.</p>
                      </div>
                      <button type="button" className="btn btn-outline btn-sm" onClick={handleAddVariant}>
                        <Plus size={14} />
                        <span>Add Variant</span>
                      </button>
                    </div>

                    <div className="variants-list">
                      {(!formData.variants || formData.variants.length === 0) ? (
                        <div className="empty-box-hint">
                          <Layers size={32} className="text-muted" />
                          <p>No variants configured. This product sells as a single standard item.</p>
                          <button type="button" className="btn btn-outline btn-sm" onClick={handleAddVariant}>
                            Add Color or Size Variant
                          </button>
                        </div>
                      ) : (
                        formData.variants.map((v, idx) => (
                          <div key={v.id || idx} className="variant-row-card">
                            <div className="variant-field">
                              <label className="form-label-sm">Variant Name</label>
                              <input
                                type="text"
                                value={v.name}
                                onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                                className="form-input form-input-sm"
                                placeholder="e.g. Solar Yellow / Deluxe"
                              />
                            </div>
                            <div className="variant-field">
                              <label className="form-label-sm">Variant SKU</label>
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                                className="form-input form-input-sm"
                              />
                            </div>
                            <div className="variant-field" style={{ maxWidth: '120px' }}>
                              <label className="form-label-sm">Price (₹)</label>
                              <input
                                type="number"
                                value={v.price}
                                onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                                className="form-input form-input-sm"
                              />
                            </div>
                            <div className="variant-field" style={{ maxWidth: '90px' }}>
                              <label className="form-label-sm">Stock</label>
                              <input
                                type="number"
                                value={v.stock}
                                onChange={(e) => handleUpdateVariant(idx, 'stock', e.target.value)}
                                className="form-input form-input-sm"
                              />
                            </div>
                            <button 
                              type="button" 
                              className="btn btn-icon btn-ghost text-danger"
                              onClick={() => handleRemoveVariant(idx)}
                              title="Delete Variant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------- TAB 4: SPECS & FEATURES ----------------- */}
                {activeTab === 'specs' && (
                  <div className="tab-pane animate-fade-in">
                    {/* Key Specifications (Key-Value) */}
                    <div className="specs-section">
                      <h4 className="section-title">Product Specifications (BIS Safety & Dimensions)</h4>
                      <div className="spec-input-row">
                        <input
                          type="text"
                          placeholder="Spec Name (e.g. BIS License, Material, Dimensions)"
                          value={formData.newSpecKey}
                          onChange={(e) => setFormData({ ...formData, newSpecKey: e.target.value })}
                          className="form-input"
                        />
                        <input
                          type="text"
                          placeholder="Spec Value (e.g. IS-9873 Part 1 Certified, Pinewood)"
                          value={formData.newSpecValue}
                          onChange={(e) => setFormData({ ...formData, newSpecValue: e.target.value })}
                          className="form-input"
                        />
                        <button type="button" className="btn btn-outline" onClick={handleAddSpec}>
                          <Plus size={16} />
                          <span>Add Spec</span>
                        </button>
                      </div>

                      <div className="specs-table-card">
                        <table className="specs-preview-table">
                          <tbody>
                            {Object.entries(formData.specs || {}).map(([key, val]) => (
                              <tr key={key}>
                                <td style={{ width: '40%', fontWeight: 600 }}>{key}</td>
                                <td>{val}</td>
                                <td style={{ width: '40px', textAlign: 'right' }}>
                                  <button 
                                    type="button" 
                                    className="btn-remove-spec"
                                    onClick={() => handleRemoveSpec(key)}
                                    title="Remove spec"
                                  >
                                    <X size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Key Highlights / Features */}
                    <div className="features-section" style={{ marginTop: '1.5rem' }}>
                      <h4 className="section-title">Bullet Highlights & Features</h4>
                      <div className="input-with-button">
                        <input
                          type="text"
                          placeholder="Add bullet highlight (e.g. 100% splinter-free organic wood)..."
                          value={formData.newFeature}
                          onChange={(e) => setFormData({ ...formData, newFeature: e.target.value })}
                          className="form-input"
                        />
                        <button type="button" className="btn btn-outline" onClick={handleAddFeature}>
                          <Plus size={16} />
                          <span>Add Bullet</span>
                        </button>
                      </div>

                      <ul className="features-bullet-list">
                        {(formData.features || []).map((feat, idx) => (
                          <li key={idx} className="feature-bullet-item">
                            <span className="bullet-dot">•</span>
                            <span className="bullet-text">{feat}</span>
                            <button 
                              type="button" 
                              className="btn-remove-spec" 
                              onClick={() => handleRemoveFeature(idx)}
                            >
                              <X size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="modal-actions-bar">
                  <div className="tab-switcher-footer">
                    {activeTab !== 'general' && (
                      <button 
                        type="button" 
                        className="btn btn-ghost" 
                        onClick={() => {
                          const tabs = ['general', 'media', 'variants', 'specs'];
                          const currentIdx = tabs.indexOf(activeTab);
                          setActiveTab(tabs[currentIdx - 1]);
                        }}
                      >
                        Back
                      </button>
                    )}
                    {activeTab !== 'specs' && (
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => {
                          const tabs = ['general', 'media', 'variants', 'specs'];
                          const currentIdx = tabs.indexOf(activeTab);
                          setActiveTab(tabs[currentIdx + 1]);
                        }}
                      >
                        Next Section
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>

                  <div className="save-cancel-group">
                    <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Check size={16} />
                      <span>{editingToyId ? 'Save Changes' : 'Create Toy in Store'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BULK IMPORT MODAL                                         */}
        {/* ========================================================= */}
        {isImportModalOpen && (
          <div className="modal-backdrop animate-fade-in">
            <div className="modal-dialog admin-modal-wide">
              <div className="modal-header-row">
                <div>
                  <h3 className="modal-title">Bulk-Import Toys (JSON / CSV) 📦</h3>
                  <p className="modal-subtitle">Batch create or update hundreds of toys with images, specs, variants and pricing</p>
                </div>
                <button className="modal-close" onClick={() => setIsImportModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="bulk-import-body">
                {/* Format and Quick Sample Actions */}
                <div className="import-controls-row">
                  <div className="format-toggle-group">
                    <button 
                      className={`btn btn-sm ${importFormat === 'json' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setImportFormat('json')}
                    >
                      <FileCode size={14} />
                      <span>JSON Format</span>
                    </button>
                    <button 
                      className={`btn btn-sm ${importFormat === 'csv' ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setImportFormat('csv')}
                    >
                      <FileSpreadsheet size={14} />
                      <span>CSV Format</span>
                    </button>
                  </div>

                  <div className="quick-presets-group">
                    <button 
                      type="button" 
                      className="btn btn-outline btn-sm text-primary"
                      onClick={handleLoadSampleToys}
                      title="Load sample Indian ISRO and Heritage toys for testing"
                    >
                      <Sparkles size={14} />
                      <span>1-Click Test: Load Sample Toys</span>
                    </button>
                  </div>
                </div>

                {/* Import Status Alert */}
                {importStatus && (
                  <div className={`import-status-banner status-${importStatus.type} animate-fade-in`}>
                    {importStatus.type === 'success' && <Check size={18} />}
                    {importStatus.type === 'error' && <AlertTriangle size={18} />}
                    {importStatus.type === 'info' && <Info size={18} />}
                    <span>{importStatus.message}</span>
                  </div>
                )}

                {/* Import Textarea & File Upload */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Paste {importFormat.toUpperCase()} Data (or Select File):
                    </label>
                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      <Upload size={14} />
                      <span>Choose .csv / .json File</span>
                      <input 
                        type="file" 
                        accept=".csv,.json,text/csv,application/json" 
                        onChange={handleFileUpload}
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                  <textarea
                    rows="12"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="form-textarea code-editor-font"
                    placeholder={importFormat === 'json' 
                      ? '[\n  {\n    "name": "ISRO Lunar Rover STEM Kit",\n    "sku": "ISRO-ROV-01",\n    "category": "STEM & Learning",\n    "price": 2499,\n    "originalPrice": 2999,\n    "stock": 30,\n    "images": ["https://..."],\n    "specs": { "BIS": "IS-9873" },\n    "variants": [{ "name": "Standard", "sku": "ISRO-ROV-STD", "price": 2499, "stock": 30 }]\n  }\n]'
                      : 'name,sku,category,ageGroup,brand,price,originalPrice,stock,images,description\n"ISRO Space Rover",ISRO-01,"STEM & Learning","6-8 yrs","ISRO SpaceLab",2499,2999,30,"https://image1;https://image2","BIS certified space rover"'
                    }
                  ></textarea>
                </div>

                <div className="import-options-row">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={importUpdateExisting} 
                      onChange={(e) => setImportUpdateExisting(e.target.checked)} 
                    />
                    <span>Update existing toys if matching SKU is already in database</span>
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="modal-actions-bar">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsImportModalOpen(false)}>
                    Close
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleExecuteImport}
                    disabled={importing || !importText.trim()}
                  >
                    {importing ? (
                      <span>Importing to Database...</span>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Execute Bulk Import</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
