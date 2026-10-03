/**
 * Dashboard & Analytics Module for BOLETAS RITUALES
 * Calculates KPIs, 50/50 profit splits between Santiago & Sebas, and renders Chart.js charts
 */

class DashboardManager {
  constructor() {
    this.charts = {};
  }

  // Format currency helper
  formatMoney(amount, currency = 'COP') {
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

    let totalSoldAmount = 0;
    let totalCostOfSold = 0;
    let totalPaidCollected = 0;
    let totalPendingReceivable = 0;
    let totalLiquidatedProfit = 0;
    let totalUnliquidatedProfit = 0;
    let totalTicketsSold = 0;

    sales.forEach(s => {
      const saleTotal = Number(s.totalSale) || 0;
      const costTotal = Number(s.totalCost) || 0;
      const profit = Number(s.profit) || (saleTotal - costTotal);
      const paid = Number(s.amountPaid) || 0;
      const qty = Number(s.quantity) || 1;

      totalSoldAmount += saleTotal;
      totalCostOfSold += costTotal;
      totalTicketsSold += qty;

      // Payment collection
      if (s.paymentStatus === 'pagado') {
        totalPaidCollected += saleTotal;
      } else if (s.paymentStatus === 'pendiente' || s.paymentStatus === 'abono') {
        totalPaidCollected += paid;
        totalPendingReceivable += Math.max(0, saleTotal - paid);
      }

      // Liquidation to partners
      if (s.liquidationStatus === 'liquidado') {
        totalLiquidatedProfit += profit;
      } else {
        totalUnliquidatedProfit += profit;
      }
    });

    const netProfit = totalSoldAmount - totalCostOfSold;
    const splitRatio1 = (settings.split1 || 50) / 100;
    const splitRatio2 = (settings.split2 || 50) / 100;

    const santiagoProfit = netProfit * splitRatio1;
    const sebasProfit = netProfit * splitRatio2;

    // Inventory metrics
    let totalInventoryBoughtQty = 0;
    let totalInventoryCapitalDeployed = 0;

    inventory.forEach(inv => {
      const qty = Number(inv.quantityBought) || 0;
      const cost = Number(inv.costUnit) || 0;
      totalInventoryBoughtQty += qty;
      totalInventoryCapitalDeployed += (qty * cost);
    });

    const totalStockRemaining = Math.max(0, totalInventoryBoughtQty - totalTicketsSold);
    const profitMarginPercent = totalSoldAmount > 0 ? ((netProfit / totalSoldAmount) * 100).toFixed(1) : 0;

    return {
      totalSoldAmount,
      totalCostOfSold,
      netProfit,
      santiagoProfit,
      sebasProfit,
      totalPaidCollected,
      totalPendingReceivable,
      totalLiquidatedProfit,
      totalUnliquidatedProfit,
      totalTicketsSold,
      totalInventoryBoughtQty,
      totalStockRemaining,
      totalInventoryCapitalDeployed,
      profitMarginPercent
    };
  }

  // Render KPIs to DOM
  renderKPIs() {
    const metrics = this.calculateMetrics();
    const settings = window.storage.settings;

    const p1Name = settings.partner1 || 'Santiago';
    const p2Name = settings.partner2 || 'Sebas';

    // Partner Names in Cards
    const elP1Name = document.getElementById('dash-p1-name');
    if (elP1Name) elP1Name.textContent = p1Name;

    const elP2Name = document.getElementById('dash-p2-name');
    if (elP2Name) elP2Name.textContent = p2Name;

    // Partner Earnings
    const elP1Profit = document.getElementById('dash-p1-profit');
    if (elP1Profit) elP1Profit.textContent = this.formatMoney(metrics.santiagoProfit);

    const elP2Profit = document.getElementById('dash-p2-profit');
    if (elP2Profit) elP2Profit.textContent = this.formatMoney(metrics.sebasProfit);

    // Main KPI elements
    const elNetProfit = document.getElementById('dash-net-profit');
    if (elNetProfit) elNetProfit.textContent = this.formatMoney(metrics.netProfit);

    const elTotalSales = document.getElementById('dash-total-sales');
    if (elTotalSales) elTotalSales.textContent = this.formatMoney(metrics.totalSoldAmount);

    const elTotalCost = document.getElementById('dash-total-cost');
    if (elTotalCost) elTotalCost.textContent = this.formatMoney(metrics.totalCostOfSold);

    const elPendingMoney = document.getElementById('dash-pending-money');
    if (elPendingMoney) elPendingMoney.textContent = this.formatMoney(metrics.totalPendingReceivable);

    const elUnliquidatedMoney = document.getElementById('dash-unliquidated-money');
    if (elUnliquidatedMoney) elUnliquidatedMoney.textContent = this.formatMoney(metrics.totalUnliquidatedProfit);

    const elStockInfo = document.getElementById('dash-stock-info');
    if (elStockInfo) {
      elStockInfo.textContent = `${metrics.totalTicketsSold} vendidas / ${metrics.totalStockRemaining} disponibles`;
    }

    const elMargin = document.getElementById('dash-margin-percent');
    if (elMargin) {
      elMargin.textContent = `${metrics.profitMarginPercent}% margen`;
    }

    // Top banner partner quick-pills
    const pillP1 = document.getElementById('nav-pill-p1');
    if (pillP1) pillP1.textContent = `${p1Name}: ${this.formatMoney(metrics.santiagoProfit)}`;
    const pillP2 = document.getElementById('nav-pill-p2');
    if (pillP2) pillP2.textContent = `${p2Name}: ${this.formatMoney(metrics.sebasProfit)}`;
  }

