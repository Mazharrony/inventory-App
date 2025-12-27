import { Database } from "@/integrations/types";

type Products = Database['public']['Tables']['products']['Row'];
type Sales = Database['public']['Tables']['sales']['Row'];
type Sellers = Database['public']['Tables']['sellers']['Row'];
type Customers = Database['public']['Tables']['customers']['Row'];
type StockMovements = Database['public']['Tables']['stock_movements']['Row'];
type UndoLogs = Database['public']['Tables']['undo_logs']['Row'];

// Generate random date within last 30 days
const randomDate = (daysAgo: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date.toISOString();
};

// Generate demo products
export const generateDemoProducts = (): Products[] => {
  const productNames = [
    "Protein Powder - Vanilla 2kg",
    "Protein Powder - Chocolate 2kg",
    "Whey Protein - Strawberry 1kg",
    "Creatine Monohydrate 500g",
    "BCAA Powder - Fruit Punch 400g",
    "Pre-Workout Energy 300g",
    "Mass Gainer - Chocolate 3kg",
    "Multivitamin Tablets 60ct",
    "Omega-3 Fish Oil 120ct",
    "Vitamin D3 1000IU 60ct",
    "Zinc Supplements 50mg 90ct",
    "Magnesium Citrate 400mg 100ct",
    "Collagen Peptides 500g",
    "Glutamine Powder 500g",
    "Casein Protein - Vanilla 2kg",
    "Energy Bars - Mixed 12ct",
    "Protein Bars - Chocolate 12ct",
    "Amino Acids - 300 tablets",
    "Testosterone Booster 60ct",
    "Fat Burner Capsules 90ct",
  ];

  return productNames.map((name, index) => {
    const basePrice = 50 + Math.random() * 200;
    const stock = Math.floor(Math.random() * 100);
    return {
      id: `prod-${String(index + 1).padStart(3, '0')}`,
      name,
      upc: `1234567890${String(index + 1).padStart(3, '0')}`,
      price: Math.round(basePrice * 100) / 100,
      stock,
      created_at: randomDate(30 + index),
      updated_at: randomDate(Math.floor(Math.random() * 7)),
      is_active: true,
    };
  });
};

// Generate demo sellers
export const generateDemoSellers = (): Sellers[] => {
  const sellerNames = [
    "Ahmed Al-Mansoori",
    "Fatima Al-Zahra",
    "Mohammed Hassan",
    "Sarah Al-Khalifa",
    "Omar Al-Suwaidi",
  ];

  return sellerNames.map((name, index) => ({
    id: `seller-${String(index + 1).padStart(3, '0')}`,
    name,
    created_at: randomDate(60 + index),
    updated_at: randomDate(Math.floor(Math.random() * 30)),
  }));
};

// Generate demo customers
export const generateDemoCustomers = (): Customers[] => {
  const customerData = [
    { name: "Al-Futtaim Group", email: "contact@alfuttaim.ae", phone: "+971501234567", type: "B2B" },
    { name: "Emirates Airlines", email: "procurement@emirates.com", phone: "+971502345678", type: "B2B" },
    { name: "Dubai Mall Store", email: "store@dubaimall.ae", phone: "+971503456789", type: "B2B" },
    { name: "John Smith", email: "john.smith@email.com", phone: "+971504567890", type: "B2C" },
    { name: "Maria Garcia", email: "maria.g@email.com", phone: "+971505678901", type: "B2C" },
    { name: "David Lee", email: "david.lee@email.com", phone: "+971506789012", type: "B2C" },
    { name: "Fitness First UAE", email: "orders@fitnessfirst.ae", phone: "+971507890123", type: "B2B" },
    { name: "Gold's Gym Dubai", email: "supplies@goldsgym.ae", phone: "+971508901234", type: "B2B" },
  ];

  return customerData.map((customer, index) => ({
    id: index + 1,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    mobile: customer.phone,
    address: index < 3 ? `Business Address ${index + 1}, Dubai, UAE` : null,
    trn: index < 3 ? `TRN${String(1000000 + index).padStart(7, '0')}` : null,
    type: customer.type,
    created_at: randomDate(45 + index),
    updated_at: randomDate(Math.floor(Math.random() * 20)),
  }));
};

