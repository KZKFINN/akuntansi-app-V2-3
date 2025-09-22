// Akuntansi Pro Modern v2.0
// Peningkatan: IndexedDB, UI/UX Modern, Dark Mode, Kode Terstruktur

document.addEventListener('DOMContentLoaded', () => {
  
  // === PENGELOLA DATABASE (IndexedDB) ===
  const dbManager = {
    db: null,
    dbName: 'AkuntansiProDB',
    dbVersion: 1,

    init() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onupgradeneeded = event => {
          this.db = event.target.result;
          if (!this.db.objectStoreNames.contains('transactions')) {
            this.db.createObjectStore('transactions', { keyPath: 'id' });
          }
          if (!this.db.objectStoreNames.contains('piutang')) {
            this.db.createObjectStore('piutang', { keyPath: 'id' });
          }
          if (!this.db.objectStoreNames.contains('hutang')) {
            this.db.createObjectStore('hutang', { keyPath: 'id' });
          }
          if (!this.db.objectStoreNames.contains('meta')) {
            this.db.createObjectStore('meta', { keyPath: 'key' });
          }
        };

        request.onsuccess = event => {
          this.db = event.target.result;
          resolve();
        };

        request.onerror = event => {
          console.error('Database error:', event.target.error);
          reject(event.target.error);
        };
      });
    },

    async get(storeName, key) {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      return store.get(key);
    },

    async getAll(storeName) {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.sort((a,b) => b.id - a.id)); // sort descending
            request.onerror = (event) => reject(event.target.error);
        });
    },

    async add(storeName, data) {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.add(data);
      return tx.complete;
    },

    async put(storeName, data) {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(data);
      return tx.complete;
    },

    async clear(storeName) {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      return tx.complete;
    }
  };

  // === PENGELOLA UI ===
  const uiManager = {
    elements: {
      saldoKas: document.getElementById('saldo-kas'),
      totalIncome: document.getElementById('total-income'),
      totalExpense: document.getElementById('total-expense'),
      profitLoss: document.getElementById('profit-loss'),
      totalPiutang: document.getElementById('total-piutang'),
      totalHutang: document.getElementById('total-hutang'),
      transactionsList: document.getElementById('transactions-list'),
      transactionsFull: document.getElementById('transactions-full'),
      piutangList: document.getElementById('piutang-list'),
      hutangList: document.getElementById('hutang-list'),
      searchInput: document.getElementById('search'),
      toastContainer: document.getElementById('toast-container'),
      modal: {
          container: document.getElementById('modal-container'),
          title: document.getElementById('modal-title'),
          body: document.getElementById('modal-body'),
          confirmBtn: document.getElementById('modal-confirm'),
          cancelBtn: document.getElementById('modal-cancel'),
      }
    },
    
    formatCurrency: (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0),

    showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      this.elements.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    },
    
    showModal(title, body) {
        return new Promise(resolve => {
            this.elements.modal.title.textContent = title;
            this.elements.modal.body.textContent = body;
            this.elements.modal.container.classList.remove('modal-hidden');

            const confirmHandler = () => {
                this.hideModal();
                resolve(true);
                this.elements.modal.confirmBtn.removeEventListener('click', confirmHandler);
                this.elements.modal.cancelBtn.removeEventListener('click', cancelHandler);
            };
            const cancelHandler = () => {
                this.hideModal();
                resolve(false);
                this.elements.modal.confirmBtn.removeEventListener('click', confirmHandler);
                this.elements.modal.cancelBtn.removeEventListener('click', cancelHandler);
            };

            this.elements.modal.confirmBtn.addEventListener('click', confirmHandler);
            this.elements.modal.cancelBtn.addEventListener('click', cancelHandler);
        });
    },

    hideModal() {
        this.elements.modal.container.classList.add('modal-hidden');
    },

    updateStats(stats) {
      this.elements.saldoKas.textContent = this.formatCurrency(stats.kas);
      this.elements.totalIncome.textContent = this.formatCurrency(stats.pendapatan);
      this.elements.totalExpense.textContent = this.formatCurrency(stats.pengeluaran);
      const profit = stats.pendapatan - stats.pengeluaran;
      this.elements.profitLoss.textContent = this.formatCurrency(profit);
      this.elements.profitLoss.className = `big ${profit >= 0 ? 'value-income' : 'value-expense'}`;
      this.elements.totalPiutang.textContent = this.formatCurrency(stats.piutang);
      this.elements.totalHutang.textContent = this.formatCurrency(stats.hutang);
    },
    
    createTxElem(t) {
        const div = document.createElement('div');
        div.className = `tx ${t.type}`;
        div.innerHTML = `
            <div class="tx-left">
                <div class="category">${t.category}</div>
                <div class="meta">${new Date(t.id).toLocaleDateString('id-ID')} • ${t.description || ''}</div>
            </div>
            <div class="tx-right">
                <div class="amount">${this.formatCurrency(t.amount)}</div>
                <div class="meta">${t.type}</div>
            </div>
        `;
        return div;
    },

    renderTransactions(transactions) {
      this.elements.transactionsList.innerHTML = '';
      this.elements.transactionsFull.innerHTML = '';
      const preview = transactions.slice(0, 10);
      const previewFragment = document.createDocumentFragment();
      const fullFragment = document.createDocumentFragment();
      
      preview.forEach(t => previewFragment.appendChild(this.createTxElem(t)));
      transactions.forEach(t => fullFragment.appendChild(this.createTxElem(t)));

      this.elements.transactionsList.appendChild(previewFragment);
      this.elements.transactionsFull.appendChild(fullFragment);
    },

    renderPiutang(piutang) {
        this.elements.piutangList.innerHTML = '';
        piutang.forEach(p => {
            const d = document.createElement('div');
            d.className = 'tx';
            const rightContent = p.status === 'lunas'
                ? `<div class="meta">✅ Lunas</div>`
                : `<button class="ghost" data-id="${p.id}" data-action="lunaskan-piutang">Tandai Lunas</button>`;
            
            d.innerHTML = `
                <div class="tx-left"><strong>${p.name}</strong><div class="meta">${new Date(p.id).toLocaleDateString('id-ID')}</div></div>
                <div class="tx-right"><strong>${this.formatCurrency(p.amount)}</strong>${rightContent}</div>
            `;
            this.elements.piutangList.appendChild(d);
        });
    },

    renderHutang(hutang) {
        this.elements.hutangList.innerHTML = '';
        hutang.forEach(h => {
            const d = document.createElement('div');
            d.className = 'tx';
            const rightContent = h.status === 'lunas'
                ? `<div class="meta">✅ Lunas</div>`
                : `<button class="ghost" data-id="${h.id}" data-action="lunaskan-hutang">Bayar Hutang</button>`;
            
            d.innerHTML = `
                <div class="tx-left"><strong>${h.name}</strong><div class="meta">${new Date(h.id).toLocaleDateString('id-ID')}</div></div>
                <div class="tx-right"><strong>${this.formatCurrency(h.amount)}</strong>${rightContent}</div>
            `;
            this.elements.hutangList.appendChild(d);
        });
    },
    
    filterTransactions(query) {
      const q = query.toLowerCase();
      Array.from(this.elements.transactionsFull.children).forEach(node => {
        node.style.display = node.innerText.toLowerCase().includes(q) ? '' : 'none';
      });
    }
  };

  // === APLIKASI UTAMA ===
  const app = {
    async init() {
      await dbManager.init();
      this.addEventListeners();
      this.initTheme();
      this.loadAllData();
    },

    async loadAllData() {
      const [transactions, piutang, hutang] = await Promise.all([
        dbManager.getAll('transactions'),
        dbManager.getAll('piutang'),
        dbManager.getAll('hutang')
      ]);
      
      this.calculateAndRender(transactions, piutang, hutang);
    },
    
    calculateAndRender(transactions, piutang, hutang) {
        const stats = {
            pendapatan: transactions.filter(t => t.type === 'pemasukan').reduce((a, b) => a + b.amount, 0),
            pengeluaran: transactions.filter(t => t.type === 'pengeluaran').reduce((a, b) => a + b.amount, 0),
            piutang: piutang.filter(p => p.status !== 'lunas').reduce((a, b) => a + b.amount, 0),
            hutang: hutang.filter(h => h.status !== 'lunas').reduce((a, b) => a + b.amount, 0),
        };
        stats.kas = stats.pendapatan - stats.pengeluaran;

        uiManager.updateStats(stats);
        uiManager.renderTransactions(transactions);
        uiManager.renderPiutang(piutang);
        uiManager.renderHutang(hutang);
    },

    addEventListeners() {
      // Navigasi
      document.querySelectorAll('.menu-btn').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById(btn.dataset.screen).style.display = 'block';
      }));
      
      // Form
      document.getElementById('transaction-form').addEventListener('submit', this.addTransaction.bind(this));
      document.getElementById('reset-transaction').addEventListener('click', () => document.getElementById('transaction-form').reset());
      document.getElementById('add-piutang-form').addEventListener('submit', this.addPiutang.bind(this));
      document.getElementById('add-hutang-form').addEventListener('submit', this.addHutang.bind(this));
      
      // Aksi di list
      uiManager.elements.piutangList.addEventListener('click', e => {
        if (e.target.dataset.action === 'lunaskan-piutang') this.lunaskanPiutang(parseInt(e.target.dataset.id));
      });
      uiManager.elements.hutangList.addEventListener('click', e => {
        if (e.target.dataset.action === 'lunaskan-hutang') this.lunaskanHutang(parseInt(e.target.dataset.id));
      });
      
      // Aksi Laporan & Global
      document.getElementById('export-json').addEventListener('click', this.exportData.bind(this));
      document.getElementById('btn-backup').addEventListener('click', this.exportData.bind(this));
      document.getElementById('btn-import').addEventListener('click', this.importData.bind(this));
      document.getElementById('clear-data').addEventListener('click', this.resetData.bind(this));
      document.getElementById('btn-theme-toggle').addEventListener('click', this.toggleTheme.bind(this));

      // Pencarian
      uiManager.elements.searchInput.addEventListener('input', e => uiManager.filterTransactions(e.target.value));
    },

    // Aksi-aksi
    async addTransaction(e) {
      e.preventDefault();
      const form = e.target;
      const t = {
        id: Date.now(),
        type: form.querySelector('#transaction-type').value,
        category: form.querySelector('#transaction-category').value || 'Umum',
        amount: parseFloat(form.querySelector('#transaction-amount').value) || 0,
        description: form.querySelector('#transaction-description').value || ''
      };
      await dbManager.add('transactions', t);
      this.loadAllData();
      form.reset();
      uiManager.showToast('Transaksi berhasil disimpan!');
    },

    async addPiutang(e) {
      e.preventDefault();
      const form = e.target;
      const p = {
        id: Date.now(),
        name: form.querySelector('#piutang-name').value || 'Debitur',
        amount: parseFloat(form.querySelector('#piutang-amount').value) || 0,
        status: 'belum'
      };
      await dbManager.add('piutang', p);
      this.loadAllData();
      form.reset();
      uiManager.showToast('Piutang berhasil ditambahkan!');
    },

    async addHutang(e) {
      e.preventDefault();
      const form = e.target;
      const h = {
        id: Date.now(),
        name: form.querySelector('#hutang-name').value || 'Kreditur',
        amount: parseFloat(form.querySelector('#hutang-amount').value) || 0,
        status: 'belum'
      };
      await dbManager.add('hutang', h);
      this.loadAllData();
      form.reset();
      uiManager.showToast('Hutang berhasil ditambahkan!');
    },
    
    async lunaskanPiutang(id) {
        const confirmed = await uiManager.showModal('Konfirmasi Pelunasan', 'Tandai piutang sebagai lunas? Ini akan menambah transaksi pemasukan baru.');
        if (confirmed) {
            const piutang = await dbManager.get('piutang', id);
            if (!piutang) return;

            piutang.status = 'lunas';
            const transaction = {
                id: Date.now(),
                type: 'pemasukan',
                category: 'Pelunasan Piutang',
                amount: piutang.amount,
                description: `Pelunasan dari ${piutang.name}`
            };
            
            await Promise.all([
                dbManager.put('piutang', piutang),
                dbManager.add('transactions', transaction)
            ]);
            
            this.loadAllData();
            uiManager.showToast('Piutang ditandai lunas.');
        }
    },
    
    async lunaskanHutang(id) {
        const confirmed = await uiManager.showModal('Konfirmasi Pembayaran', 'Bayar hutang ini sekarang? Ini akan menambah transaksi pengeluaran baru.');
        if (confirmed) {
            const hutang = await dbManager.get('hutang', id);
            if (!hutang) return;

            hutang.status = 'lunas';
            const transaction = {
                id: Date.now(),
                type: 'pengeluaran',
                category: 'Pembayaran Hutang',
                amount: hutang.amount,
                description: `Pembayaran kepada ${hutang.name}`
            };

            await Promise.all([
                dbManager.put('hutang', hutang),
                dbManager.add('transactions', transaction)
            ]);
            
            this.loadAllData();
            uiManager.showToast('Hutang berhasil dibayar.');
        }
    },

    // Manajemen Data
    async exportData() {
        const data = {
            transactions: await dbManager.getAll('transactions'),
            piutang: await dbManager.getAll('piutang'),
            hutang: await dbManager.getAll('hutang')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `akuntansi-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async e => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                if (data.transactions && data.piutang && data.hutang) {
                    const confirmed = await uiManager.showModal('Restore Data', 'Ini akan menimpa semua data yang ada. Lanjutkan?');
                    if (confirmed) {
                        await Promise.all([
                            dbManager.clear('transactions'),
                            dbManager.clear('piutang'),
                            dbManager.clear('hutang')
                        ]);
                        await Promise.all([
                            ...data.transactions.map(item => dbManager.add('transactions', item)),
                            ...data.piutang.map(item => dbManager.add('piutang', item)),
                            ...data.hutang.map(item => dbManager.add('hutang', item))
                        ]);
                        this.loadAllData();
                        uiManager.showToast('Data berhasil di-restore!');
                    }
                } else {
                    uiManager.showToast('Format file backup tidak valid.', 'error');
                }
            } catch (err) {
                uiManager.showToast('Gagal memproses file.', 'error');
                console.error(err);
            }
        };
        input.click();
    },

    async resetData() {
        const confirmed = await uiManager.showModal('Reset Data', 'ANDA YAKIN? Semua data transaksi, piutang, dan hutang akan dihapus permanen.');
        if (confirmed) {
            await Promise.all([
                dbManager.clear('transactions'),
                dbManager.clear('piutang'),
                dbManager.clear('hutang')
            ]);
            this.loadAllData();
            uiManager.showToast('Semua data berhasil direset.');
        }
    },
    
    // Tema
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    },

    updateThemeIcon(theme) {
        document.getElementById('theme-icon-sun').style.display = theme === 'light' ? 'block' : 'none';
        document.getElementById('theme-icon-moon').style.display = theme === 'dark' ? 'block' : 'none';
    }
  };

  app.init();
  
  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('Service worker terdaftar:', reg))
        .catch(err => console.log('Pendaftaran service worker gagal:', err));
    });
  }
});
