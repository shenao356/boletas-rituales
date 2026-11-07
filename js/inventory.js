/**
 * Inventory Management Module for BOLETAS RITUALES
 * Manages ticket batches, categories, purchase costs, remaining stock, and investment tracking
 */

class InventoryManager {
  constructor() {
    this.selectedItemForEdit = null;
    this.filterEvent = 'all';
  }

  formatMoney(num) {
    return '$' + (Number(num) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  getFilteredInventory() {
    let items = [...window.storage.inventory];
    if (this.filterEvent !== 'all') {
      items = items.filter(i => i.event === this.filterEvent);
    }
    return items;
  }

  // Render inventory summary KPIs and batch cards
  render() {
    const items = this.getFilteredInventory();
    const container = document.getElementById('inventory-list');

    this.populateInventoryEventFilter();

    // Compute aggregate summary for filtered inventory
    let totalBought = 0;
    let totalAvailable = 0;
    let totalInvested = 0;
    let totalProjectedProfit = 0;

    items.forEach(item => {
      const qty = Number(item.quantityBought) || 0;
      const sold = window.storage.getSoldQuantityForInventory(item.id);
      const rem = Math.max(0, qty - sold);
      const cost = Number(item.costUnit) || 0;
      const suggested = Number(item.suggestedPrice) || cost;

      totalBought += qty;
      totalAvailable += rem;
      totalInvested += (qty * cost);
      totalProjectedProfit += (qty * (suggested - cost));
    });

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('inv-kpi-total-qty', `${totalBought} boletas`);
    setEl('inv-kpi-available-qty', `${totalAvailable} disp.`);
    setEl('inv-kpi-total-invested', this.formatMoney(totalInvested));
    setEl('inv-kpi-projected-profit', '+' + this.formatMoney(totalProjectedProfit));

    if (!items.length) {
      const emptyMsg = `
        <div class="col-span-full p-10 text-center text-slate-400 glass-card">
          <p class="font-bold text-white text-sm">No hay lotes de boletas registrados</p>
          <p class="text-xs text-slate-500 mt-1">Agrega tu primer lote con el botón "Nuevo Lote".</p>
          <button onclick="window.inventory.openAddModal()" class="btn-primary mt-4 text-xs">
            + Agregar Lote Ahora
          </button>
        </div>
      `;
      if (container) container.innerHTML = emptyMsg;
      return;
    }

    if (container) {
      container.innerHTML = items.map(item => {
        const bought = Number(item.quantityBought) || 0;
        const sold = window.storage.getSoldQuantityForInventory(item.id);
        const remaining = Math.max(0, bought - sold);
        const oversold = sold > bought ? (sold - bought) : 0;

        const costUnit = Number(item.costUnit) || 0;
        const suggestedUnit = Number(item.suggestedPrice) || costUnit;
        const unitMargin = suggestedUnit - costUnit;
        const totalInvestedBatch = bought * costUnit;
        const expectedProfit = bought * unitMargin;
        const percentSold = bought > 0 ? Math.min(100, Math.round((sold / bought) * 100)) : 0;

        let stockBadge = 'badge-paid';
        let stockText = `${remaining} Disponibles`;
        let barColor = 'from-cyan-500 to-emerald-400';

        if (remaining === 0) {
          stockBadge = oversold > 0 ? 'badge-danger' : 'badge-unliquidated';
          stockText = oversold > 0 ? `Sobrevendido (+${oversold})` : 'Agotado';
          barColor = 'from-amber-500 to-rose-500';
        } else if (remaining <= 3) {
          stockBadge = 'badge-pending';
          stockText = `Últimas ${remaining}`;
          barColor = 'from-amber-400 to-orange-500';
        }

        return `
          <div class="glass-card glass-card-interactive p-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider truncate">${item.event}</span>
                <span class="badge ${stockBadge}">${stockText}</span>
              </div>

              <h3 class="text-base sm:text-lg font-extrabold text-white tracking-tight">${item.category}</h3>
              <p class="text-xs text-slate-400 mt-0.5 mb-4">${item.location || 'Ubicación general'}</p>

              <!-- Progress Bar -->
              <div class="mb-4">
                <div class="flex justify-between text-xs text-slate-300 mb-1.5">
                  <span>Vendidas: <b class="text-white font-mono">${sold}</b> de <span class="font-mono">${bought}</span></span>
                  <span class="font-mono font-bold text-cyan-400">${percentSold}%</span>
                </div>
                <div class="w-full bg-white/[0.07] rounded-full h-2 overflow-hidden">
                  <div class="bg-gradient-to-r ${barColor} h-2 rounded-full transition-all duration-500" style="width: ${percentSold}%"></div>
                </div>
              </div>

              <!-- Financial Specs -->
              <div class="grid grid-cols-2 gap-2.5 bg-black/35 p-3.5 rounded-xl border border-white/[0.05] text-xs mb-3">
                <div>
                  <div class="text-slate-400 text-[11px]">Costo Compra Unit.</div>
                  <div class="font-mono font-bold text-white text-sm mt-0.5">${this.formatMoney(costUnit)}</div>
                  <div class="text-[11px] text-slate-500 mt-2">Inversión Lote:</div>
                  <div class="font-mono text-slate-300 font-semibold">${this.formatMoney(totalInvestedBatch)}</div>
                </div>
                <div class="text-right">
                  <div class="text-slate-400 text-[11px]">Venta Sugerida</div>
                  <div class="font-mono font-bold text-cyan-300 text-sm mt-0.5">${this.formatMoney(suggestedUnit)}</div>
                  <div class="text-[11px] text-slate-500 mt-2">Utilidad Proyectada:</div>
                  <div class="font-mono text-emerald-400 font-semibold">+${this.formatMoney(expectedProfit)}</div>
                </div>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-3">
                <span>Margen por boleta:</span>
                <span class="font-mono font-semibold text-emerald-400">+${this.formatMoney(unitMargin)} / ud.</span>
              </div>

              ${item.notes ? `<p class="text-[11px] text-slate-400 bg-white/[0.02] px-2.5 py-1.5 rounded-lg border border-white/[0.04] mb-3 truncate" title="${item.notes}">${item.notes}</p>` : ''}
            </div>

            <!-- Card Actions -->
            <div class="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <button onclick="window.sales.openAddModalWithInventory('${item.id}')" class="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                <span>Registrar Venta</span>
              </button>
              <div class="flex items-center gap-1.5">
                <button onclick="window.inventory.openEditModal('${item.id}')" class="p-1.5 rounded-lg bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.1] transition" title="Editar Lote">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="window.inventory.deleteConfirm('${item.id}')" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition" title="Eliminar Lote">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  populateInventoryEventFilter() {
    const select = document.getElementById('filter-inv-event-select');
    if (!select) return;

    const eventsSet = new Set();
    window.storage.inventory.forEach(i => { if (i.event) eventsSet.add(i.event); });

    const current = this.filterEvent;
    select.innerHTML = '<option value="all">Todos los Eventos</option>';

    Array.from(eventsSet).sort().forEach(ev => {
      const opt = document.createElement('option');
      opt.value = ev;
      opt.textContent = ev;
      if (ev === current) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // Open Add Inventory Modal
  openAddModal() {
    this.selectedItemForEdit = null;
    const form = document.getElementById('form-inventory');
    if (form) form.reset();

    const titleEl = document.getElementById('modal-inventory-title');
    if (titleEl) titleEl.textContent = 'Agregar Nuevo Lote de Boletas';

    window.ui.openModal('modal-inventory');
  }

  // Open Edit Inventory Modal
  openEditModal(id) {
    const item = window.storage.inventory.find(i => i.id === id);
    if (!item) return;

    this.selectedItemForEdit = item;

    const titleEl = document.getElementById('modal-inventory-title');
    if (titleEl) titleEl.textContent = `Editar Lote: ${item.category}`;

    document.getElementById('inv-event').value = item.event || '';
    document.getElementById('inv-category').value = item.category || '';
    document.getElementById('inv-qty').value = item.quantityBought || 0;
    document.getElementById('inv-cost').value = item.costUnit || 0;
    document.getElementById('inv-suggested').value = item.suggestedPrice || 0;
    document.getElementById('inv-location').value = item.location || '';
    document.getElementById('inv-notes').value = item.notes || '';

    window.ui.openModal('modal-inventory');
  }

  // Save Inventory from Modal
  saveInventoryFromModal() {
    const event = document.getElementById('inv-event')?.value.trim();
    const category = document.getElementById('inv-category')?.value.trim();

    if (!event || !category) {
      window.ui.showToast('Por favor escribe el evento y la categoría', 'warning');
      return;
    }

    const quantityBought = parseInt(document.getElementById('inv-qty')?.value, 10) || 0;
    const costUnit = parseFloat(document.getElementById('inv-cost')?.value) || 0;
    const suggestedPrice = parseFloat(document.getElementById('inv-suggested')?.value) || 0;
    const location = document.getElementById('inv-location')?.value.trim() || '';
    const notes = document.getElementById('inv-notes')?.value.trim() || '';

    const payload = {
      event,
      category,
      quantityBought,
      costUnit,
      suggestedPrice,
      location,
      notes
    };

    if (this.selectedItemForEdit) {
      window.storage.updateInventoryItem(this.selectedItemForEdit.id, payload);
      window.ui.showToast('Lote de inventario actualizado', 'success');
    } else {
      window.storage.addInventoryItem(payload);
      window.ui.showToast('Nuevo lote agregado al inventario', 'success');
    }

    window.ui.closeModal('modal-inventory');
    this.render();
    window.sales.populateInventorySelect();
    window.sales.render();
    window.dashboard.update();
  }

  // Delete inventory with verification
  deleteConfirm(id) {
    const item = window.storage.inventory.find(i => i.id === id);
    if (!item) return;

    const sold = window.storage.getSoldQuantityForInventory(id);
    if (sold > 0) {
      if (!confirm(`Este lote ya tiene ${sold} boletas vendidas asociadas. ¿Seguro que deseas eliminarlo? (Las ventas seguirán existiendo en el historial).`)) {
        return;
      }
    } else {
      if (!confirm(`¿Eliminar el lote "${item.event} - ${item.category}"?`)) {
        return;
      }
    }

    window.storage.deleteInventoryItem(id);
    window.ui.showToast('Lote de boletas eliminado', 'info');
    this.render();
    window.sales.populateInventorySelect();
    window.dashboard.update();
  }
}

window.inventory = new InventoryManager();

// Helper to open sale modal pre-selecting an inventory batch
window.sales.openAddModalWithInventory = function(inventoryId) {
  window.sales.openAddModal();
  const select = document.getElementById('sale-inventory-select');
  if (select) {
    select.value = inventoryId;
    window.sales.onInventorySelected(inventoryId);
  }
};
