/**
 * Storage and Data Persistence Module for BOLETAS RITUALES
 * Handles LocalStorage, JSON Export/Import, CSV Export, and data normalization
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
  currency: 'COP',
  currencySymbol: '$',
  theme: 'neon', // neon (Carbon & Cyan), obsidian, emerald, sunset
  supabaseUrl: '',
  supabaseKey: '',
  cloudSyncEnabled: false
};

// Official initial inventory batches for Rituales Fest 2026
const INITIAL_INVENTORY = [
  {
    id: 'inv-combo-anytime',
    event: 'Rituales Fest 2026',
    category: 'COMBO ANYTIME',
    quantityBought: 13,
    costUnit: 260000,
    suggestedPrice: 380000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Lote oficial COMBO ANYTIME (13 boletas)'
  },
  {
    id: 'inv-combo-early',
    event: 'Rituales Fest 2026',
    category: 'COMBO EARLY',
    quantityBought: 12,
    costUnit: 220000,
    suggestedPrice: 320000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Lote oficial COMBO EARLY (12 boletas)'
  },
  {
    id: 'inv-combo-early-cat-c',
    event: 'Rituales Fest 2026',
    category: 'COMBO EARLY CAT C',
    quantityBought: 2,
    costUnit: 240000,
    suggestedPrice: 340000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Lote oficial COMBO EARLY CAT C (2 boletas)'
  },
  {
    id: 'inv-combo-vip-early',
    event: 'Rituales Fest 2026',
    category: 'COMBO VIP EARLY',
    quantityBought: 1,
    costUnit: 350000,
    suggestedPrice: 480000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Lote oficial COMBO VIP EARLY (1 boleta)'
  },
  {
    id: 'inv-combo-early-catc-cata',
    event: 'Rituales Fest 2026',
    category: 'COMBO EARLY CATC (CAT A)',
    quantityBought: 1,
    costUnit: 260000,
    suggestedPrice: 370000,
    location: 'Medellín - Parque Norte',
    date: '2026-11-01',
    notes: 'Lote oficial COMBO EARLY CATC (CAT A) (1 boleta)'
  }
];

const INITIAL_SALES = [
  {
    id: 'sale-001',
    consecutive: 1,
    inventoryId: 'inv-combo-anytime',
    event: 'Rituales Fest 2026',
    category: 'COMBO ANYTIME',
    quantity: 2,
    costUnit: 260000,
    salePriceUnit: 380000,
    totalCost: 520000,
    totalSale: 760000,
    profit: 240000,
    profitSantiago: 120000,
    profitSebas: 120000,
    customerName: 'Camila Restrepo',
    customerPhone: '3124567890',
    saleDate: '2026-09-25T14:30',
    paymentStatus: 'pagado',
    amountPaid: 760000,
    liquidationStatus: 'liquidado',
    notes: 'Transferencia Bancolombia verificada por Sebas'
  },
  {
    id: 'sale-002',
    consecutive: 2,
    inventoryId: 'inv-combo-early',
    event: 'Rituales Fest 2026',
    category: 'COMBO EARLY',
    quantity: 2,
    costUnit: 220000,
    salePriceUnit: 320000,
    totalCost: 440000,
    totalSale: 640000,
    profit: 200000,
    profitSantiago: 100000,
    profitSebas: 100000,
    customerName: 'Mateo Gómez (DJ Teo)',
    customerPhone: '3008976543',
    saleDate: '2026-09-28T18:15',
    paymentStatus: 'pagado',
    amountPaid: 640000,
    liquidationStatus: 'liquidado',
    notes: 'Pagó por Nequi'
  },
  {
    id: 'sale-003',
    consecutive: 3,
    inventoryId: 'inv-combo-early-cat-c',
    event: 'Rituales Fest 2026',
    category: 'COMBO EARLY CAT C',
    quantity: 1,
    costUnit: 240000,
    salePriceUnit: 350000,
    totalCost: 240000,
    totalSale: 350000,
    profit: 110000,
    profitSantiago: 55000,
    profitSebas: 55000,
    customerName: 'Valentina Osorio',
    customerPhone: '3157778899',
    saleDate: '2026-10-01T20:00',
    paymentStatus: 'abono',
    amountPaid: 200000,
    liquidationStatus: 'pendiente',
    notes: 'Debe $150.000 para pagar antes del viernes'
  }
];

// Helper to repair common UTF-8 mojibake in strings
function cleanEncoding(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/MedellÃ­n/g, 'Medellín')
    .replace(/GÃ³mez/g, 'Gómez')
    .replace(/PagÃ³/g, 'Pagó')
    .replace(/CategorÃ­a/g, 'Categoría')
    .replace(/UbicaciÃ³n/g, 'Ubicación')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ');
}

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

  // Normalize inventory items
  normalizeInventoryList(items) {
    if (!Array.isArray(items)) return [...INITIAL_INVENTORY];
    return items.map(item => ({
      ...item,
      event: cleanEncoding(item.event || 'Rituales Fest 2026'),
      category: cleanEncoding(item.category || 'GENERAL'),
      location: cleanEncoding(item.location || ''),
      notes: cleanEncoding(item.notes || '')
    }));
  }

  // Normalize sales items
  normalizeSalesList(sales) {
    if (!Array.isArray(sales)) return [];
    return sales.map(s => {
      const totalSale = Number(s.totalSale) || 0;
      let amountPaid = s.amountPaid !== undefined ? Number(s.amountPaid) : totalSale;
      let paymentStatus = s.paymentStatus || 'pagado';

      // If marked 'pendiente' (and not 'abono'), if amountPaid was accidentally saved equal to totalSale, set amountPaid to 0
      if (paymentStatus === 'pendiente' && amountPaid >= totalSale && totalSale > 0) {
        amountPaid = 0;
      } else if (paymentStatus === 'pendiente' && amountPaid > 0 && amountPaid < totalSale) {
        paymentStatus = 'abono';
      } else if (paymentStatus === 'pagado') {
        amountPaid = totalSale;
      }

      return {
        ...s,
        event: cleanEncoding(s.event || ''),
        category: cleanEncoding(s.category || ''),
        customerName: cleanEncoding(s.customerName || ''),
        notes: cleanEncoding(s.notes || ''),
        paymentStatus,
        amountPaid
      };
    });
  }

  // Inventory CRUD
  loadInventory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
        return [...INITIAL_INVENTORY];
      }

      let items = this.normalizeInventoryList(JSON.parse(data));
      let needsSave = false;
      INITIAL_INVENTORY.forEach(initItem => {
        const found = items.find(i => i.category.trim().toUpperCase() === initItem.category.trim().toUpperCase());
        if (!found) {
          items.unshift(initItem);
          needsSave = true;
        }
      });

      if (needsSave) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
      }
      return items;
    } catch (e) {
      console.error('Error loading inventory', e);
      return [...INITIAL_INVENTORY];
    }
  }

  saveInventory(inventory) {
    this.inventory = this.normalizeInventoryList(inventory);
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(this.inventory));
  }

  addInventoryItem(item) {
    const newItem = {
      id: 'inv-' + Date.now(),
      event: cleanEncoding(item.event.trim()),
      category: cleanEncoding(item.category.trim()),
      quantityBought: parseInt(item.quantityBought, 10) || 0,
      costUnit: parseFloat(item.costUnit) || 0,
      suggestedPrice: parseFloat(item.suggestedPrice) || 0,
      location: cleanEncoding(item.location || ''),
      date: item.date || new Date().toISOString().split('T')[0],
      notes: cleanEncoding(item.notes || '')
    };
    this.inventory.push(newItem);
    this.saveInventory(this.inventory);
    if (window.sync) window.sync.notifyChange(`Nuevo lote: ${newItem.event} - ${newItem.category}`);
    return newItem;
  }

  updateInventoryItem(id, updatedFields) {
    const index = this.inventory.findIndex(item => item.id === id);
    if (index !== -1) {
      this.inventory[index] = { ...this.inventory[index], ...updatedFields };
      this.saveInventory(this.inventory);
      if (window.sync) window.sync.notifyChange(`Actualizado lote: ${this.inventory[index].category}`);
      return this.inventory[index];
    }
    return null;
  }

  deleteInventoryItem(id) {
    this.inventory = this.inventory.filter(item => item.id !== id);
    this.saveInventory(this.inventory);
    if (window.sync) window.sync.notifyChange('Eliminado lote de inventario');
  }

  // Sales CRUD
  loadSales() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
        return [...INITIAL_SALES];
      }
      return this.normalizeSalesList(JSON.parse(data));
    } catch (e) {
      console.error('Error loading sales', e);
      return [];
    }
  }

  saveSales(sales) {
    this.sales = this.normalizeSalesList(sales);
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

    const paymentStatus = saleData.paymentStatus || 'pagado';
    let amountPaid = totalSale;
    if (paymentStatus === 'pendiente') {
      amountPaid = 0;
    } else if (paymentStatus === 'abono') {
      const parsedPaid = parseFloat(saleData.amountPaid);
      amountPaid = (!isNaN(parsedPaid) && parsedPaid >= 0) ? Math.min(totalSale, parsedPaid) : Math.round(totalSale / 2);
    }

    const newSale = {
      id: 'sale-' + Date.now(),
      consecutive: this.getNextConsecutive(),
      inventoryId: saleData.inventoryId || '',
      event: cleanEncoding(saleData.event || 'Evento General'),
      category: cleanEncoding(saleData.category || 'General'),
      quantity: qty,
      costUnit: costUnit,
      salePriceUnit: saleUnit,
      totalCost: totalCost,
      totalSale: totalSale,
      profit: profit,
      profitSantiago: profit * splitRatio1,
      profitSebas: profit * splitRatio2,
      customerName: cleanEncoding(saleData.customerName || 'Cliente Particular'),
      customerPhone: saleData.customerPhone || '',
      saleDate: saleData.saleDate || new Date().toISOString(),
      paymentStatus: paymentStatus,
      amountPaid: amountPaid,
      liquidationStatus: saleData.liquidationStatus || 'pendiente',
      notes: cleanEncoding(saleData.notes || '')
    };

    this.sales.unshift(newSale);
    this.saveSales(this.sales);
    if (window.sync) window.sync.notifyChange(`Nueva venta #${newSale.consecutive} a ${newSale.customerName}`);
    return newSale;
  }

  updateSale(id, updatedFields) {
    const index = this.sales.findIndex(s => s.id === id);
    if (index !== -1) {
      const current = this.sales[index];
      const merged = { ...current, ...updatedFields };

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

      if (merged.paymentStatus === 'pagado') {
        merged.amountPaid = merged.totalSale;
      } else if (merged.paymentStatus === 'pendiente') {
        merged.amountPaid = 0;
      }

      this.sales[index] = merged;
      this.saveSales(this.sales);
      if (window.sync) window.sync.notifyChange(`Actualizada venta #${merged.consecutive}`);
      return merged;
    }
    return null;
  }

  deleteSale(id) {
    const sale = this.sales.find(s => s.id === id);
    const cons = sale ? sale.consecutive : '';
    this.sales = this.sales.filter(s => s.id !== id);
    this.saveSales(this.sales);
    if (window.sync) window.sync.notifyChange(`Eliminada venta #${cons}`);
  }

  // Calculate sold quantity for a specific inventory item
  getSoldQuantityForInventory(inventoryId) {
    return this.sales
      .filter(s => s.inventoryId === inventoryId)
      .reduce((sum, s) => sum + (Number(s.quantity) || 1), 0);
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
      'Saldo Pendiente',
      'Estado Liquidación',
      'Notas'
    ];

    const rows = this.sales.map(s => {
      const totalSale = Number(s.totalSale) || 0;
      const paid = s.paymentStatus === 'pagado' ? totalSale : (s.paymentStatus === 'pendiente' ? 0 : (Number(s.amountPaid) || 0));
      const balance = Math.max(0, totalSale - paid);
      return [
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
        totalSale,
        s.profit,
        s.profitSantiago,
        s.profitSebas,
        s.paymentStatus,
        paid,
        balance,
        s.liquidationStatus,
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ];
    });

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
