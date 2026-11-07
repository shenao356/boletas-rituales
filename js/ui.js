/**
 * UI & Application Controller Module for BOLETAS RITUALES
 * Manages tabs, themes, modals, toast alerts, customers directory, settings, and cloud sync setup
 */

class UIManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.toastContainer = null;
    this.customerFilter = 'all'; // all, debt, paid
    this.customerSearch = '';
  }

  init() {
    this.toastContainer = document.getElementById('toast-container');
    this.applyTheme(window.storage.settings.theme || 'neon');
    this.setupEventListeners();
    this.renderCustomers();
    this.loadSettingsForm();

    // Default tab
    this.switchTab('dashboard');
  }

  // Navigation tab switching
  switchTab(tabId) {
    this.currentTab = tabId;

    // Hide all tab sections
    document.querySelectorAll('.tab-section').forEach(sec => {
      sec.classList.add('hidden');
    });

    // Show target section
    const target = document.getElementById(`tab-content-${tabId}`);
    if (target) {
      target.classList.remove('hidden');
    }

    // Update Nav bar active states (both desktop & mobile)
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      const match = btn.getAttribute('data-nav-tab') === tabId;
      if (match) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Re-render components based on tab
    if (tabId === 'dashboard') {
      window.dashboard.update();
    } else if (tabId === 'sales') {
      window.sales.render();
    } else if (tabId === 'inventory') {
      window.inventory.render();
    } else if (tabId === 'customers') {
      this.renderCustomers();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Shortcut from Dashboard KPI card to filter unpaid sales
  filterPendingSalesFromDash() {
    this.switchTab('sales');
    if (window.sales) {
      window.sales.applyQuickPreset('unpaid');
    }
  }

  // Theme application
  applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    window.storage.saveSettings({ theme: themeName });

    const select = document.getElementById('settings-theme-select');
    if (select) select.value = themeName;
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    let borderColor = 'border-cyan-500/40';

    if (type === 'success') {
      icon = '✅';
      borderColor = 'border-emerald-500/50';
    } else if (type === 'warning') {
      icon = '⚠️';
      borderColor = 'border-amber-500/50';
    } else if (type === 'error') {
      icon = '❌';
      borderColor = 'border-rose-500/50';
    }

    toast.classList.add(borderColor);
    toast.innerHTML = `
      <span class="text-base shrink-0">${icon}</span>
      <div class="text-xs sm:text-sm font-medium text-slate-100 flex-1">${message}</div>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3400);
  }

  // Modal open/close helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  // Set customer filter pill
  setCustomerFilter(filter) {
    this.customerFilter = filter;
    document.querySelectorAll('[data-cust-filter]').forEach(btn => {
      if (btn.getAttribute('data-cust-filter') === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.renderCustomers();
  }

  // Render Customers Tab (Directorio de Compradores)
  renderCustomers() {
    const container = document.getElementById('customers-list');
    if (!container) return;

    const sales = window.storage.sales || [];
    const customerMap = {};

    sales.forEach(s => {
      const name = (s.customerName || 'Anónimo').trim();
      if (!customerMap[name]) {
        customerMap[name] = {
          name,
          phone: s.customerPhone || '',
          totalSpent: 0,
          totalPaid: 0,
          totalTickets: 0,
          categories: new Set(),
          pendingDebt: 0,
          salesCount: 0
        };
      }

      const { totalSale, paid, pending } = window.sales
        ? window.sales.getSalePaymentBreakdown(s)
        : { totalSale: Number(s.totalSale) || 0, paid: Number(s.amountPaid) || 0, pending: 0 };

      customerMap[name].totalSpent += totalSale;
      customerMap[name].totalPaid += paid;
      customerMap[name].totalTickets += (Number(s.quantity) || 1);
      if (s.category) customerMap[name].categories.add(s.category);
      customerMap[name].pendingDebt += pending;
      customerMap[name].salesCount += 1;
      if (!customerMap[name].phone && s.customerPhone) {
        customerMap[name].phone = s.customerPhone;
      }
    });

    let customers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);

    // Apply filter
    if (this.customerFilter === 'debt') {
      customers = customers.filter(c => c.pendingDebt > 0);
    } else if (this.customerFilter === 'paid') {
      customers = customers.filter(c => c.pendingDebt === 0);
    }

    // Apply search
    if (this.customerSearch) {
      const q = this.customerSearch.toLowerCase().trim();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        Array.from(c.categories).some(cat => cat.toLowerCase().includes(q))
      );
    }

    if (!customers.length) {
      container.innerHTML = `
        <div class="col-span-full p-10 text-center text-slate-400 glass-card">
          <p class="font-bold text-white text-sm">No se encontraron clientes en esta vista</p>
          <p class="text-xs text-slate-500 mt-1">Prueba cambiando el filtro o registrando una nueva venta.</p>
        </div>
      `;
      return;
    }

    const p1 = window.storage.settings.partner1 || 'Santiago';
    const p2 = window.storage.settings.partner2 || 'Sebas';

    container.innerHTML = customers.map(c => {
      const cleanPhone = (c.phone || '').replace(/\D/g, '');
      const waNumber = cleanPhone.length === 10 ? '57' + cleanPhone : cleanPhone;
      const hasDebt = c.pendingDebt > 0;

      const waMsg = hasDebt
        ? encodeURIComponent(`Hola ${c.name}! Te escribimos ${p1} & ${p2} de Boletas Rituales 🎧. Te recordamos el saldo pendiente de ${window.sales.formatMoney(c.pendingDebt)} de tus boletas. ¡Quedamos atentos!`)
        : encodeURIComponent(`Hola ${c.name}! Te escribimos ${p1} & ${p2} de Boletas Rituales 🎧⚡`);

      return `
        <div class="glass-card glass-card-interactive p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 class="font-bold text-white text-base leading-tight">${c.name}</h3>
                <div class="text-xs text-slate-400 mt-0.5 font-mono">
                  ${c.phone ? c.phone : '<span class="font-sans italic text-slate-600">Sin teléfono registrado</span>'}
                </div>
              </div>
              <span class="badge ${hasDebt ? 'badge-pending pulse-warning' : 'badge-paid'}">
                ${hasDebt ? `Debe ${window.sales.formatMoney(c.pendingDebt)}` : 'Al Día'}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2.5 bg-black/35 p-3.5 rounded-xl border border-white/[0.05] text-xs my-3">
              <div>
                <div class="text-slate-400 text-[11px]">Total Comprado</div>
                <div class="font-mono font-bold text-white text-sm mt-0.5">${window.sales.formatMoney(c.totalSpent)}</div>
              </div>
              <div class="text-right">
                <div class="text-slate-400 text-[11px]">Boletas Adquiridas</div>
                <div class="font-mono font-bold text-cyan-300 text-sm mt-0.5">${c.totalTickets} boleta(s)</div>
              </div>
            </div>

            <div class="text-xs text-slate-400">
              <span class="text-slate-500 text-[11px]">Localidades compradas:</span>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                ${Array.from(c.categories).map(cat => `
                  <span class="bg-white/[0.04] border border-white/[0.08] text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">
                    ${cat}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="pt-3.5 border-t border-white/[0.06] flex items-center justify-between mt-4">
            <span class="text-xs text-slate-500">${c.salesCount} ${c.salesCount === 1 ? 'compra' : 'compras'}</span>
            ${c.phone ? `
              <a href="https://wa.me/${waNumber}?text=${waMsg}" target="_blank" class="px-3 py-1.5 rounded-lg ${hasDebt ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25'} text-xs font-semibold flex items-center gap-1.5 transition">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.288.043.088.072.19.014.305-.058.115-.087.187-.173.289l-.26.308c-.087.096-.178.201-.077.375.101.174.45 0.742.965 1.202.663.591 1.222.774 1.396.861.174.087.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.044.072.044.419-.1 0.824z"/></svg>
                <span>${hasDebt ? 'Cobrar por WhatsApp' : 'WhatsApp'}</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Load Settings into form inputs
  loadSettingsForm() {
    const s = window.storage.settings;
    const inpP1 = document.getElementById('settings-partner1');
    const inpP2 = document.getElementById('settings-partner2');
    const inpSplit1 = document.getElementById('settings-split1');
    const inpSplit2 = document.getElementById('settings-split2');
    const selTheme = document.getElementById('settings-theme-select');
    const inpGhToken = document.getElementById('settings-gh-token');

    if (inpP1) inpP1.value = s.partner1 || 'Santiago';
    if (inpP2) inpP2.value = s.partner2 || 'Sebas';
    if (inpSplit1) inpSplit1.value = s.split1 || 50;
    if (inpSplit2) inpSplit2.value = s.split2 || 50;
    if (selTheme) selTheme.value = s.theme || 'neon';
    if (inpGhToken && window.sync) inpGhToken.value = window.sync.token || '';
    const modalTokenInput = document.getElementById('modal-gh-token-input');
    if (modalTokenInput && window.sync) modalTokenInput.value = window.sync.token || '';
  }

  // Toggle Token Input Visibility (Password / Text)
  toggleTokenVisibility(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
      el.type = el.type === 'password' ? 'text' : 'password';
    }
  }

  // Save GitHub Token from Settings Tab
  async saveGitHubTokenFromSettings() {
    const tokenInput = document.getElementById('settings-gh-token');
    const repoInput = document.getElementById('settings-gh-repo');
    const feedbackEl = document.getElementById('settings-token-feedback');
    const token = tokenInput ? tokenInput.value.trim().replace(/^["']|["']$/g, '') : '';
    const repo = repoInput ? repoInput.value.trim() : 'shenao356/boletas-rituales';

    if (!token) {
      this.showToast('Por favor ingresa un token válido de GitHub', 'warning');
      return;
    }

    if (window.sync) {
      window.sync.repo = repo;
      localStorage.setItem('rituales_gh_repo', repo);

      if (feedbackEl) {
        feedbackEl.className = 'block p-3 rounded-xl text-xs bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 animate-pulse';
        feedbackEl.innerHTML = '⏳ Verificando token con GitHub...';
      }

      const test = await window.sync.testConnection(token);

      if (test.ok) {
        if (feedbackEl) {
          feedbackEl.className = 'block p-3 rounded-xl text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300';
          feedbackEl.innerHTML = `<b>${test.message}</b>`;
        }
        this.showToast(`Conectado como @${test.username}`, 'success');
        await window.sync.pushToGitHub('Conexión desde Ajustes');
      } else {
        if (feedbackEl) {
          feedbackEl.className = 'block p-3 rounded-xl text-xs bg-rose-950/80 border border-rose-500/40 text-rose-300 leading-relaxed';
          feedbackEl.innerHTML = `<b>${test.message}</b>`;
        }
        this.showToast('Error al conectar con GitHub', 'error');
      }
    }
  }

  // Save GitHub Token from Modal
  async saveGitHubTokenFromModal() {
    const tokenInput = document.getElementById('modal-gh-token-input');
    const feedbackEl = document.getElementById('modal-token-feedback');
    const submitBtn = document.getElementById('btn-modal-token-submit');
    const token = tokenInput ? tokenInput.value.trim().replace(/^["']|["']$/g, '') : '';

    if (!token) {
      this.showToast('Por favor pega tu token de GitHub', 'warning');
      return;
    }

    if (window.sync) {
      if (feedbackEl) {
        feedbackEl.className = 'block p-3 rounded-xl text-xs bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 animate-pulse';
        feedbackEl.innerHTML = '⏳ Verificando token y permisos con GitHub...';
      }
      if (submitBtn) submitBtn.disabled = true;

      const test = await window.sync.testConnection(token);

      if (test.ok) {
        if (feedbackEl) {
          feedbackEl.className = 'block p-3 rounded-xl text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300';
          feedbackEl.innerHTML = `<b>${test.message}</b>`;
        }
        this.showToast(`Conectado como @${test.username}`, 'success');
        this.loadSettingsForm();

        await window.sync.pushToGitHub('Conexión inicial desde modal');

        if (typeof confetti === 'function') {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        }

        setTimeout(() => {
          this.closeModal('modal-github-token');
          if (submitBtn) submitBtn.disabled = false;
        }, 1500);
      } else {
        if (feedbackEl) {
          feedbackEl.className = 'block p-3 rounded-xl text-xs bg-rose-950/80 border border-rose-500/40 text-rose-300 leading-relaxed';
          feedbackEl.innerHTML = `<b>${test.message}</b>`;
        }
        this.showToast('Error al conectar con GitHub', 'error');
        if (submitBtn) submitBtn.disabled = false;
      }
    }
  }

  // Disconnect GitHub Token
  clearGitHubToken() {
    if (confirm('¿Desconectar el Token de GitHub? La app funcionará en modo local únicamente.')) {
      if (window.sync) window.sync.clearToken();
      this.loadSettingsForm();
      this.showToast('Token de GitHub eliminado', 'info');
    }
  }

  // Copy Direct Access Link with Token for Sebas
  copyDirectAccessLink() {
    const token = window.sync.token || '';
    if (!token) {
      this.showToast('Primero guarda tu token de GitHub', 'warning');
      return;
    }
    const currentBase = window.location.origin + window.location.pathname;
    const directUrl = `${currentBase}?token=${token}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(directUrl).then(() => {
        this.showToast('Enlace copiado. Envíalo a Sebas por WhatsApp para conexión en 1 toque', 'success');
      }).catch(() => {
        prompt('Copia este enlace de acceso directo para Sebas:', directUrl);
      });
    } else {
      prompt('Copia este enlace de acceso directo para Sebas:', directUrl);
    }
  }

  // Save Settings from form
  saveSettingsFromForm() {
    const partner1 = document.getElementById('settings-partner1')?.value.trim() || 'Santiago';
    const partner2 = document.getElementById('settings-partner2')?.value.trim() || 'Sebas';
    const split1 = parseFloat(document.getElementById('settings-split1')?.value) || 50;
    const split2 = 100 - split1;
    const theme = document.getElementById('settings-theme-select')?.value || 'neon';

    window.storage.saveSettings({
      partner1,
      partner2,
      split1,
      split2,
      theme
    });

    this.applyTheme(theme);
    this.showToast('Configuración guardada exitosamente', 'success');
    window.dashboard.update();
    window.sales.render();
  }

  // Setup Event Listeners
  setupEventListeners() {
    // Navigation clicks
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-nav-tab');
        this.switchTab(tab);
      });
    });

    // Theme selector
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.applyTheme(e.target.value);
      });
    }

    // Quick theme toggle button in header
    const quickThemeBtn = document.getElementById('btn-quick-theme');
    if (quickThemeBtn) {
      const themes = ['neon', 'obsidian', 'emerald', 'sunset'];
      const labels = {
        neon: 'Carbon & Cyan',
        obsidian: 'Pure Obsidian',
        emerald: 'Emerald Club',
        sunset: 'Sunset Terracotta'
      };
      quickThemeBtn.addEventListener('click', () => {
        const current = window.storage.settings.theme || 'neon';
        const nextIdx = (themes.indexOf(current) + 1) % themes.length;
        const nextTheme = themes[nextIdx];
        this.applyTheme(nextTheme);
        this.showToast(`Tema visual: ${labels[nextTheme] || nextTheme}`, 'info');
      });
    }

    // Search input in Sales
    const searchInput = document.getElementById('sales-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.sales.filterSearch = e.target.value;
        window.sales.render();
      });
    }

    // Search input in Customers
    const custSearchInput = document.getElementById('customers-search-input');
    if (custSearchInput) {
      custSearchInput.addEventListener('input', (e) => {
        this.customerSearch = e.target.value;
        this.renderCustomers();
      });
    }

    // Filter Payment
    const filterPayment = document.getElementById('filter-payment-select');
    if (filterPayment) {
      filterPayment.addEventListener('change', (e) => {
        window.sales.filterPayment = e.target.value;
        window.sales.activePreset = 'custom';
        window.sales.render();
      });
    }

    // Filter Liquidation
    const filterLiquidation = document.getElementById('filter-liquidation-select');
    if (filterLiquidation) {
      filterLiquidation.addEventListener('change', (e) => {
        window.sales.filterLiquidation = e.target.value;
        window.sales.activePreset = 'custom';
        window.sales.render();
      });
    }

    // Filter Event in Sales
    const filterEvent = document.getElementById('filter-event-select');
    if (filterEvent) {
      filterEvent.addEventListener('change', (e) => {
        window.sales.filterEvent = e.target.value;
        window.sales.render();
      });
    }

    // Filter Profit (positive/negative)
    const filterProfit = document.getElementById('filter-profit-select');
    if (filterProfit) {
      filterProfit.addEventListener('change', (e) => {
        window.sales.filterProfitRange = e.target.value;
        window.sales.render();
      });
    }

    // Sort By in Sales
    const sortSelect = document.getElementById('sales-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        window.sales.sortBy = e.target.value;
        window.sales.render();
      });
    }

    // Inventory Event Filter
    const filterInvEvent = document.getElementById('filter-inv-event-select');
    if (filterInvEvent) {
      filterInvEvent.addEventListener('change', (e) => {
        window.inventory.filterEvent = e.target.value;
        window.inventory.render();
      });
    }

    // Modal Live calculations in sale form
    ['sale-quantity', 'sale-cost-unit', 'sale-price-unit'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => window.sales.updateModalLiveCalculation());
      }
    });

    // Close modals on clicking overlay background
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          document.body.style.overflow = 'auto';
        }
      });
    });

    // JSON Backup import input
    const fileImportInput = document.getElementById('backup-file-input');
    if (fileImportInput) {
      fileImportInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const success = window.storage.importBackupJSON(event.target.result);
          if (success) {
            this.showToast('Respaldo importado y restaurado con éxito', 'success');
            this.applyTheme(window.storage.settings.theme);
            this.loadSettingsForm();
            window.dashboard.update();
            window.sales.render();
            window.inventory.render();
            this.renderCustomers();
          } else {
            this.showToast('Error al leer el archivo de respaldo', 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  // Liquidate all pending sales at once
  liquidateAllSalesModal() {
    const pendingSales = window.storage.sales.filter(s => s.liquidationStatus !== 'liquidado');
    if (!pendingSales.length) {
      this.showToast('No hay ventas pendientes por liquidar', 'info');
      return;
    }

    const totalToLiquidate = pendingSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const p1 = window.storage.settings.partner1 || 'Santiago';
    const p2 = window.storage.settings.partner2 || 'Sebas';
    const half = totalToLiquidate / 2;

    if (confirm(`¿Liquidar todas las ${pendingSales.length} ventas pendientes?\n\nTotal Utilidad a Repartir: ${window.sales.formatMoney(totalToLiquidate)}\n• ${p1}: ${window.sales.formatMoney(half)}\n• ${p2}: ${window.sales.formatMoney(half)}`)) {
      pendingSales.forEach(s => {
        window.storage.updateSale(s.id, { liquidationStatus: 'liquidado' });
      });

      this.showToast(`${pendingSales.length} ventas liquidadas entre ${p1} y ${p2}`, 'success');
      if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 75, origin: { y: 0.6 } });
      }
      window.dashboard.update();
      window.sales.render();
    }
  }

  // Reset demo data with confirmation
  confirmResetDemo() {
    if (confirm('¿Restablecer datos iniciales de Rituales Fest? Se reemplazarán las ventas actuales en este navegador.')) {
      window.storage.resetDemoData();
      this.showToast('Datos iniciales restablecidos', 'info');
      this.applyTheme(window.storage.settings.theme);
      this.loadSettingsForm();
      window.dashboard.update();
      window.sales.render();
      window.inventory.render();
      this.renderCustomers();
    }
  }
}

window.ui = new UIManager();

// Start on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.ui.init();
});
