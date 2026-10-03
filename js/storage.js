/**
 * Storage and Data Persistence Module for BOLETAS RITUALES
 * Handles LocalStorage, JSON Export/Import, CSV Export, and optional Supabase sync
 */

const STORAGE_KEYS = {
  SALES: 'rituales_sales_v1',
  INVENTORY: 'rituales_inventory_v1',
  SETTINGS: 'rituales_settings_v1',
  LAST_SYNC: 'rituales_last_sync_v1'
};

// Default initial settings
const DEFAULT_SETTINGS = {
  partner1: 'Santiago',
  partner2: 'Sebas',
  split1: 50, // Percentage
  split2: 50,
  currency: 'COP', // COP, USD, EUR
  currencySymbol: '$',
  theme: 'neon', // neon, sunset, emerald, obsidian
  supabaseUrl: '',
  supabaseKey: '',
  cloudSyncEnabled: false
};

// Realistic sample seed data for electronic music festivals
const INITIAL_INVENTORY = [
  {
    id: 'inv-1',
    event: 'Rituales Fest 2026',
    category: 'VIP Early Bird',
    quantityBought: 20,
    costUnit: 280000,
    suggestedPrice: 380000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Compradas en preventa bancaria'
  },
  {
    id: 'inv-2',
    event: 'Rituales Fest 2026',
    category: 'General Combo 2 Días',
    quantityBought: 30,
    costUnit: 210000,
    suggestedPrice: 290000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Etapa 1'
  },
  {
    id: 'inv-3',
    event: 'Afterlife Medellín',
    category: 'VIP Individual',
    quantityBought: 15,
    costUnit: 350000,
    suggestedPrice: 480000,
    location: 'Estadio Cincuentenario',
    date: '2026-10-18',
    notes: 'Tale of Us / Anyma'
  },
  {
    id: 'inv-4',
    event: 'Baum Festival Bogotá',
    category: 'Backstage Experience',
    quantityBought: 6,
    costUnit: 600000,
    suggestedPrice: 850000,
    location: 'Corferias Bogotá',
    date: '2026-05-24',
    notes: 'Acceso total y tarima'
  }
];

const INITIAL_SALES = [
  {
    id: 'sale-001',
    consecutive: 1,
    inventoryId: 'inv-1',
    event: 'Rituales Fest 2026',
    category: 'VIP Early Bird',
    quantity: 2,
    costUnit: 280000,
    salePriceUnit: 390000,
    totalCost: 560000,
    totalSale: 780000,
    profit: 220000,
    profitSantiago: 110000,
    profitSebas: 110000,
    customerName: 'Camila Restrepo',
    customerPhone: '3124567890',
    saleDate: '2026-09-25T14:30',
    paymentStatus: 'pagado', // pagado, pendiente, abono
    amountPaid: 780000,
    liquidationStatus: 'liquidado', // liquidado, pendiente
    notes: 'Transferencia Bancolombia verificada por Sebas'
  },
  {
    id: 'sale-002',
    consecutive: 2,
    inventoryId: 'inv-2',
    event: 'Rituales Fest 2026',
    category: 'General Combo 2 Días',
    quantity: 4,
    costUnit: 210000,
    salePriceUnit: 295000,
    totalCost: 840000,
    totalSale: 1180000,
    profit: 340000,
    profitSantiago: 170000,
    profitSebas: 170000,
    customerName: 'Mateo Gómez (DJ Teo)',
    customerPhone: '3008976543',
    saleDate: '2026-09-28T18:15',
    paymentStatus: 'pagado',
    amountPaid: 1180000,
    liquidationStatus: 'liquidado',
    notes: 'Pagó por Nequi'
  },
  {
    id: 'sale-003',
    consecutive: 3,
    inventoryId: 'inv-3',
    event: 'Afterlife Medellín',
    category: 'VIP Individual',
    quantity: 2,
    costUnit: 350000,
    salePriceUnit: 500000,
    totalCost: 700000,
    totalSale: 1000000,
    profit: 300000,
    profitSantiago: 150000,
    profitSebas: 150000,
    customerName: 'Valentina Osorio',
    customerPhone: '3157778899',
    saleDate: '2026-10-01T20:00',
    paymentStatus: 'pendiente',
    amountPaid: 500000, // Abonó la mitad
    liquidationStatus: 'pendiente',
    notes: 'Debe $500.000 para pagar antes del viernes'
  },
  {
    id: 'sale-004',
    consecutive: 4,
    inventoryId: 'inv-4',
    event: 'Baum Festival Bogotá',
    category: 'Backstage Experience',
    quantity: 1,
    costUnit: 600000,
    salePriceUnit: 870000,
    totalCost: 600000,
    totalSale: 870000,
    profit: 270000,
    profitSantiago: 135000,
    profitSebas: 135000,
    customerName: 'Andrés Felipe Correa',
    customerPhone: '3104443322',
    saleDate: '2026-10-02T11:45',
    paymentStatus: 'pagado',
    amountPaid: 870000,
    liquidationStatus: 'pendiente',
    notes: 'Falta cuadrar liquidación entre Santiago y Sebas'
  }
];

