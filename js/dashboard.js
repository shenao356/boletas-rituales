/**
 * Dashboard & Analytics Module for BOLETAS RITUALES
 * Calculates KPIs, 50/50 profit splits (Total, Liquidado, Por Liquidar),
 * renders live stock matrix, pending alerts hub, and Chart.js visualizations
 */

class DashboardManager {
  constructor() {
    this.charts = {};
  }

  // Format currency helper
  formatMoney(amount) {
    const num = Number(amount) || 0;
    return '$' + num.toLocaleString('es-CO', {
      maximumFractionDigits: 0
    });
  }

  // Compute all metrics from current state
  calculateMetrics() {
    const sales = window.storage.sales || [];
    const inventory = window.storage.inventory || [];
    const settings = window.storage.settings || {};

    const splitRatio1 = (settings.split1 || 50) / 100;
    const splitRatio2 = (settings.split2 || 50) / 100;

    let totalSoldAmount = 0;
    let totalCostOfSold = 0;
    let totalPaidCollected = 0;
    let totalPendingReceivable = 0;
    let pendingSalesCount = 0;
    let totalLiquidatedProfit = 0;
    let totalUnliquidatedProfit = 0;
    let totalTicketsSold = 0;

    sales.forEach(s => {
      const saleTotal = Number(s.totalSale) || 0;
      const costTotal = Number(s.totalCost) || 0;
      const profit = Number(s.profit) || (saleTotal - costTotal);
      const qty = Number(s.quantity) || 1;

      totalSoldAmount += saleTotal;
      totalCostOfSold += costTotal;
      totalTicketsSold += qty;

      // Accurate payment collection calculation
      if (s.paymentStatus === 'pagado') {
        totalPaidCollected += saleTotal;
      } else if (s.paymentStatus === 'pendiente') {
        const paid = 0;
        totalPaidCollected += paid;
        totalPendingReceivable += saleTotal;
        pendingSalesCount += 1;
      } else if (s.paymentStatus === 'abono') {
        const paid = Math.min(saleTotal, Math.max(0, Number(s.amountPaid) || 0));
        const owed = Math.max(0, saleTotal - paid);
        totalPaidCollected += paid;
        totalPendingReceivable += owed;
        if (owed > 0) pendingSalesCount += 1;
      }

      // Liquidation to partners
      if (s.liquidationStatus === 'liquidado') {
        totalLiquidatedProfit += profit;
      } else {
        totalUnliquidatedProfit += profit;
      }
    });

    const netProfit = totalSoldAmount - totalCostOfSold;
    const santiagoProfit = netProfit * splitRatio1;
    const sebasProfit = netProfit * splitRatio2;

    const santiagoLiquidated = totalLiquidatedProfit * splitRatio1;
    const santiagoUnliquidated = totalUnliquidatedProfit * splitRatio1;
    const sebasLiquidated = totalLiquidatedProfit * splitRatio2;
    const sebasUnliquidated = totalUnliquidatedProfit * splitRatio2;

    // Inventory metrics
    let totalInventoryBoughtQty = 0;
    let totalInventoryCapitalDeployed = 0;
    let totalStockRemaining = 0;

    inventory.forEach(inv => {
      const qty = Number(inv.quantityBought) || 0;
      const cost = Number(inv.costUnit) || 0;
      const soldForInv = window.storage.getSoldQuantityForInventory(inv.id);
      const rem = Math.max(0, qty - soldForInv);

      totalInventoryBoughtQty += qty;
      totalInventoryCapitalDeployed += (qty * cost);
      totalStockRemaining += rem;
    });

    const profitMarginPercent = totalSoldAmount > 0 ? ((netProfit / totalSoldAmount) * 100).toFixed(1) : 0;
    const avgProfitPerTicket = totalTicketsSold > 0 ? Math.round(netProfit / totalTicketsSold) : 0;

    return {
      totalSoldAmount,
      totalCostOfSold,
      netProfit,
      santiagoProfit,
      sebasProfit,
      santiagoLiquidated,
      santiagoUnliquidated,
      sebasLiquidated,
      sebasUnliquidated,
      totalPaidCollected,
      totalPendingReceivable,
      pendingSalesCount,
      totalLiquidatedProfit,
      totalUnliquidatedProfit,
      totalTicketsSold,
      totalInventoryBoughtQty,
      totalStockRemaining,
      totalInventoryCapitalDeployed,
      profitMarginPercent,
      avgProfitPerTicket
    };
  }

