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

  // Render inventory cards and table
  render() {
    const items = this.getFilteredInventory();
    const container = document.getElementById('inventory-list');
    const tableBody = document.getElementById('inventory-table-body');

    // Populate event filter select for inventory
    this.populateInventoryEventFilter();

    if (!items.length) {
      const emptyMsg = `
        <div class="col-span-full p-8 text-center text-slate-400 glass-card">
          <div class="text-4xl mb-3">📦</div>
          <p class="font-semibold text-white">No hay lotes de boletas registrados</p>
          <p class="text-xs text-slate-400 mt-1">Agrega tu primer lote con el botón "Agregar Lote de Boletas".</p>
          <button onclick="window.inventory.openAddModal()" class="btn-primary mt-4 text-xs">
            + Agregar Lote Ahora
          </button>
        </div>
      `;
      if (container) container.innerHTML = emptyMsg;
      if (tableBody) tableBody.innerHTML = `<tr><td colspan="7">${emptyMsg}</td></tr>`;
      return;
    }

    // Build Cards (Mobile & Grid view)
    if (container) {
      container.innerHTML = items.map(item => {
        const sold = window.storage.getSoldQuantityForInventory(item.id);
        const remaining = Math.max(0, item.quantityBought - sold);
        const totalInvested = item.quantityBought * item.costUnit;
        const totalExpectedRevenue = item.quantityBought * (item.suggestedPrice || item.costUnit);
        const expectedProfit = totalExpectedRevenue - totalInvested;
        const percentSold = item.quantityBought > 0 ? Math.round((sold / item.quantityBought) * 100) : 0;

        let stockBadge = 'badge-paid';
        let stockText = `${remaining} Disponibles`;
        if (remaining === 0) {
          stockBadge = 'badge-unliquidated';
          stockText = 'AGOTADO';
        } else if (remaining <= 3) {
          stockBadge = 'badge-pending';
          stockText = `Últimas ${remaining}!`;
        }

        return `
          <div class="glass-card p-5 relative overflow-hidden flex flex-col justify-between">
            <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none rounded-tr-xl"></div>
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-xs font-semibold text-purple-400 uppercase tracking-wider">${item.event}</span>
                <span class="badge ${stockBadge} text-xs font-bold">${stockText}</span>
              </div>

              <h3 class="text-lg font-bold text-white mb-1">${item.category}</h3>
              <p class="text-xs text-slate-400 mb-4">${item.location ? `📍 ${item.location}` : 'Sin ubicación especificada'}</p>

              <!-- Progress Bar -->
              <div class="mb-4">
                <div class="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Vendidas: <b class="text-white">${sold}</b> / ${item.quantityBought}</span>
                  <span class="font-bold text-cyan-400">${percentSold}%</span>
                </div>
                <div class="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                  <div class="bg-gradient-to-r from-violet-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500" style="width: ${percentSold}%"></div>
                </div>
              </div>

              <!-- Financial Specs -->
              <div class="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs mb-4">
                <div>
                  <div class="text-slate-400">Costo Compra Unit:</div>
                  <div class="font-mono font-bold text-white">${this.formatMoney(item.costUnit)}</div>
                  <div class="text-[11px] text-slate-500 mt-1">Inversión Lote:</div>
                  <div class="font-mono text-slate-300 font-semibold">${this.formatMoney(totalInvested)}</div>
                </div>
                <div class="text-right">
                  <div class="text-slate-400">Venta Sugerida:</div>
                  <div class="font-mono font-bold text-cyan-300">${this.formatMoney(item.suggestedPrice || item.costUnit)}</div>
                  <div class="text-[11px] text-slate-500 mt-1">Utilidad Proyectada:</div>
                  <div class="font-mono text-emerald-400 font-semibold">+${this.formatMoney(expectedProfit)}</div>
                </div>
              </div>

              ${item.notes ? `<p class="text-xs text-slate-400 italic mb-4">"${item.notes}"</p>` : ''}
            </div>

            <!-- Card Actions -->
            <div class="flex items-center justify-between pt-3 border-t border-slate-800">
              <button onclick="window.sales.openAddModalWithInventory('${item.id}')" class="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <span>+ Registrar Venta</span>
              </button>
              <div class="flex items-center gap-2">
                <button onclick="window.inventory.openEditModal('${item.id}')" class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Editar">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onclick="window.inventory.deleteConfirm('${item.id}')" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Eliminar">
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
    select.innerHTML = '<option value="all">🎪 Todos los Eventos</option>';

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
    if (titleEl) titleEl.textContent = 'Agregar Nuevo Lote de Boletas 📦';

    window.ui.openModal('modal-inventory');
  }

  // Open Edit Inventory Modal
  openEditModal(id) {
    const item = window.storage.inventory.find(i => i.id === id);
    if (!item) return;

    this.selectedItemForEdit = item;

    const titleEl = document.getElementById('modal-inventory-title');
    if (titleEl) titleEl.textContent = `Editar Lote: ${item.event} - ${item.category}`;

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