class StorageManager {
  constructor() {
    this.settings = this.loadSettings();
    this.inventory = this.loadInventory();
    this.sales = this.loadSales();
  }

  // Load or initialize settings
  loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Error loading settings', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
  }

  // Inventory CRUD
  loadInventory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
        return [...INITIAL_INVENTORY];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading inventory', e);
      return [];
    }
  }

  saveInventory(inventory) {
    this.inventory = inventory;
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(this.inventory));
  }

  addInventoryItem(item) {
    const newItem = {
      id: 'inv-' + Date.now(),
      event: item.event.trim(),
      category: item.category.trim(),
      quantityBought: parseInt(item.quantityBought, 10) || 0,
      costUnit: parseFloat(item.costUnit) || 0,
      suggestedPrice: parseFloat(item.suggestedPrice) || 0,
      location: item.location || '',
      date: item.date || new Date().toISOString().split('T')[0],
      notes: item.notes || ''
    };
    this.inventory.push(newItem);
    this.saveInventory(this.inventory);
    return newItem;
  }

  updateInventoryItem(id, updatedFields) {
    const index = this.inventory.findIndex(item => item.id === id);
    if (index !== -1) {
      this.inventory[index] = { ...this.inventory[index], ...updatedFields };
      this.saveInventory(this.inventory);
      return this.inventory[index];
    }
    return null;
  }

  deleteInventoryItem(id) {
    this.inventory = this.inventory.filter(item => item.id !== id);
    this.saveInventory(this.inventory);
  }

  // Sales CRUD
  loadSales() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
        return [...INITIAL_SALES];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading sales', e);
      return [];
    }
  }

  saveSales(sales) {
    this.sales = sales;
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(this.sales));
  }

  getNextConsecutive() {
    if (!this.sales.length) return 1;
    const maxConsecutive = Math.max(...this.sales.map(s => s.consecutive || 0));
    return maxConsecutive + 1;
  }

  addSale(saleData) {
    const qty = parseInt(saleData.quantity, 10) || 1;
    const costUnit = parseFloat(saleData.costUnit) || 0;
    const saleUnit = parseFloat(saleData.salePriceUnit) || 0;
    const totalCost = costUnit * qty;
    const totalSale = saleUnit * qty;
    const profit = totalSale - totalCost;
    
    const splitRatio1 = (this.settings.split1 || 50) / 100;
    const splitRatio2 = (this.settings.split2 || 50) / 100;

    const newSale = {
      id: 'sale-' + Date.now(),
      consecutive: this.getNextConsecutive(),
      inventoryId: saleData.inventoryId || '',
      event: saleData.event || 'Evento General',
      category: saleData.category || 'General',
      quantity: qty,
      costUnit: costUnit,
      salePriceUnit: saleUnit,
      totalCost: totalCost,
      totalSale: totalSale,
      profit: profit,
      profitSantiago: profit * splitRatio1,
      profitSebas: profit * splitRatio2,
      customerName: saleData.customerName || 'Cliente Particular',
      customerPhone: saleData.customerPhone || '',
      saleDate: saleData.saleDate || new Date().toISOString(),
      paymentStatus: saleData.paymentStatus || 'pagado',
      amountPaid: parseFloat(saleData.amountPaid) >= 0 ? parseFloat(saleData.amountPaid) : totalSale,
      liquidationStatus: saleData.liquidationStatus || 'pendiente',
      notes: saleData.notes || ''
    };

    this.sales.unshift(newSale);
    this.saveSales(this.sales);
    return newSale;
  }

  updateSale(id, updatedFields) {
    const index = this.sales.findIndex(s => s.id === id);
    if (index !== -1) {
      const current = this.sales[index];
      const merged = { ...current, ...updatedFields };

      // Recalculate financial figures if quantity or prices changed
      const qty = parseInt(merged.quantity, 10) || 1;
      const costUnit = parseFloat(merged.costUnit) || 0;
      const saleUnit = parseFloat(merged.salePriceUnit) || 0;
      merged.totalCost = costUnit * qty;
      merged.totalSale = saleUnit * qty;
      merged.profit = merged.totalSale - merged.totalCost;

      const splitRatio1 = (this.settings.split1 || 50) / 100;
      const splitRatio2 = (this.settings.split2 || 50) / 100;
      merged.profitSantiago = merged.profit * splitRatio1;
      merged.profitSebas = merged.profit * splitRatio2;

      this.sales[index] = merged;
      this.saveSales(this.sales);
      return merged;
    }
    return null;
  }

  deleteSale(id) {
    this.sales = this.sales.filter(s => s.id !== id);
    this.saveSales(this.sales);
  }

  // Calculate sold quantity for a specific inventory item
  getSoldQuantityForInventory(inventoryId) {
    return this.sales
      .filter(s => s.inventoryId === inventoryId)
      .reduce((sum, s) => sum + (s.quantity || 1), 0);
  }

  // Export all data as JSON file
  exportBackupJSON() {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      settings: this.settings,
      inventory: this.inventory,
      sales: this.sales
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boletas-rituales-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import JSON backup
  importBackupJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.inventory && Array.isArray(data.inventory)) {
        this.saveInventory(data.inventory);
      }
      if (data.sales && Array.isArray(data.sales)) {
        this.saveSales(data.sales);
      }
      if (data.settings && typeof data.settings === 'object') {
        this.saveSettings(data.settings);
      }
      return true;
    } catch (e) {
      console.error('Invalid JSON file', e);
      return false;
    }
  }

  // Export Sales to CSV (Excel compatible)
  exportSalesCSV() {
    if (!this.sales.length) return false;
    const p1 = this.settings.partner1 || 'Santiago';
    const p2 = this.settings.partner2 || 'Sebas';

    const headers = [
      'Consecutivo',
      'Fecha',
      'Evento',
      'Categoría',
      'Cantidad',
      'Cliente',
      'Teléfono',
      'Precio Compra Unit',
      'Precio Venta Unit',
      'Total Costo',
      'Total Venta',
      'Ganancia Neta',
      `Ganancia ${p1}`,
      `Ganancia ${p2}`,
      'Estado Pago',
      'Valor Pagado',
      'Estado Liquidación',
      'Notas'
    ];

    const rows = this.sales.map(s => [
      s.consecutive,
      s.saleDate ? s.saleDate.replace('T', ' ') : '',
      `"${(s.event || '').replace(/"/g, '""')}"`,
      `"${(s.category || '').replace(/"/g, '""')}"`,
      s.quantity,
      `"${(s.customerName || '').replace(/"/g, '""')}"`,
      `"${s.customerPhone || ''}"`,
      s.costUnit,
      s.salePriceUnit,
      s.totalCost,
      s.totalSale,
      s.profit,
      s.profitSantiago,
      s.profitSebas,
      s.paymentStatus,
      s.amountPaid,
      s.liquidationStatus,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-rituales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  // Reset to factory demo data
  resetDemoData() {
    this.saveSettings(DEFAULT_SETTINGS);
    this.saveInventory(INITIAL_INVENTORY);
    this.saveSales(INITIAL_SALES);
  }
}

// Global instance
window.storage = new StorageManager();