  // Render KPIs to DOM
  renderKPIs() {
    const metrics = this.calculateMetrics();
    const settings = window.storage.settings;

    const p1Name = settings.partner1 || 'Santiago';
    const p2Name = settings.partner2 || 'Sebas';

    // Header Partner Names
    const hP1 = document.getElementById('header-p1');
    if (hP1) hP1.textContent = p1Name;
    const hP2 = document.getElementById('header-p2');
    if (hP2) hP2.textContent = p2Name;

    // Nav sales count badge
    const navSalesBadge = document.getElementById('nav-badge-sales');
    if (navSalesBadge) navSalesBadge.textContent = (window.storage.sales || []).length;

    // Partner Names in Cards
    const elP1Name = document.getElementById('dash-p1-name');
    if (elP1Name) elP1Name.textContent = p1Name;
    const elP2Name = document.getElementById('dash-p2-name');
    if (elP2Name) elP2Name.textContent = p2Name;

    // Partner Total & Breakdown
    const setElText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElText('dash-p1-profit', this.formatMoney(metrics.santiagoProfit));
    setElText('dash-p1-liquidated', this.formatMoney(metrics.santiagoLiquidated));
    setElText('dash-p1-unliquidated', this.formatMoney(metrics.santiagoUnliquidated));

    setElText('dash-p2-profit', this.formatMoney(metrics.sebasProfit));
    setElText('dash-p2-liquidated', this.formatMoney(metrics.sebasLiquidated));
    setElText('dash-p2-unliquidated', this.formatMoney(metrics.sebasUnliquidated));

    // Main KPI Strip
    setElText('dash-net-profit', this.formatMoney(metrics.netProfit));
    setElText('dash-margin-percent', `${metrics.profitMarginPercent}% margen`);
    setElText('dash-avg-profit', this.formatMoney(metrics.avgProfitPerTicket));

    setElText('dash-total-sales', this.formatMoney(metrics.totalSoldAmount));
    setElText('dash-tickets-sold-badge', `${metrics.totalTicketsSold} vendidas`);
    setElText('dash-collected-money', this.formatMoney(metrics.totalPaidCollected));

    setElText('dash-total-cost', this.formatMoney(metrics.totalCostOfSold));
    setElText('dash-capital-deployed', this.formatMoney(metrics.totalInventoryCapitalDeployed));

    setElText('dash-pending-money', this.formatMoney(metrics.totalPendingReceivable));
    setElText('dash-pending-count', `${metrics.pendingSalesCount} ${metrics.pendingSalesCount === 1 ? 'pendiente' : 'pendientes'}`);

    setElText('dash-unliquidated-money', this.formatMoney(metrics.totalUnliquidatedProfit));
    setElText('dash-stock-info', `${metrics.totalTicketsSold} boletas vendidas • ${metrics.totalStockRemaining} disponibles en inventario`);

    // Top banner partner quick-pills
    setElText('nav-pill-p1', `${p1Name}: ${this.formatMoney(metrics.santiagoProfit)}`);
    setElText('nav-pill-p2', `${p2Name}: ${this.formatMoney(metrics.sebasProfit)}`);
  }