  // Render Charts
  renderCharts() {
    if (typeof Chart === 'undefined') return;

    const metrics = this.calculateMetrics();
    const sales = window.storage.sales || [];
    const settings = window.storage.settings;

    const p1Name = settings.partner1 || 'Santiago';
    const p2Name = settings.partner2 || 'Sebas';

    // 1. Profit Distribution Chart (Santiago vs Sebas)
    const ctxSplit = document.getElementById('chart-split-profit')?.getContext('2d');
    if (ctxSplit) {
      if (this.charts.split) this.charts.split.destroy();
      
      const p1Val = Math.max(0, metrics.santiagoProfit);
      const p2Val = Math.max(0, metrics.sebasProfit);

      this.charts.split = new Chart(ctxSplit, {
        type: 'doughnut',
        data: {
          labels: [p1Name, p2Name],
          datasets: [{
            data: [p1Val || 1, p2Val || 1],
            backgroundColor: ['#06b6d4', '#ec4899'],
            borderColor: ['#0891b2', '#db2777'],
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${this.formatMoney(ctx.raw)}`
              }
            }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Events Performance Chart (Ventas vs Ganancia por Evento)
    const ctxEvents = document.getElementById('chart-events')?.getContext('2d');
    if (ctxEvents) {
      if (this.charts.events) this.charts.events.destroy();

      const eventsMap = {};
      sales.forEach(s => {
        const ev = s.event || 'Sin Evento';
        if (!eventsMap[ev]) eventsMap[ev] = { sales: 0, profit: 0 };
        eventsMap[ev].sales += Number(s.totalSale) || 0;
        eventsMap[ev].profit += Number(s.profit) || 0;
      });

      const eventLabels = Object.keys(eventsMap);
      const salesData = eventLabels.map(k => eventsMap[k].sales);
      const profitData = eventLabels.map(k => eventsMap[k].profit);

      this.charts.events = new Chart(ctxEvents, {
        type: 'bar',
        data: {
          labels: eventLabels.length ? eventLabels : ['Sin datos'],
          datasets: [
            {
              label: 'Venta Total',
              data: salesData.length ? salesData : [0],
              backgroundColor: 'rgba(139, 92, 246, 0.65)',
              borderColor: '#8b5cf6',
              borderWidth: 1.5,
              borderRadius: 6
            },
            {
              label: 'Ganancia Neta',
              data: profitData.length ? profitData : [0],
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderColor: '#10b981',
              borderWidth: 1.5,
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
              labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
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
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            y: {
              ticks: {
                color: '#94a3b8',
                callback: (val) => '$' + (val >= 1000000 ? (val / 1000000) + 'M' : (val / 1000) + 'k')
              },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }

    // 3. Payment Status Chart (Cobrado vs Pendiente)
    const ctxPayment = document.getElementById('chart-payments')?.getContext('2d');
    if (ctxPayment) {
      if (this.charts.payments) this.charts.payments.destroy();

      this.charts.payments = new Chart(ctxPayment, {
        type: 'pie',
        data: {
          labels: ['Cobrado / Pagado', 'Pendiente por Cobrar'],
          datasets: [{
            data: [metrics.totalPaidCollected || 1, metrics.totalPendingReceivable || 0],
            backgroundColor: ['#10b981', '#f59e0b'],
            borderColor: ['#059669', '#d97706'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${this.formatMoney(ctx.raw)}`
              }
            }
          }
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
              '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'
            ],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 } }
            }
          },
          cutout: '55%'
        }
      });
    }
  }

  // Update whole dashboard
  update() {
    this.renderKPIs();
    this.renderCharts();
  }
}

window.dashboard = new DashboardManager();
