/**
 * Sales Management Module for BOLETAS RITUALES
 * Handles sales list, responsive cards/tables, live filters, sorting, quick status toggles,
 * and WhatsApp receipts
 */

class SalesManager {
  constructor() {
    this.filterSearch = '';
    this.filterPayment = 'all';
    this.filterLiquidation = 'all';
    this.filterEvent = 'all';
    this.filterProfitRange = 'all'; // all, positive, negative
    this.sortBy = 'consecutive-desc'; // consecutive-desc, consecutive-asc, name-asc, name-desc, profit-desc, profit-asc, date-desc
    this.selectedSaleForEdit = null;
  }

  // Format currency
  formatMoney(num) {
    return '$' + (Number(num) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  // Format Date
  formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  // Filter & Sort Sales
  getFilteredSales() {
    let sales = [...window.storage.sales];

    // Text search (Customer name, phone, event, category, notes, consecutive)
    if (this.filterSearch) {
      const q = this.filterSearch.toLowerCase().trim();
      sales = sales.filter(s => {
        const cName = (s.customerName || '').toLowerCase();
        const cPhone = (s.customerPhone || '').toLowerCase();
        const ev = (s.event || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        const consec = '#' + s.consecutive;
        return cName.includes(q) || cPhone.includes(q) || ev.includes(q) || cat.includes(q) || notes.includes(q) || consec.includes(q);
      });
    }

    // Payment Filter
    if (this.filterPayment !== 'all') {
      sales = sales.filter(s => s.paymentStatus === this.filterPayment);
    }

    // Liquidation Filter
    if (this.filterLiquidation !== 'all') {
      sales = sales.filter(s => s.liquidationStatus === this.filterLiquidation);
    }

    // Event Filter
    if (this.filterEvent !== 'all') {
      sales = sales.filter(s => s.event === this.filterEvent);
    }

    // Profit Filter (positive / negative)
    if (this.filterProfitRange === 'positive') {
      sales = sales.filter(s => Number(s.profit) >= 0);
    } else if (this.filterProfitRange === 'negative') {
      sales = sales.filter(s => Number(s.profit) < 0);
    }

    // Sorting
    sales.sort((a, b) => {
      switch (this.sortBy) {
        case 'consecutive-desc':
          return (b.consecutive || 0) - (a.consecutive || 0);
        case 'consecutive-asc':
          return (a.consecutive || 0) - (b.consecutive || 0);
        case 'name-asc':
          return (a.customerName || '').localeCompare(b.customerName || '');
        case 'name-desc':
          return (b.customerName || '').localeCompare(a.customerName || '');
        case 'event-asc':
          return (a.event || '').localeCompare(b.event || '');
        case 'profit-desc':
          return (Number(b.profit) || 0) - (Number(a.profit) || 0);
        case 'profit-asc':
          return (Number(a.profit) || 0) - (Number(b.profit) || 0);
        case 'sale-desc':
          return (Number(b.totalSale) || 0) - (Number(a.totalSale) || 0);
        case 'sale-asc':
          return (Number(a.totalSale) || 0) - (Number(b.totalSale) || 0);
        case 'date-desc':
          return new Date(b.saleDate || 0) - new Date(a.saleDate || 0);
        case 'date-asc':
          return new Date(a.saleDate || 0) - new Date(b.saleDate || 0);
        default:
          return 0;
      }
    });

    return sales;
  }

  // Populate Event Filter options dynamically
  populateEventFilters() {
    const select = document.getElementById('filter-event-select');
    if (!select) return;

    const eventsSet = new Set();
    window.storage.sales.forEach(s => { if (s.event) eventsSet.add(s.event); });
    window.storage.inventory.forEach(i => { if (i.event) eventsSet.add(i.event); });

    const currentVal = this.filterEvent;
    select.innerHTML = '<option value="all">🎪 Todos los Eventos</option>';

    Array.from(eventsSet).sort().forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev;
      opt.textContent = ev;
      if (ev === currentVal) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // Quick toggle payment status
  togglePaymentStatus(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    let nextStatus = 'pagado';
    let newPaidAmount = sale.totalSale;

    if (sale.paymentStatus === 'pagado') {
      nextStatus = 'pendiente';
      newPaidAmount = 0;
    } else if (sale.paymentStatus === 'pendiente') {
      nextStatus = 'abono';
      newPaidAmount = Math.round(sale.totalSale / 2);
    } else {
      nextStatus = 'pagado';
      newPaidAmount = sale.totalSale;
    }

    window.storage.updateSale(saleId, {
      paymentStatus: nextStatus,
      amountPaid: newPaidAmount
    });

    window.ui.showToast(`Estado de pago actualizado: ${nextStatus.toUpperCase()}`, 'info');
    this.render();
    window.dashboard.update();
  }

  // Quick toggle liquidation status (liquidado entre Santiago y Sebas)
  toggleLiquidationStatus(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    const nextStatus = sale.liquidationStatus === 'liquidado' ? 'pendiente' : 'liquidado';
    window.storage.updateSale(saleId, { liquidationStatus: nextStatus });

    const p1 = window.storage.settings.partner1 || 'Santiago';
    const p2 = window.storage.settings.partner2 || 'Sebas';

    window.ui.showToast(
      nextStatus === 'liquidado'
        ? `¡Venta #${sale.consecutive} marcada como liquidada a ${p1} & ${p2}!`
        : `Venta #${sale.consecutive} marcada como pendiente por liquidar`,
      nextStatus === 'liquidado' ? 'success' : 'warning'
    );

    this.render();
    window.dashboard.update();
  }

  // Open WhatsApp with prefilled professional ticket receipt
  sendWhatsAppReceipt(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    const p1 = window.storage.settings.partner1 || 'Santiago';
    const p2 = window.storage.settings.partner2 || 'Sebas';

    let cleanPhone = (sale.customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
      cleanPhone = '57' + cleanPhone; // Colombia country code
    }

    const isPaid = sale.paymentStatus === 'pagado';
    const statusText = isPaid ? '✅ PAGADO COMPLETAMENTE' : (sale.paymentStatus === 'abono' ? `⚠️ ABONADO: ${this.formatMoney(sale.amountPaid)} (Saldo: ${this.formatMoney(sale.totalSale - sale.amountPaid)})` : '⏳ PENDIENTE DE PAGO');

    const message = `✨ *COMPROBANTE DE VENTA BOLETAS - ${sale.event.toUpperCase()}* ✨\n\n` +
      `🎫 *Consecutivo:* #VENTA-${String(sale.consecutive).padStart(4, '0')}\n` +
      `👤 *Cliente:* ${sale.customerName}\n` +
      `🎪 *Evento:* ${sale.event}\n` +
      `🏷️ *Categoría:* ${sale.category}\n` +
      `🔢 *Cantidad:* ${sale.quantity} boleta(s)\n` +
      `💵 *Precio Total:* ${this.formatMoney(sale.totalSale)}\n` +
      `📌 *Estado:* ${statusText}\n` +
      (sale.notes ? `📝 *Detalles:* ${sale.notes}\n` : '') +
      `\n🤝 Gestionado por *${p1} & ${p2}*.\n` +
      `¡Nos vemos en la pista! 🎧⚡`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  }

  // Render the list of sales
  render() {
    this.populateEventFilters();
    const filteredSales = this.getFilteredSales();
    const settings = window.storage.settings;
    const p1 = settings.partner1 || 'Santiago';
    const p2 = settings.partner2 || 'Sebas';

    // Update Counter badge
    const counterEl = document.getElementById('sales-count-badge');
    if (counterEl) {
      const totalProfitFiltered = filteredSales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);
      counterEl.textContent = `${filteredSales.length} ventas | Ganancia acumulada: ${this.formatMoney(totalProfitFiltered)}`;
    }

    // Desktop Table Body
    const tableBody = document.getElementById('sales-table-body');
    // Mobile Cards Container
    const mobileContainer = document.getElementById('sales-mobile-cards');

    if (!filteredSales.length) {
      const emptyHtml = `
        <div class="p-8 text-center text-slate-400">
          <div class="text-4xl mb-3">🔍</div>
          <p class="font-semibold text-base">No se encontraron ventas con estos filtros</p>
          <p class="text-xs text-slate-500 mt-1">Prueba cambiando la búsqueda o restableciendo los filtros.</p>
        </div>
      `;
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="9">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = emptyHtml;
      return;
    }

    // Build Desktop Rows
    if (tableBody) {
      tableBody.innerHTML = filteredSales.map(s => {
        const isPos = (Number(s.profit) || 0) >= 0;
        const profitClass = isPos ? 'text-emerald-400' : 'text-rose-400';
        const profitSign = isPos ? '+' : '';

        // Status badge colors
        let paymentBadgeClass = 'badge-paid';
        let paymentText = 'Pagado';
        if (s.paymentStatus === 'pendiente') {
          paymentBadgeClass = 'badge-pending';
          paymentText = 'Pendiente';
        } else if (s.paymentStatus === 'abono') {
          paymentBadgeClass = 'badge-pending';
          paymentText = `Abono (${this.formatMoney(s.amountPaid)})`;
        }

        const liqBadgeClass = s.liquidationStatus === 'liquidado' ? 'badge-liquidated' : 'badge-unliquidated';
        const liqText = s.liquidationStatus === 'liquidado' ? 'Liquidado' : 'Por Liquidar';

        return `
          <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition text-sm">
            <td class="py-3.5 px-4 font-mono font-bold text-violet-400">
              #${String(s.consecutive).padStart(3, '0')}
            </td>
            <td class="py-3.5 px-4">
              <div class="font-semibold text-white">${s.customerName}</div>
              <div class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                ${s.customerPhone ? `<span class="font-mono">${s.customerPhone}</span>` : '<span class="italic text-slate-600">Sin teléfono</span>'}
                ${s.customerPhone ? `
                  <button onclick="window.sales.sendWhatsAppReceipt('${s.id}')" title="Enviar WhatsApp" class="text-emerald-400 hover:text-emerald-300">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.288.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.308c-.087.096-.178.201-.077.375.101.174.45 0.742.965 1.202.663.591 1.222.774 1.396.861.174.087.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.044.072.044.419-.1 0.824z"/></svg>
                  </button>
                ` : ''}
              </div>
            </td>
            <td class="py-3.5 px-4">
              <div class="font-medium text-slate-200">${s.event}</div>
              <div class="text-xs text-purple-300/80 font-mono">${s.category} (x${s.quantity})</div>
            </td>
            <td class="py-3.5 px-4 text-right font-mono">
              <div class="text-slate-400 text-xs line-through">${this.formatMoney(s.totalCost)}</div>
              <div class="text-white font-bold">${this.formatMoney(s.totalSale)}</div>
            </td>
            <td class="py-3.5 px-4 text-right font-mono">
              <div class="font-bold ${profitClass}">${profitSign}${this.formatMoney(s.profit)}</div>
              <div class="text-[11px] text-cyan-400">${p1}: ${this.formatMoney(s.profitSantiago)}</div>
              <div class="text-[11px] text-pink-400">${p2}: ${this.formatMoney(s.profitSebas)}</div>
            </td>
            <td class="py-3.5 px-4 text-center">
              <button onclick="window.sales.togglePaymentStatus('${s.id}')" title="Clic para cambiar estado de pago" class="badge ${paymentBadgeClass} cursor-pointer hover:opacity-80 transition">
                ${paymentText}
              </button>
            </td>
            <td class="py-3.5 px-4 text-center">
              <button onclick="window.sales.toggleLiquidationStatus('${s.id}')" title="Clic para cambiar estado de liquidación" class="badge ${liqBadgeClass} cursor-pointer hover:opacity-80 transition">
                ${liqText}
              </button>
            </td>
            <td class="py-3.5 px-4 text-center">
              <div class="flex items-center justify-center gap-1.5">
                <button onclick="window.sales.sendWhatsAppReceipt('${s.id}')" class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Compartir comprobante">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                </button>
                <button onclick="window.sales.openEditModal('${s.id}')" class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Editar venta">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="window.sales.deleteSaleConfirm('${s.id}')" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Eliminar venta">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Build Mobile Cards
    if (mobileContainer) {
      mobileContainer.innerHTML = filteredSales.map(s => {
        const isPos = (Number(s.profit) || 0) >= 0;
        const profitClass = isPos ? 'text-emerald-400' : 'text-rose-400';
        const profitSign = isPos ? '+' : '';

        let paymentBadgeClass = s.paymentStatus === 'pagado' ? 'badge-paid' : 'badge-pending';
        let paymentText = s.paymentStatus === 'pagado' ? 'Pagado' : (s.paymentStatus === 'abono' ? `Abono (${this.formatMoney(s.amountPaid)})` : 'Pendiente');
        const liqBadgeClass = s.liquidationStatus === 'liquidado' ? 'badge-liquidated' : 'badge-unliquidated';
        const liqText = s.liquidationStatus === 'liquidado' ? 'Liquidado' : 'Por Liquidar';

        return `
          <div class="glass-card p-4 space-y-3 relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-violet-400 text-sm bg-violet-950/50 px-2 py-0.5 rounded border border-violet-800/40">
                #${String(s.consecutive).padStart(3, '0')}
              </span>
              <div class="flex items-center gap-1.5">
                <button onclick="window.sales.togglePaymentStatus('${s.id}')" class="badge ${paymentBadgeClass} text-xs">
                  ${paymentText}
                </button>
                <button onclick="window.sales.toggleLiquidationStatus('${s.id}')" class="badge ${liqBadgeClass} text-xs">
                  ${liqText}
                </button>
              </div>
            </div>

            <div>
              <div class="text-xs text-violet-300 font-medium tracking-wide uppercase">${s.event}</div>
              <div class="text-base font-bold text-white">${s.customerName}</div>
              <div class="text-xs text-slate-400 flex items-center justify-between mt-0.5">
                <span>${s.category} <b class="text-white">(x${s.quantity})</b></span>
                <span class="font-mono text-slate-500">${this.formatDate(s.saleDate)}</span>
              </div>
            </div>

            <div class="bg-black/30 p-2.5 rounded-xl border border-white/5 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div class="text-slate-400">Total Venta:</div>
                <div class="font-mono font-bold text-white text-sm">${this.formatMoney(s.totalSale)}</div>
                <div class="text-slate-500 text-[10px]">Costo: ${this.formatMoney(s.totalCost)}</div>
              </div>
              <div class="text-right">
                <div class="text-slate-400">Ganancia Neta:</div>
                <div class="font-mono font-bold text-sm ${profitClass}">${profitSign}${this.formatMoney(s.profit)}</div>
                <div class="text-[10px] space-x-1 mt-0.5">
                  <span class="text-cyan-400">${p1.slice(0, 4)}: ${this.formatMoney(s.profitSantiago)}</span>
                  <span class="text-pink-400">${p2.slice(0, 4)}: ${this.formatMoney(s.profitSebas)}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-white/5">
              <div class="text-xs text-slate-400 truncate max-w-[160px]">
                ${s.notes || (s.customerPhone ? `📞 ${s.customerPhone}` : 'Sin notas')}
              </div>
              <div class="flex items-center gap-1.5">
                <button onclick="window.sales.sendWhatsAppReceipt('${s.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                  <span>WhatsApp</span>
                </button>
                <button onclick="window.sales.openEditModal('${s.id}')" class="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="window.sales.deleteSaleConfirm('${s.id}')" class="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Open Add Sale Modal
  openAddModal() {
    this.selectedSaleForEdit = null;
    const form = document.getElementById('form-sale');
    if (!form) return;
    form.reset();

    const titleEl = document.getElementById('modal-sale-title');
    if (titleEl) titleEl.textContent = 'Registrar Nueva Venta 🎟️';

    // Prefill consecutive
    const nextCons = window.storage.getNextConsecutive();
    const consInput = document.getElementById('sale-consecutive-preview');
    if (consInput) consInput.value = `#${String(nextCons).padStart(4, '0')}`;

    // Populate inventory select
    this.populateInventorySelect();

    // Default date to now
    const now = new Date();
    const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const dateInput = document.getElementById('sale-date');
    if (dateInput) dateInput.value = nowLocal;

    // Reset live preview cards
    this.updateModalLiveCalculation();

    window.ui.openModal('modal-sale');
  }

  // Open Edit Sale Modal
  openEditModal(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    this.selectedSaleForEdit = sale;
    this.populateInventorySelect(sale.inventoryId);

    const titleEl = document.getElementById('modal-sale-title');
    if (titleEl) titleEl.textContent = `Editar Venta #${String(sale.consecutive).padStart(3, '0')}`;

    const consInput = document.getElementById('sale-consecutive-preview');
    if (consInput) consInput.value = `#${String(sale.consecutive).padStart(4, '0')}`;

    // Fill fields
    document.getElementById('sale-customer-name').value = sale.customerName || '';
    document.getElementById('sale-customer-phone').value = sale.customerPhone || '';
    document.getElementById('sale-event').value = sale.event || '';
    document.getElementById('sale-category').value = sale.category || '';
    document.getElementById('sale-quantity').value = sale.quantity || 1;
    document.getElementById('sale-cost-unit').value = sale.costUnit || 0;
    document.getElementById('sale-price-unit').value = sale.salePriceUnit || 0;
    document.getElementById('sale-payment-status').value = sale.paymentStatus || 'pagado';
    document.getElementById('sale-amount-paid').value = sale.amountPaid !== undefined ? sale.amountPaid : sale.totalSale;
    document.getElementById('sale-liquidation-status').value = sale.liquidationStatus || 'pendiente';
    document.getElementById('sale-notes').value = sale.notes || '';

    if (sale.saleDate) {
      document.getElementById('sale-date').value = sale.saleDate.slice(0, 16);
    }

    this.updateModalLiveCalculation();
    window.ui.openModal('modal-sale');
  }

  // Populate inventory dropdown in sale modal
  populateInventorySelect(selectedId = '') {
    const select = document.getElementById('sale-inventory-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Seleccionar desde Inventario (Autocompleta) --</option>';

    window.storage.inventory.forEach(inv => {
      const sold = window.storage.getSoldQuantityForInventory(inv.id);
      const remaining = Math.max(0, inv.quantityBought - sold);
      const opt = document.createElement('option');
      opt.value = inv.id;
      opt.textContent = `${inv.event} - ${inv.category} (Stock: ${remaining} disp. | Costo: ${this.formatMoney(inv.costUnit)})`;
      if (inv.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // Auto-fill form when user selects an inventory item
  onInventorySelected(invId) {
    if (!invId) return;
    const item = window.storage.inventory.find(i => i.id === invId);
    if (!item) return;

    document.getElementById('sale-event').value = item.event;
    document.getElementById('sale-category').value = item.category;
    document.getElementById('sale-cost-unit').value = item.costUnit;
    if (item.suggestedPrice) {
      document.getElementById('sale-price-unit').value = item.suggestedPrice;
    }

    this.updateModalLiveCalculation();
  }

  // Live calculation of profits inside modal while user types
  updateModalLiveCalculation() {
    const qty = parseInt(document.getElementById('sale-quantity')?.value, 10) || 1;
    const costUnit = parseFloat(document.getElementById('sale-cost-unit')?.value) || 0;
    const saleUnit = parseFloat(document.getElementById('sale-price-unit')?.value) || 0;

    const totalCost = costUnit * qty;
    const totalSale = saleUnit * qty;
    const profit = totalSale - totalCost;

    const s1 = (window.storage.settings.split1 || 50) / 100;
    const s2 = (window.storage.settings.split2 || 50) / 100;
    const profitP1 = profit * s1;
    const profitP2 = profit * s2;

    const previewSale = document.getElementById('preview-total-sale');
    const previewCost = document.getElementById('preview-total-cost');
    const previewProfit = document.getElementById('preview-profit');
    const previewP1 = document.getElementById('preview-profit-p1');
    const previewP2 = document.getElementById('preview-profit-p2');

    if (previewSale) previewSale.textContent = this.formatMoney(totalSale);
    if (previewCost) previewCost.textContent = this.formatMoney(totalCost);
    if (previewProfit) {
      previewProfit.textContent = (profit >= 0 ? '+' : '') + this.formatMoney(profit);
      previewProfit.className = `font-mono font-bold text-base ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (previewP1) previewP1.textContent = `${window.storage.settings.partner1 || 'Santiago'}: ${this.formatMoney(profitP1)}`;
    if (previewP2) previewP2.textContent = `${window.storage.settings.partner2 || 'Sebas'}: ${this.formatMoney(profitP2)}`;
  }

  // Save Sale (Create or Update)
  saveSaleFromModal() {
    const invSelect = document.getElementById('sale-inventory-select');
    const inventoryId = invSelect ? invSelect.value : '';

    const customerName = document.getElementById('sale-customer-name')?.value.trim();
    if (!customerName) {
      window.ui.showToast('Por favor escribe el nombre de la persona que compró', 'warning');
      return;
    }

    const event = document.getElementById('sale-event')?.value.trim();
    const category = document.getElementById('sale-category')?.value.trim();
    if (!event || !category) {
      window.ui.showToast('Por favor especifica el evento y la categoría', 'warning');
      return;
    }

    const qty = parseInt(document.getElementById('sale-quantity')?.value, 10) || 1;
    const costUnit = parseFloat(document.getElementById('sale-cost-unit')?.value) || 0;
    const salePriceUnit = parseFloat(document.getElementById('sale-price-unit')?.value) || 0;
    const paymentStatus = document.getElementById('sale-payment-status')?.value || 'pagado';
    let amountPaid = parseFloat(document.getElementById('sale-amount-paid')?.value);
    if (isNaN(amountPaid)) amountPaid = salePriceUnit * qty;

    const liquidationStatus = document.getElementById('sale-liquidation-status')?.value || 'pendiente';
    const customerPhone = document.getElementById('sale-customer-phone')?.value.trim() || '';
    const saleDate = document.getElementById('sale-date')?.value || new Date().toISOString();
    const notes = document.getElementById('sale-notes')?.value.trim() || '';

    const saleData = {
      inventoryId,
      customerName,
      customerPhone,
      event,
      category,
      quantity: qty,
      costUnit,
      salePriceUnit,
      paymentStatus,
      amountPaid,
      liquidationStatus,
      saleDate,
      notes
    };

    if (this.selectedSaleForEdit) {
      window.storage.updateSale(this.selectedSaleForEdit.id, saleData);
      window.ui.showToast('Venta actualizada correctamente', 'success');
    } else {
      window.storage.addSale(saleData);
      window.ui.showToast('🎉 ¡Venta registrada exitosamente!', 'success');
      if (typeof confetti === 'function') {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      }
    }

    window.ui.closeModal('modal-sale');
    this.render();
    window.dashboard.update();
  }

  // Delete sale with confirmation
  deleteSaleConfirm(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    if (confirm(`¿Estás seguro de que deseas eliminar la venta #${sale.consecutive} de ${sale.customerName}?`)) {
      window.storage.deleteSale(saleId);
      window.ui.showToast(`Venta #${sale.consecutive} eliminada`, 'info');
      this.render();
      window.dashboard.update();
    }
  }
}

window.sales = new SalesManager();
