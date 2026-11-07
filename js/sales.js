/**
 * Sales Management Module for BOLETAS RITUALES
 * Handles sales list, responsive cards/tables, live filters, quick presets,
 * payment balance calculation, digital receipt preview modal, and WhatsApp integration
 */

class SalesManager {
  constructor() {
    this.filterSearch = '';
    this.filterPayment = 'all'; // all, pagado, pendiente, abono, unpaid
    this.filterLiquidation = 'all';
    this.filterEvent = 'all';
    this.filterProfitRange = 'all'; // all, positive, negative
    this.sortBy = 'consecutive-desc';
    this.activePreset = 'all';
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

  // Apply quick filter preset from pills
  applyQuickPreset(preset) {
    this.activePreset = preset;

    if (preset === 'all') {
      this.filterPayment = 'all';
      this.filterLiquidation = 'all';
    } else if (preset === 'unpaid') {
      this.filterPayment = 'unpaid'; // matches both pendiente and abono
      this.filterLiquidation = 'all';
    } else if (preset === 'unliquidated') {
      this.filterPayment = 'all';
      this.filterLiquidation = 'pendiente';
    } else if (preset === 'paid') {
      this.filterPayment = 'pagado';
      this.filterLiquidation = 'all';
    }

    // Sync select dropdowns
    const paySelect = document.getElementById('filter-payment-select');
    if (paySelect) {
      paySelect.value = (this.filterPayment === 'unpaid') ? 'all' : this.filterPayment;
    }
    const liqSelect = document.getElementById('filter-liquidation-select');
    if (liqSelect) {
      liqSelect.value = this.filterLiquidation;
    }

    this.updatePresetPillsUI();
    this.render();
  }

  updatePresetPillsUI() {
    document.querySelectorAll('[data-sales-preset]').forEach(btn => {
      const p = btn.getAttribute('data-sales-preset');
      if (p === this.activePreset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Calculate effective paid and pending amounts for a sale
  getSalePaymentBreakdown(sale) {
    const totalSale = Number(sale.totalSale) || 0;
    let paid = totalSale;
    if (sale.paymentStatus === 'pendiente') {
      paid = 0;
    } else if (sale.paymentStatus === 'abono') {
      paid = Math.min(totalSale, Math.max(0, Number(sale.amountPaid) || 0));
    }
    const pending = Math.max(0, totalSale - paid);
    return { totalSale, paid, pending };
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
    if (this.filterPayment === 'unpaid') {
      sales = sales.filter(s => s.paymentStatus === 'pendiente' || s.paymentStatus === 'abono');
    } else if (this.filterPayment !== 'all') {
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
    select.innerHTML = '<option value="all">Todos los Eventos</option>';

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

    window.ui.showToast(`Estado de pago #${sale.consecutive}: ${nextStatus.toUpperCase()}`, 'info');
    this.render();
    window.dashboard.update();
    if (window.ui) window.ui.renderCustomers();
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
        ? `Venta #${sale.consecutive} liquidada entre ${p1} y ${p2}`
        : `Venta #${sale.consecutive} marcada como pendiente por liquidar`,
      nextStatus === 'liquidado' ? 'success' : 'warning'
    );

    this.render();
    window.dashboard.update();
  }

  // Build formatted text receipt for WhatsApp / Clipboard
  buildReceiptText(sale) {
    const p1 = window.storage.settings.partner1 || 'Santiago';
    const p2 = window.storage.settings.partner2 || 'Sebas';
    const { totalSale, paid, pending } = this.getSalePaymentBreakdown(sale);

    const statusText = sale.paymentStatus === 'pagado'
      ? '✅ PAGADO TOTAL'
      : (sale.paymentStatus === 'abono'
        ? `💵 ABONO: ${this.formatMoney(paid)} (Saldo pendiente: ${this.formatMoney(pending)})`
        : `⏳ PENDIENTE DE PAGO (${this.formatMoney(totalSale)})`);

    return `✨ *COMPROBANTE DE BOLETAS — ${sale.event.toUpperCase()}* ✨\n\n` +
      `🎫 *Consecutivo:* #VENTA-${String(sale.consecutive).padStart(4, '0')}\n` +
      `👤 *Titular:* ${sale.customerName}\n` +
      `🎪 *Evento:* ${sale.event}\n` +
      `🏷️ *Localidad:* ${sale.category}\n` +
      `🔢 *Cantidad:* ${sale.quantity} boleta(s)\n` +
      `💵 *Valor Total:* ${this.formatMoney(totalSale)}\n` +
      `📌 *Estado:* ${statusText}\n` +
      (sale.notes ? `📝 *Notas:* ${sale.notes}\n` : '') +
      `\n🤝 *Gestionado por ${p1} & ${p2}*\n` +
      `¡Nos vemos en el ritual! 🎧⚡`;
  }

  // Open Digital Ticket Receipt Preview Modal
  openReceiptModal(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    const container = document.getElementById('receipt-modal-body');
    if (!container) return;

    const p1 = window.storage.settings.partner1 || 'Santiago';
    const p2 = window.storage.settings.partner2 || 'Sebas';
    const { totalSale, paid, pending } = this.getSalePaymentBreakdown(sale);

    const badgeClass = sale.paymentStatus === 'pagado' ? 'badge-paid' : 'badge-pending';
    const badgeLabel = sale.paymentStatus === 'pagado' ? 'PAGADO TOTAL' : (sale.paymentStatus === 'abono' ? 'ABONO PARCIAL' : 'PENDIENTE DE PAGO');

    container.innerHTML = `
      <div class="ticket-pass p-5 space-y-4">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">RITUALES TICKETS HUB</div>
            <h4 class="text-base font-extrabold text-white mt-0.5">${sale.event}</h4>
          </div>
          <span class="font-mono text-xs font-bold bg-white/10 text-white px-2.5 py-1 rounded-md border border-white/10">
            #${String(sale.consecutive).padStart(4, '0')}
          </span>
        </div>

        <div class="bg-black/40 rounded-xl p-3.5 border border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
          <div>
            <div class="text-slate-400 text-[11px]">Comprador</div>
            <div class="font-bold text-white text-sm mt-0.5">${sale.customerName}</div>
            ${sale.customerPhone ? `<div class="font-mono text-[11px] text-slate-400">${sale.customerPhone}</div>` : ''}
          </div>
          <div class="text-right">
            <div class="text-slate-400 text-[11px]">Categoría / Lote</div>
            <div class="font-bold text-cyan-300 text-sm mt-0.5">${sale.category}</div>
            <div class="font-mono text-[11px] text-white">${sale.quantity} boleta(s)</div>
          </div>
        </div>

        <div class="ticket-divider"></div>

        <div class="space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Valor Unitario:</span>
            <span class="font-mono text-slate-200">${this.formatMoney(sale.salePriceUnit)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Total Venta:</span>
            <span class="font-mono font-bold text-white text-base">${this.formatMoney(totalSale)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Valor Pagado:</span>
            <span class="font-mono font-semibold text-emerald-400">${this.formatMoney(paid)}</span>
          </div>
          ${pending > 0 ? `
            <div class="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              <span class="text-amber-300 font-semibold">Saldo Pendiente:</span>
              <span class="font-mono font-bold text-amber-400">${this.formatMoney(pending)}</span>
            </div>
          ` : ''}
        </div>

        <div class="pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <span class="text-[11px] text-slate-400">Por <b class="text-slate-200">${p1} & ${p2}</b></span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2.5 mt-4">
        <button type="button" onclick="window.sales.copyReceiptToClipboard('${sale.id}')" class="btn-secondary text-xs py-2.5">
          Copiar Texto
        </button>
        <button type="button" onclick="window.sales.sendWhatsAppReceipt('${sale.id}')" class="btn-primary text-xs py-2.5">
          Enviar por WhatsApp
        </button>
      </div>
    `;

    window.ui.openModal('modal-receipt');
  }

  copyReceiptToClipboard(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;
    const text = this.buildReceiptText(sale);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        window.ui.showToast('Comprobante copiado al portapapeles', 'success');
      });
    }
  }

  // Open WhatsApp with prefilled professional ticket receipt
  sendWhatsAppReceipt(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    let cleanPhone = (sale.customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
      cleanPhone = '57' + cleanPhone;
    }

    const message = this.buildReceiptText(sale);
    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  }

  // Render the list of sales
  render() {
    this.populateEventFilters();
    this.updatePresetPillsUI();
    const filteredSales = this.getFilteredSales();
    const settings = window.storage.settings;
    const p1 = settings.partner1 || 'Santiago';
    const p2 = settings.partner2 || 'Sebas';

    // Calculate filtered summary totals
    let sumTickets = 0;
    let sumRevenue = 0;
    let sumProfit = 0;
    let sumPending = 0;

    filteredSales.forEach(s => {
      const { totalSale, pending } = this.getSalePaymentBreakdown(s);
      sumTickets += (Number(s.quantity) || 1);
      sumRevenue += totalSale;
      sumProfit += (Number(s.profit) || 0);
      sumPending += pending;
    });

    // Update Summary Strip
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('sales-summary-tickets', `${sumTickets} ${sumTickets === 1 ? 'boleta' : 'boletas'}`);
    setEl('sales-summary-revenue', this.formatMoney(sumRevenue));
    setEl('sales-summary-profit', (sumProfit >= 0 ? '+' : '') + this.formatMoney(sumProfit));
    setEl('sales-summary-pending', this.formatMoney(sumPending));

    // Update Counter badge
    const counterEl = document.getElementById('sales-count-badge');
    if (counterEl) {
      counterEl.textContent = `Mostrando ${filteredSales.length} de ${window.storage.sales.length} ventas registradas • Utilidad acumulada: ${this.formatMoney(sumProfit)}`;
    }

    // Desktop Table Body & Mobile Cards Container
    const tableBody = document.getElementById('sales-table-body');
    const mobileContainer = document.getElementById('sales-mobile-cards');

    if (!filteredSales.length) {
      const emptyHtml = `
        <div class="p-10 text-center text-slate-400">
          <p class="font-bold text-white text-sm">No se encontraron ventas con estos filtros</p>
          <p class="text-xs text-slate-500 mt-1">Prueba cambiando la búsqueda o seleccionando "Todas" arriba.</p>
          <button onclick="window.sales.applyQuickPreset('all'); document.getElementById('sales-search-input').value = ''; window.sales.filterSearch = ''; window.sales.render();" class="btn-secondary text-xs py-1.5 px-3 mt-3">
            Limpiar Filtros
          </button>
        </div>
      `;
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="8">${emptyHtml}</td></tr>`;
      if (mobileContainer) mobileContainer.innerHTML = `<div class="glass-card">${emptyHtml}</div>`;
      return;
    }

    // Build Desktop Rows
    if (tableBody) {
      tableBody.innerHTML = filteredSales.map(s => {
        const isPos = (Number(s.profit) || 0) >= 0;
        const profitClass = isPos ? 'text-emerald-400' : 'text-rose-400';
        const profitSign = isPos ? '+' : '';
        const { totalSale, paid, pending } = this.getSalePaymentBreakdown(s);

        let paymentBadgeClass = 'badge-paid';
        let paymentText = 'Pagado';
        if (s.paymentStatus === 'pendiente') {
          paymentBadgeClass = 'badge-pending';
          paymentText = `Debe ${this.formatMoney(pending)}`;
        } else if (s.paymentStatus === 'abono') {
          paymentBadgeClass = 'badge-pending';
          paymentText = `Abono (${this.formatMoney(paid)})`;
        }

        const liqBadgeClass = s.liquidationStatus === 'liquidado' ? 'badge-liquidated' : 'badge-unliquidated';
        const liqText = s.liquidationStatus === 'liquidado' ? 'Liquidado' : 'Por Liquidar';

        return `
          <tr class="text-sm">
            <td class="font-mono font-bold text-cyan-400 text-xs">
              #${String(s.consecutive).padStart(3, '0')}
              <div class="text-[10px] font-normal text-slate-500 mt-0.5">${this.formatDate(s.saleDate)}</div>
            </td>
            <td>
              <div class="font-bold text-white">${s.customerName}</div>
              <div class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                ${s.customerPhone ? `<span class="font-mono">${s.customerPhone}</span>` : '<span class="text-slate-600">Sin teléfono</span>'}
                ${s.notes ? `<span class="text-slate-500 truncate max-w-[160px]" title="${s.notes}">• ${s.notes}</span>` : ''}
              </div>
            </td>
            <td>
              <div class="font-bold text-slate-100 text-xs">${s.category} <span class="text-cyan-400 font-mono">(x${s.quantity})</span></div>
              <div class="text-[11px] text-slate-400">${s.event}</div>
            </td>
            <td class="text-right font-mono">
              <div class="text-white font-bold">${this.formatMoney(totalSale)}</div>
              <div class="text-slate-500 text-[11px]">Costo: ${this.formatMoney(s.totalCost)}</div>
            </td>
            <td class="text-right font-mono">
              <div class="font-bold ${profitClass}">${profitSign}${this.formatMoney(s.profit)}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">
                <span class="text-sky-400">${p1.slice(0, 4)}: ${this.formatMoney(s.profitSantiago)}</span> •
                <span class="text-amber-400">${p2.slice(0, 4)}: ${this.formatMoney(s.profitSebas)}</span>
              </div>
            </td>
            <td class="text-center">
              <button onclick="window.sales.togglePaymentStatus('${s.id}')" title="Clic para alternar estado de pago" class="badge ${paymentBadgeClass} cursor-pointer hover:opacity-85 transition">
                ${paymentText}
              </button>
            </td>
            <td class="text-center">
              <button onclick="window.sales.toggleLiquidationStatus('${s.id}')" title="Clic para marcar como liquidado o pendiente" class="badge ${liqBadgeClass} cursor-pointer hover:opacity-85 transition">
                ${liqText}
              </button>
            </td>
            <td class="text-right">
              <div class="flex items-center justify-end gap-1">
                <button onclick="window.sales.openReceiptModal('${s.id}')" class="p-1.5 rounded-lg bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.1] transition" title="Ver comprobante digital">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
                </button>
                <button onclick="window.sales.sendWhatsAppReceipt('${s.id}')" class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition" title="Enviar comprobante por WhatsApp">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.288.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.308c-.087.096-.178.201-.077.375.101.174.45 0.742.965 1.202.663.591 1.222.774 1.396.861.174.087.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.044.072.044.419-.1 0.824z"/></svg>
                </button>
                <button onclick="window.sales.openEditModal('${s.id}')" class="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition" title="Editar venta">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="window.sales.deleteSaleConfirm('${s.id}')" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition" title="Eliminar venta">
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
        const { totalSale, paid, pending } = this.getSalePaymentBreakdown(s);

        let paymentBadgeClass = s.paymentStatus === 'pagado' ? 'badge-paid' : 'badge-pending';
        let paymentText = s.paymentStatus === 'pagado' ? 'Pagado' : (s.paymentStatus === 'abono' ? `Abono (${this.formatMoney(paid)})` : `Debe ${this.formatMoney(pending)}`);
        const liqBadgeClass = s.liquidationStatus === 'liquidado' ? 'badge-liquidated' : 'badge-unliquidated';
        const liqText = s.liquidationStatus === 'liquidado' ? 'Liquidado' : 'Por Liquidar';

        return `
          <div class="glass-card p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-cyan-400 text-xs bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/25">
                #${String(s.consecutive).padStart(3, '0')}
              </span>
              <div class="flex items-center gap-1.5">
                <button onclick="window.sales.togglePaymentStatus('${s.id}')" class="badge ${paymentBadgeClass}">
                  ${paymentText}
                </button>
                <button onclick="window.sales.toggleLiquidationStatus('${s.id}')" class="badge ${liqBadgeClass}">
                  ${liqText}
                </button>
              </div>
            </div>

            <div>
              <div class="text-base font-bold text-white">${s.customerName}</div>
              <div class="text-xs text-slate-400 flex items-center justify-between mt-0.5">
                <span><b class="text-cyan-300">${s.category}</b> (x${s.quantity})</span>
                <span class="font-mono text-slate-500 text-[11px]">${this.formatDate(s.saleDate)}</span>
              </div>
            </div>

            <div class="bg-black/35 p-3 rounded-xl border border-white/[0.05] grid grid-cols-2 gap-2 text-xs">
              <div>
                <div class="text-slate-400 text-[11px]">Total Venta:</div>
                <div class="font-mono font-bold text-white text-sm">${this.formatMoney(totalSale)}</div>
                <div class="text-slate-500 text-[10px] font-mono">Costo: ${this.formatMoney(s.totalCost)}</div>
              </div>
              <div class="text-right">
                <div class="text-slate-400 text-[11px]">Utilidad Neta:</div>
                <div class="font-mono font-bold text-sm ${profitClass}">${profitSign}${this.formatMoney(s.profit)}</div>
                <div class="text-[10px] font-mono space-x-1 mt-0.5">
                  <span class="text-sky-400">${p1.slice(0, 4)}: ${this.formatMoney(s.profitSantiago)}</span>
                  <span class="text-amber-400">${p2.slice(0, 4)}: ${this.formatMoney(s.profitSebas)}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              <div class="text-xs text-slate-400 truncate max-w-[150px]">
                ${s.notes || (s.customerPhone ? `Tel: ${s.customerPhone}` : s.event)}
              </div>
              <div class="flex items-center gap-1.5">
                <button onclick="window.sales.openReceiptModal('${s.id}')" class="px-2.5 py-1 rounded-lg bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] text-xs font-semibold">
                  Ticket
                </button>
                <button onclick="window.sales.sendWhatsAppReceipt('${s.id}')" class="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold">
                  WhatsApp
                </button>
                <button onclick="window.sales.openEditModal('${s.id}')" class="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="window.sales.deleteSaleConfirm('${s.id}')" class="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
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
    if (titleEl) titleEl.textContent = 'Registrar Nueva Venta';

    const nextCons = window.storage.getNextConsecutive();
    const consInput = document.getElementById('sale-consecutive-preview');
    if (consInput) consInput.value = `#${String(nextCons).padStart(4, '0')}`;

    this.populateInventorySelect();

    const now = new Date();
    const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const dateInput = document.getElementById('sale-date');
    if (dateInput) dateInput.value = nowLocal;

    const warnEl = document.getElementById('sale-stock-warning');
    if (warnEl) warnEl.classList.add('hidden');

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

    const { paid } = this.getSalePaymentBreakdown(sale);

    document.getElementById('sale-customer-name').value = sale.customerName || '';
    document.getElementById('sale-customer-phone').value = sale.customerPhone || '';
    document.getElementById('sale-event').value = sale.event || '';
    document.getElementById('sale-category').value = sale.category || '';
    document.getElementById('sale-quantity').value = sale.quantity || 1;
    document.getElementById('sale-cost-unit').value = sale.costUnit || 0;
    document.getElementById('sale-price-unit').value = sale.salePriceUnit || 0;
    document.getElementById('sale-payment-status').value = sale.paymentStatus || 'pagado';
    document.getElementById('sale-amount-paid').value = paid;
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

    select.innerHTML = '<option value="">-- Seleccionar Lote del Inventario --</option>';

    window.storage.inventory.forEach(inv => {
      const sold = window.storage.getSoldQuantityForInventory(inv.id);
      const remaining = Math.max(0, inv.quantityBought - sold);
      const opt = document.createElement('option');
      opt.value = inv.id;
      opt.textContent = `${inv.category} (${remaining} disp. | Costo: ${this.formatMoney(inv.costUnit)} → Sugerido: ${this.formatMoney(inv.suggestedPrice || inv.costUnit)})`;
      if (inv.id === selectedId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // Auto-fill form when user selects an inventory item
  onInventorySelected(invId) {
    const warnEl = document.getElementById('sale-stock-warning');
    if (!invId) {
      if (warnEl) warnEl.classList.add('hidden');
      return;
    }
    const item = window.storage.inventory.find(i => i.id === invId);
    if (!item) return;

    document.getElementById('sale-event').value = item.event;
    document.getElementById('sale-category').value = item.category;
    document.getElementById('sale-cost-unit').value = item.costUnit;
    if (item.suggestedPrice) {
      document.getElementById('sale-price-unit').value = item.suggestedPrice;
    }

    const sold = window.storage.getSoldQuantityForInventory(item.id);
    const remaining = Math.max(0, item.quantityBought - sold);
    if (warnEl) {
      warnEl.classList.remove('hidden');
      warnEl.textContent = remaining > 0 ? `Stock disponible: ${remaining} boleta(s)` : '⚠️ Lote sin stock disponible';
      warnEl.className = `text-[11px] font-semibold ${remaining > 0 ? 'text-emerald-400' : 'text-amber-400'}`;
    }

    this.updateModalLiveCalculation();
  }

  // Handle payment status dropdown change inside modal
  onPaymentStatusChanged(status) {
    const qty = parseInt(document.getElementById('sale-quantity')?.value, 10) || 1;
    const saleUnit = parseFloat(document.getElementById('sale-price-unit')?.value) || 0;
    const totalSale = saleUnit * qty;
    const amountPaidInput = document.getElementById('sale-amount-paid');

    if (amountPaidInput) {
      if (status === 'pagado') {
        amountPaidInput.value = totalSale;
      } else if (status === 'pendiente') {
        amountPaidInput.value = 0;
      } else if (status === 'abono') {
        amountPaidInput.value = Math.round(totalSale / 2);
        amountPaidInput.focus();
      }
    }
    this.updatePaymentBalanceHint();
  }

  updatePaymentBalanceHint() {
    const qty = parseInt(document.getElementById('sale-quantity')?.value, 10) || 1;
    const saleUnit = parseFloat(document.getElementById('sale-price-unit')?.value) || 0;
    const totalSale = saleUnit * qty;
    const status = document.getElementById('sale-payment-status')?.value || 'pagado';
    const paidVal = parseFloat(document.getElementById('sale-amount-paid')?.value) || 0;
    const hintEl = document.getElementById('sale-balance-due-hint');

    if (!hintEl) return;
    if (status === 'pagado') {
      hintEl.textContent = '100% cobrado';
      hintEl.className = 'text-[10px] font-mono text-emerald-400';
    } else {
      const pending = Math.max(0, totalSale - paidVal);
      hintEl.textContent = `Debe: ${this.formatMoney(pending)}`;
      hintEl.className = 'text-[10px] font-mono text-amber-400';
    }
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
      previewProfit.className = `font-mono font-bold text-sm ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (previewP1) previewP1.textContent = `${window.storage.settings.partner1 || 'Santiago'}: ${this.formatMoney(profitP1)}`;
    if (previewP2) previewP2.textContent = `${window.storage.settings.partner2 || 'Sebas'}: ${this.formatMoney(profitP2)}`;

    // Sync amountPaid if payment status is 'pagado' or 'pendiente'
    const payStatus = document.getElementById('sale-payment-status')?.value || 'pagado';
    const amountPaidInput = document.getElementById('sale-amount-paid');
    if (amountPaidInput) {
      if (payStatus === 'pagado') {
        amountPaidInput.value = totalSale;
      } else if (payStatus === 'pendiente') {
        amountPaidInput.value = 0;
      }
    }
    this.updatePaymentBalanceHint();
  }

  // Save Sale (Create or Update)
  saveSaleFromModal() {
    const invSelect = document.getElementById('sale-inventory-select');
    const inventoryId = invSelect ? invSelect.value : '';

    const customerName = document.getElementById('sale-customer-name')?.value.trim();
    if (!customerName) {
      window.ui.showToast('Por favor escribe el nombre del comprador', 'warning');
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
    const totalSale = salePriceUnit * qty;

    let paymentStatus = document.getElementById('sale-payment-status')?.value || 'pagado';
    let amountPaid = parseFloat(document.getElementById('sale-amount-paid')?.value);

    if (paymentStatus === 'pagado') {
      amountPaid = totalSale;
    } else if (paymentStatus === 'pendiente') {
      amountPaid = 0;
    } else if (paymentStatus === 'abono') {
      if (isNaN(amountPaid) || amountPaid <= 0) {
        amountPaid = 0;
        paymentStatus = 'pendiente';
      } else if (amountPaid >= totalSale) {
        amountPaid = totalSale;
        paymentStatus = 'pagado';
      }
    }

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
      window.ui.showToast('Venta registrada exitosamente', 'success');
      if (typeof confetti === 'function') {
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      }
    }

    window.ui.closeModal('modal-sale');
    this.render();
    window.dashboard.update();
    if (window.inventory) window.inventory.render();
    if (window.ui) window.ui.renderCustomers();
  }

  // Delete sale with confirmation
  deleteSaleConfirm(saleId) {
    const sale = window.storage.sales.find(s => s.id === saleId);
    if (!sale) return;

    if (confirm(`¿Eliminar la venta #${sale.consecutive} de ${sale.customerName}?`)) {
      window.storage.deleteSale(saleId);
      window.ui.showToast(`Venta #${sale.consecutive} eliminada`, 'info');
      this.render();
      window.dashboard.update();
      if (window.inventory) window.inventory.render();
      if (window.ui) window.ui.renderCustomers();
    }
  }
}

window.sales = new SalesManager();
