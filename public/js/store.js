// Store — product & order persistence via localStorage
const Store = (() => {
  const PRODUCTS_KEY = 'dripvault_products';
  const ORDERS_KEY = 'dripvault_orders';

  // ── Products ──────────────────────────────────────────────

  function getProducts() {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  function getVisibleProducts() {
    return getProducts().filter(p => p.visible);
  }

  function getProduct(id) {
    return getProducts().find(p => p.id === id) || null;
  }

  function createProduct(data) {
    const products = getProducts();
    const product = {
      id: 'p_' + Date.now(),
      name: data.name,
      price: parseFloat(data.price),
      description: data.description || '',
      category: data.category || '',
      image: data.image || null,
      visible: data.visible !== false,
      createdAt: new Date().toISOString(),
    };
    products.push(product);
    saveProducts(products);
    return product;
  }

  function updateProduct(id, data) {
    const products = getProducts();
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...data, id };
    saveProducts(products);
    return products[idx];
  }

  function deleteProduct(id) {
    const products = getProducts().filter(p => p.id !== id);
    saveProducts(products);
  }

  function toggleVisibility(id) {
    const p = getProduct(id);
    if (!p) return;
    updateProduct(id, { visible: !p.visible });
  }

  // ── Orders ────────────────────────────────────────────────

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function createOrder(customerData, cartItems) {
    const orders = getOrders();
    const order = {
      id: 'ord_' + Date.now(),
      customer: customerData,
      items: cartItems,
      total: cartItems.reduce((s, i) => s + i.price * i.qty, 0),
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return order;
  }

  return {
    getProducts,
    getVisibleProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleVisibility,
    getOrders,
    createOrder,
  };
})();