// Generate demo sales
export const generateDemoSales = (products: Products[], sellers: Sellers[]): Sales[] => {
  const sales: Sales[] = [];
  const paymentMethods = ["cash", "card", "bank_transfer", "credit"];
  const statuses = ["active", "active", "active", "active", "active", "deactivated"]; // Mostly active

  // Generate sales for the last 30 days
  for (let day = 0; day < 30; day++) {
    const salesPerDay = Math.floor(Math.random() * 15) + 5; // 5-20 sales per day
    
    for (let i = 0; i < salesPerDay; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const seller = sellers[Math.floor(Math.random() * sellers.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const price = product.price;
      const total = price * quantity;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const saleDate = randomDate(day);
      
      const sale: Sales = {
        id: `sale-${day}-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        upc: product.upc,
        product_name: product.name,
        product_id: product.id,
        price,
        quantity,
        total,
        seller_name: seller.name,
        user_id: seller.id,
        created_at: saleDate,
        recorded_at: saleDate,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status,
        deactivation_reason: status === "deactivated" ? "Customer return" : null,
        deactivated_at: status === "deactivated" ? randomDate(day - Math.floor(Math.random() * 5)) : null,
        customer_name: day % 3 === 0 ? `Customer ${Math.floor(Math.random() * 5) + 1}` : null,
        customer_mobile: day % 3 === 0 ? `+9715${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}` : null,
        invoice_number: day % 2 === 0 ? `INV-${String(1000 + day * 20 + i).padStart(6, '0')}` : null,
        invoice_type: day % 2 === 0 ? (day % 4 === 0 ? "tax" : "simple") : null,
        payment_reference: day % 4 === 0 ? `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : null,
        order_comment: day % 5 === 0 ? "Special order - please handle with care" : null,
      };
      
      sales.push(sale);
    }
  }

  return sales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

// Generate demo stock movements
export const generateDemoStockMovements = (products: Products[]): StockMovements[] => {
  const movements: StockMovements[] = [];
  const movementTypes = ["purchase", "adjustment", "return", "correction"];
  const createdBy = "admin-demo";

  products.forEach((product, index) => {
    // Add initial stock movement
    movements.push({
      id: index * 3 + 1,
      product_id: product.id,
      product_name: product.name,
      previous_stock: 0,
      new_stock: product.stock,
      quantity_added: product.stock,
      movement_type: "purchase",
      created_by: createdBy,
      created_at: randomDate(30 + index),
      notes: "Initial stock entry",
    });

    // Add some adjustments
    if (index % 3 === 0) {
      const adjustment = Math.floor(Math.random() * 20) - 10;
      movements.push({
        id: index * 3 + 2,
        product_id: product.id,
        product_name: product.name,
        previous_stock: product.stock,
        new_stock: Math.max(0, product.stock + adjustment),
        quantity_added: adjustment,
        movement_type: "adjustment",
        created_by: createdBy,
        created_at: randomDate(15 + index),
        notes: adjustment > 0 ? "Stock adjustment - increase" : "Stock adjustment - decrease",
      });
    }
  });

  return movements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

// Initialize all data
export const initializeDemoData = () => {
  const storageKey = 'jnk_demo_data';
  const isInitialized = localStorage.getItem('jnk_demo_initialized');
  
  if (isInitialized === 'true') {
    // Data already initialized, return existing data
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      return JSON.parse(existing);
    }
  }

  // Generate fresh data
  // Generate fresh demo data
  const products = generateDemoProducts();
  const sellers = generateDemoSellers();
  const customers = generateDemoCustomers();
  const sales = generateDemoSales(products, sellers);
  const stockMovements = generateDemoStockMovements(products);

  const demoData = {
    products,
    sellers,
    customers,
    sales,
    stockMovements,
    undoLogs: [] as UndoLogs[],
    initializedAt: new Date().toISOString(),
  };

  // Store in localStorage
  localStorage.setItem(storageKey, JSON.stringify(demoData));
  localStorage.setItem('jnk_demo_initialized', 'true');


  return demoData;
};

// Get data from storage
export const getDemoData = () => {
  const storageKey = 'jnk_demo_data';
  const data = localStorage.getItem(storageKey);
  if (data) {
    return JSON.parse(data);
  }
  return initializeDemoData();
};

// Save data to storage
export const saveDemoData = (data: ReturnType<typeof getDemoData>) => {
  const storageKey = 'jnk_demo_data';
  localStorage.setItem(storageKey, JSON.stringify(data));
};