  // Render Live Stock Matrix on Dashboard
  renderQuickStockList() {
    const container = document.getElementById('dash-quick-stock-list');
    if (!container) return;

    const inventory = window.storage.inventory || [];
    if (!inventory.length) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-400 bg-black/20 rounded-xl border border-white/5 text-xs">
          No hay lotes registrados en inventario.
        </div>
      `;
      return;
    }

    container.innerHTML = inventory.map(inv => {
      const sold = window.storage.getSoldQuantityForInventory(inv.id);
      const bought = Number(inv.quantityBought) || 0;
      const remaining = Math.max(0, bought - sold);
      const oversold = sold > bought ? (sold - bought) : 0;
      const pct = bought > 0 ? Math.min(100, Math.round((sold / bought) * 100)) : 0;

      let badgeClass = 'badge-paid';
      let badgeText = `${remaining} disp.`;
      let barColor = 'from-cyan-500 to-emerald-400';

      if (remaining === 0) {
        badgeClass = oversold > 0 ? 'badge-danger' : 'badge-unliquidated';
        badgeText = oversold > 0 ? `Sobrevendido (+${oversold})` : 'Agotado';
        barColor = 'from-amber-500 to-rose-500';
      } else if (remaining <= 2) {
        badgeClass = 'badge-pending';
        badgeText = `Últimas ${remaining}`;
        barColor = 'from-amber-400 to-orange-500';
      }

      return `
        <div class="p-3 rounded-xl bg-black/30 border border-white/[0.06] hover:border-white/[0.14] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-white text-xs sm:text-sm truncate">${inv.category}</span>
              <span class="badge ${badgeClass}">${badgeText}</span>
              <span class="text-[11px] text-slate-500 truncate hidden sm:inline">• ${inv.event}</span>
            </div>
            <div class="flex items-center gap-3 mt-1.5">
              <div class="flex-1 bg-white/[0.07] h-1.5 rounded-full overflow-hidden max-w-[180px]">
                <div class="bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
              </div>
              <span class="text-[11px] font-mono text-slate-400">${sold}/${bought} vendidas</span>
              <span class="text-[11px] font-mono text-slate-300 hidden md:inline">Sugerido: <b class="text-cyan-300">${this.formatMoney(inv.suggestedPrice || inv.costUnit)}</b></span>
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.05]">
            <span class="text-[11px] font-mono text-slate-400 sm:hidden">Costo: ${this.formatMoney(inv.costUnit)}</span>
            <button onclick="window.sales.openAddModalWithInventory('${inv.id}')" class="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              <span>Vender</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Pending Payments & Unliquidated Sales Hub on Dashboard
  renderPendingAlertsList() {
    const container = document.getElementById('dash-pending-alerts-list');
    if (!container) return;

    const sales = window.storage.sales || [];
    const actionItems = sales.filter(s => s.paymentStatus !== 'pagado' || s.liquidationStatus !== 'liquidado');

    if (!actionItems.length) {
      container.innerHTML = `
        <div class="p-6 text-center bg-emerald-500/[0.05] rounded-xl border border-emerald-500/20">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="text-xs font-bold text-white">Todo recaudado y liquidado al día</p>
          <p class="text-[11px] text-slate-400 mt-0.5">No hay cuentas por cobrar ni ganancias pendientes de repartir.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = actionItems.slice(0, 8).map(s => {
      const totalSale = Number(s.totalSale) || 0;
      const paid = s.paymentStatus === 'pagado' ? totalSale : (s.paymentStatus === 'pendiente' ? 0 : (Number(s.amountPaid) || 0));
      const debt = Math.max(0, totalSale - paid);
      const isUnpaid = s.paymentStatus !== 'pagado' && debt > 0;
      const isUnliquidated = s.liquidationStatus !== 'liquidado';

      return `
        <div class="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex items-center justify-between gap-2.5 text-xs">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-cyan-400">#${String(s.consecutive).padStart(3, '0')}</span>
              <span class="font-bold text-white truncate">${s.customerName}</span>
            </div>
            <div class="text-[11px] text-slate-400 truncate mt-0.5">
              ${s.category} (x${s.quantity}) •
              ${isUnpaid
                ? `<span class="text-amber-400 font-mono font-semibold">Debe ${this.formatMoney(debt)}</span>`
                : `<span class="text-emerald-400">Pagado</span>`}
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            ${isUnpaid ? `
              <button onclick="window.sales.togglePaymentStatus('${s.id}')" title="Cambiar estado de pago" class="px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition">
                Cobrar
              </button>
            ` : ''}
            ${isUnliquidated ? `
              <button onclick="window.sales.toggleLiquidationStatus('${s.id}')" title="Marcar ganancia como repartida 50/50" class="px-2 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-semibold transition">
                Liquidar (${this.formatMoney(s.profit)})
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Charts
  renderCharts() {
    if (typeof Chart === 'undefined') return;

    const metrics = this.calculateMetrics();
    const sales = window.storage.sales || [];
    const settings = window.storage.settings;

    const p1Name = settings.partner1 || 'Santiago';
    const p2Name = settings.partner2 || 'Sebas';

    // 1. Rendimiento Financiero por Categoría / Lote (Bar Chart)
    const ctxEvents = document.getElementById('chart-events')?.getContext('2d');
    if (ctxEvents) {
      if (this.charts.events) this.charts.events.destroy();

      const groupMap = {};
      sales.forEach(s => {
        const key = (s.category || s.event || 'General').trim();
        if (!groupMap[key]) groupMap[key] = { sales: 0, profit: 0 };
        groupMap[key].sales += Number(s.totalSale) || 0;
        groupMap[key].profit += Number(s.profit) || 0;
      });

      const labels = Object.keys(groupMap);
      const salesData = labels.map(k => groupMap[k].sales);
      const profitData = labels.map(k => groupMap[k].profit);

      this.charts.events = new Chart(ctxEvents, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['Sin ventas'],
          datasets: [
            {
              label: 'Facturación Total',
              data: salesData.length ? salesData : [0],
              backgroundColor: 'rgba(6, 182, 212, 0.65)',
              borderColor: '#06b6d4',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              label: 'Utilidad Neta',
              data: profitData.length ? profitData : [0],
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${this.formatMoney(ctx.raw)}`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            },
            y: {
              ticks: {
                color: '#94a3b8',
                font: { family: 'JetBrains Mono', size: 10 },
                callback: (val) => '$' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000) + 'k')
              },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            }
          }
        }
      });
    }

    // 2. Balance de Socios: Liquidado vs Por Liquidar (Bar Chart)
    const ctxSplit = document.getElementById('chart-split-profit')?.getContext('2d');
    if (ctxSplit) {
      if (this.charts.split) this.charts.split.destroy();

      this.charts.split = new Chart(ctxSplit, {
        type: 'bar',
        data: {
          labels: [p1Name, p2Name],
          datasets: [
            {
              label: 'Ya Liquidado (En Bolsillo)',
              data: [Math.max(0, metrics.santiagoLiquidated), Math.max(0, metrics.sebasLiquidated)],
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 6
            },
            {
              label: 'Pendiente por Liquidar',
              data: [Math.max(0, metrics.santiagoUnliquidated), Math.max(0, metrics.sebasUnliquidated)],
              backgroundColor: 'rgba(245, 158, 11, 0.75)',
              borderColor: '#f59e0b',
              borderWidth: 1,
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 12 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${this.formatMoney(ctx.raw)}`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#f8fafc', font: { weight: 'bold', size: 12 } },
              grid: { display: false }
            },
            y: {
              ticks: {
                color: '#94a3b8',
                font: { family: 'JetBrains Mono', size: 10 },
                callback: (val) => '$' + (val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000) + 'k')
              },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            }
          }
        }
      });
    }

    // 3. Payment Status Chart (Cobrado vs Pendiente)
    const ctxPayment = document.getElementById('chart-payments')?.getContext('2d');
    if (ctxPayment) {
      if (this.charts.payments) this.charts.payments.destroy();

      const hasData = (metrics.totalPaidCollected + metrics.totalPendingReceivable) > 0;
      this.charts.payments = new Chart(ctxPayment, {
        type: 'doughnut',
        data: {
          labels: ['Cobrado en Caja', 'Saldo por Cobrar'],
          datasets: [{
            data: hasData ? [metrics.totalPaidCollected, metrics.totalPendingReceivable] : [1, 0],
            backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.85)'],
            borderColor: ['#059669', '#d97706'],
            borderWidth: 1.5,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${this.formatMoney(ctx.raw)}`
              }
            }
          },
          cutout: '68%'
        }
      });
    }

    // 4. Ticket Categories Sold
    const ctxCategories = document.getElementById('chart-categories')?.getContext('2d');
    if (ctxCategories) {
      if (this.charts.categories) this.charts.categories.destroy();

      const catMap = {};
      sales.forEach(s => {
        const cat = s.category || 'General';
        catMap[cat] = (catMap[cat] || 0) + (Number(s.quantity) || 1);
      });

      const catLabels = Object.keys(catMap);
      const catCounts = Object.values(catMap);

      this.charts.categories = new Chart(ctxCategories, {
        type: 'doughnut',
        data: {
          labels: catLabels.length ? catLabels : ['Sin ventas'],
          datasets: [{
            data: catCounts.length ? catCounts : [1],
            backgroundColor: [
              '#06b6d4', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#14b8a6'
            ],
            borderWidth: 1.5,
            borderColor: '#11131c',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} boleta(s)`
              }
            }
          },
          cutout: '62%'
        }
      });
    }
  }

  // Update whole dashboard
  update() {
    this.renderKPIs();
    this.renderQuickStockList();
    this.renderPendingAlertsList();
    this.renderCharts();
  }
}

window.dashboard = new DashboardManager();
