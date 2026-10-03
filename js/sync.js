/**
 * Real-time GitHub Cloud Synchronization Module for BOLETAS RITUALES
 * Synchronizes sales and inventory directly with the GitHub repository (data/db.json)
 * so Santiago, Sebas, and all devices see identical real-time data anywhere in the world.
 */

class GitHubSyncManager {
  constructor() {
    this.repo = 'shenao356/boletas-rituales';
    this.branch = 'main';
    this.path = 'data/db.json';
    this.token = localStorage.getItem('rituales_gh_token') || '';
    this.currentSha = null;
    this.lastSyncTime = null;
    this.isSyncing = false;
    this.syncInterval = null;
    this.pushDebounceTimer = null;
  }

  init() {
    // Initial sync from GitHub
    this.pullFromGitHub(false);

    // Auto-poll GitHub every 25 seconds for new sales/inventory updates
    this.startAutoPolling();

    // Pull when tab gains focus (e.g. phone unlocked or browser tab opened)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullFromGitHub(false);
      }
    });

    this.updateStatusBadge();
  }

  // Convert UTF-8 string to base64 properly (handles emojis, accents)
  utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
  }

  // Decode base64 to UTF-8 string
  base64ToUtf8(b64) {
    return decodeURIComponent(Array.prototype.map.call(atob(b64), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  // Save Token
  setToken(token) {
    this.token = token.trim();
    localStorage.setItem('rituales_gh_token', this.token);
    this.updateStatusBadge();
    return this.pullFromGitHub(true);
  }

  // Clear Token
  clearToken() {
    this.token = '';
    localStorage.removeItem('rituales_gh_token');
    this.updateStatusBadge();
  }

  // Pull latest data from GitHub repository
  async pullFromGitHub(isManual = false) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateStatusBadge('syncing');

    try {
      let contentStr = null;

      if (this.token) {
        // Authenticated request via GitHub API
        const url = `https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${this.branch}&_t=${Date.now()}`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error('Token de GitHub sin permisos suficientes o expirado');
        }

        if (res.ok) {
          const fileData = await res.json();
          this.currentSha = fileData.sha;
          contentStr = this.base64ToUtf8(fileData.content.replace(/\s/g, ''));
        }
      } else {
        // Public unauthenticated request via raw GitHub content with cache-busting
        const rawUrl = `https://raw.githubusercontent.com/${this.repo}/${this.branch}/${this.path}?_t=${Date.now()}`;
        const res = await fetch(rawUrl);
        if (res.ok) {
          contentStr = await res.text();
        }
      }

      if (contentStr) {
        const remoteDb = JSON.parse(contentStr);

        // Check if remote data has updates
        const localUpdated = window.storage.settings.lastUpdated || 0;
        const remoteUpdated = new Date(remoteDb.updatedAt || 0).getTime();

        // Update if remote is newer or local is uninitialized
        if (remoteUpdated > localUpdated || isManual) {
          if (Array.isArray(remoteDb.inventory)) {
            window.storage.saveInventory(remoteDb.inventory);
          }
          if (Array.isArray(remoteDb.sales)) {
            window.storage.saveSales(remoteDb.sales);
          }
          if (remoteDb.settings) {
            window.storage.saveSettings({
              ...remoteDb.settings,
              lastUpdated: remoteUpdated
            });
          }

          // Refresh UI components
          window.dashboard.update();
          window.sales.render();
          window.inventory.render();
          if (window.ui && window.ui.renderCustomers) {
            window.ui.renderCustomers();
          }

          if (isManual) {
            window.ui.showToast('✅ Datos sincronizados con el repositorio GitHub', 'success');
          }
        }

        this.lastSyncTime = new Date();
        this.updateStatusBadge('synced');
      } else {
        this.updateStatusBadge('offline');
      }
    } catch (err) {
      console.warn('Sync pull error:', err);
      this.updateStatusBadge('error', err.message);
      if (isManual) {
        window.ui.showToast(`Error al sincronizar: ${err.message}`, 'error');
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // Trigger push to GitHub repository with debounce
  notifyChange(reason = 'Registro de venta / inventario') {
    if (!this.token) {
      this.updateStatusBadge('no-token');
      return;
    }

    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
    }

    // Debounce 1.5 seconds to batch rapid edits
    this.updateStatusBadge('pending');
    this.pushDebounceTimer = setTimeout(() => {
      this.pushToGitHub(reason);
    }, 1500);
  }

  // Push local state to GitHub repository
  async pushToGitHub(reason = 'Actualización') {
    if (!this.token) {
      this.updateStatusBadge('no-token');
      return;
    }

    this.isSyncing = true;
    this.updateStatusBadge('saving');

    try {
      // 1. Fetch current SHA to avoid conflict
      const getUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}?ref=${this.branch}&_t=${Date.now()}`;
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (getRes.ok) {
        const fileData = await getRes.json();
        this.currentSha = fileData.sha;
      }

      // 2. Prepare payload
      const updatedTimestamp = new Date().toISOString();
      window.storage.saveSettings({ lastUpdated: new Date(updatedTimestamp).getTime() });

      const dbPayload = {
        version: '1.0',
        updatedAt: updatedTimestamp,
        updatedBy: window.storage.settings.partner1 || 'Santiago',
        settings: window.storage.settings,
        inventory: window.storage.inventory,
        sales: window.storage.sales
      };

      const jsonStr = JSON.stringify(dbPayload, null, 2);
      const b64Content = this.utf8ToBase64(jsonStr);

      const putUrl = `https://api.github.com/repos/${this.repo}/contents/${this.path}`;
      const putBody = {
        message: `sync: ${reason} [${new Date().toLocaleTimeString('es-CO')}]`,
        content: b64Content,
        branch: this.branch
      };

      if (this.currentSha) {
        putBody.sha = this.currentSha;
      }

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(putBody)
      });

      if (!putRes.ok) {
        const errJson = await putRes.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${putRes.status}`);
      }

      const result = await putRes.json();
      this.currentSha = result.content?.sha || null;
      this.lastSyncTime = new Date();

      this.updateStatusBadge('synced');
      window.ui.showToast('☁️ Repositorio de GitHub actualizado con éxito', 'success');
    } catch (err) {
      console.error('Error pushing to GitHub:', err);
      this.updateStatusBadge('error', err.message);
      window.ui.showToast(`Error al guardar en GitHub: ${err.message}`, 'error');
    } finally {
      this.isSyncing = false;
    }
  }

  // Update visual badge in navbar
  updateStatusBadge(state = 'idle') {
    const badge = document.getElementById('cloud-sync-status-badge');
    const syncBtn = document.getElementById('btn-manual-sync');
    if (!badge) return;

    if (!this.token) {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-amber-400"></span>
        <span class="hidden sm:inline">Modo Local (Sin Token)</span>
        <span class="sm:hidden">Local</span>
      `;
      badge.className = 'text-[11px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-600/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-amber-900/60 transition';
      badge.onclick = () => window.ui.openModal('modal-github-token');
      return;
    }

    badge.onclick = () => window.sync.pullFromGitHub(true);

    if (state === 'syncing' || state === 'saving') {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span class="hidden sm:inline">${state === 'saving' ? 'Guardando en GitHub...' : 'Sincronizando...'}</span>
        <span class="sm:hidden">Sincronizando</span>
      `;
      badge.className = 'text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5';
      if (syncBtn) syncBtn.classList.add('animate-spin');
    } else if (state === 'error') {
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-rose-400"></span>
        <span class="hidden sm:inline">Error en Nube</span>
        <span class="sm:hidden">Error</span>
      `;
      badge.className = 'text-[11px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-600/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer';
      if (syncBtn) syncBtn.classList.remove('animate-spin');
    } else {
      const timeStr = this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Ahora';
      badge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="hidden sm:inline">GitHub Nube (${timeStr})</span>
        <span class="sm:hidden">Nube</span>
      `;
      badge.className = 'text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5 cursor-pointer hover:bg-emerald-900/60 transition';
      if (syncBtn) syncBtn.classList.remove('animate-spin');
    }
  }

  startAutoPolling() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    // Poll every 25 seconds
    this.syncInterval = setInterval(() => {
      if (!this.isSyncing) {
        this.pullFromGitHub(false);
      }
    }, 25000);
  }
}

window.sync = new GitHubSyncManager();

// Start on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.sync.init();
});
