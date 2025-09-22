// Modern Akuntansi Pro - Full features (transactions, piutang, hutang, reports, backup/restore)
// storage key
const APP_KEY = 'akuntansi_pro_modern_v1';
let appData = {transaksi:[], piutang:[], hutang:[], kas:0, pendapatan:0, pengeluaran:0};

// helpers
function formatCurrency(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR'}).format(n||0) }
function byId(id){ return document.getElementById(id) }

// load & save
function load(){ try{ const raw = localStorage.getItem(APP_KEY); if(raw) appData = JSON.parse(raw); }catch(e){console.warn(e);} updateUI(); }
function save(){ localStorage.setItem(APP_KEY, JSON.stringify(appData)); updateUI(); }

// update UI
function updateUI(){
  byId('saldo-kas').textContent = formatCurrency(appData.kas);
  byId('total-income').textContent = formatCurrency(appData.pendapatan);
  byId('total-expense').textContent = formatCurrency(appData.pengeluaran);
  byId('profit-loss').textContent = formatCurrency(appData.pendapatan - appData.pengeluaran);
  byId('total-piutang').textContent = formatCurrency( appData.piutang.filter(p=>p.status!=='lunas').reduce((a,b)=>a+b.amount,0) );
  byId('total-hutang').textContent = formatCurrency( appData.hutang.filter(h=>h.status!=='lunas').reduce((a,b)=>a+b.amount,0) );

  renderTransactionsPreview();
  renderTransactionsFull();
  renderPiutang();
  renderHutang();
}

// render helpers
function createTxElem(t){
  const div = document.createElement('div'); div.className='tx';
  const left = document.createElement('div'); left.innerHTML = `<div style="font-weight:700">${t.category}</div><div class="meta">${t.date} • ${t.description||''}</div>`;
  const right = document.createElement('div'); right.innerHTML = `<div style="font-weight:700">${formatCurrency(t.amount)}</div><div class="meta">${t.type}</div>`;
  div.appendChild(left); div.appendChild(right);
  return div;
}

function renderTransactionsPreview(){
  const el = byId('transactions-list'); el.innerHTML='';
  (appData.transaksi||[]).slice(0,10).forEach(t=> el.appendChild(createTxElem(t)) );
}
function renderTransactionsFull(){
  const el = byId('transactions-full'); el.innerHTML='';
  (appData.transaksi||[]).forEach(t=> el.appendChild(createTxElem(t)) );
}

// piutang / hutang render
function renderPiutang(){
  const el = byId('piutang-list'); el.innerHTML='';
  appData.piutang.forEach(p=>{
    const d = document.createElement('div'); d.className='tx';
    const left = document.createElement('div'); left.innerHTML = `<strong>${p.name}</strong><div class="meta">${p.date}</div>`;
    const right = document.createElement('div');
    if(p.status === 'lunas'){
      right.innerHTML = `<strong>${formatCurrency(p.amount)}</strong><div class="meta">✅ Lunas</div>`;
    } else {
      right.innerHTML = `<strong>${formatCurrency(p.amount)}</strong><div class="meta"><button class="ghost" onclick="lunaskanPiutang(${p.id})">Tandai Lunas</button></div>`;
    }
    d.appendChild(left); d.appendChild(right); el.appendChild(d);
  });
}

function renderHutang(){
  const el = byId('hutang-list'); el.innerHTML='';
  appData.hutang.forEach(h=>{
    const d = document.createElement('div'); d.className='tx';
    const left = document.createElement('div'); left.innerHTML = `<strong>${h.name}</strong><div class="meta">${h.date}</div>`;
    const right = document.createElement('div');
    if(h.status === 'lunas'){
      right.innerHTML = `<strong>${formatCurrency(h.amount)}</strong><div class="meta">✅ Lunas</div>`;
    } else {
      right.innerHTML = `<strong>${formatCurrency(h.amount)}</strong><div class="meta"><button class="ghost" onclick="lunaskanHutang(${h.id})">Bayar</button></div>`;
    }
    d.appendChild(left); d.appendChild(right); el.appendChild(d);
  });
}

// actions: add transaction
document.getElementById('transaction-form').addEventListener('submit', function(e){
  e.preventDefault();
  const type = this.querySelector('#transaction-type').value;
  const category = this.querySelector('#transaction-category').value || 'Umum';
  const amount = parseFloat(this.querySelector('#transaction-amount').value) || 0;
  const description = this.querySelector('#transaction-description').value || '';
  const t = { id: Date.now(), date: new Date().toLocaleDateString('id-ID'), time: new Date().toLocaleTimeString('id-ID'), type, category, amount, description };
  appData.transaksi.unshift(t);
  if(type==='pemasukan'){ appData.kas += amount; appData.pendapatan += amount; } else { appData.kas -= amount; appData.pengeluaran += amount; }
  save(); this.reset(); alert('Transaksi tersimpan');
});

document.getElementById('reset-transaction').addEventListener('click', ()=> document.getElementById('transaction-form').reset() );

// piutang
document.getElementById('add-piutang-form').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('piutang-name').value || 'Debitur';
  const amount = parseFloat(document.getElementById('piutang-amount').value) || 0;
  const p = { id: Date.now(), date: new Date().toLocaleDateString('id-ID'), name, amount, description:'', status:'belum' };
  appData.piutang.unshift(p); save(); this.reset(); alert('Piutang ditambahkan');
});

function lunaskanPiutang(id){
  const p = appData.piutang.find(x=>x.id===id); if(!p) return;
  if(confirm('Tandai piutang sebagai lunas?')){ p.status='lunas'; appData.kas += p.amount; appData.pendapatan += p.amount; appData.transaksi.unshift({ id: Date.now(), date: new Date().toLocaleDateString('id-ID'), type:'pemasukan', category:'Pelunasan Piutang', amount: p.amount, description:`Pelunasan ${p.name}` }); save(); }
}

// hutang
document.getElementById('add-hutang-form').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('hutang-name').value || 'Kreditur';
  const amount = parseFloat(document.getElementById('hutang-amount').value) || 0;
  const h = { id: Date.now(), date: new Date().toLocaleDateString('id-ID'), name, amount, description:'', status:'belum' };
  appData.hutang.unshift(h); save(); this.reset(); alert('Hutang ditambahkan');
});

function lunaskanHutang(id){
  const h = appData.hutang.find(x=>x.id===id); if(!h) return;
  if(confirm('Bayar hutang ini sekarang?')){ h.status='lunas'; appData.kas -= h.amount; appData.pengeluaran += h.amount; appData.transaksi.unshift({ id: Date.now(), date: new Date().toLocaleDateString('id-ID'), type:'pengeluaran', category:'Pelunasan Hutang', amount: h.amount, description:`Bayar ${h.name}` }); save(); }
}

// export/import & other actions
document.getElementById('export-json').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(appData, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup-akuntansi.json'; a.click();
});
document.getElementById('btn-backup').addEventListener('click', ()=> document.getElementById('export-json').click() );

document.getElementById('btn-import').addEventListener('click', ()=>{
  const input = document.createElement('input'); input.type='file'; input.accept='.json'; input.onchange = e => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader(); reader.onload = ev => {
      try { const data = JSON.parse(ev.target.result); if(data && typeof data === 'object'){ appData = data; save(); alert('Data berhasil di-restore'); } else alert('Format file salah'); } catch(err){ alert('File tidak valid'); }
    }; reader.readAsText(f);
  }; input.click();
});

document.getElementById('clear-data').addEventListener('click', ()=>{
  if(confirm('Reset semua data? Ini tidak bisa dibatalkan')){ appData = {transaksi:[], piutang:[], hutang:[], kas:0, pendapatan:0, pengeluaran:0}; save(); alert('Data direset'); }
});

// navigation
document.querySelectorAll('.menu-btn').forEach(btn => btn.addEventListener('click', ()=>{
  document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const screen = btn.dataset.screen;
  document.querySelectorAll('.screen').forEach(s=>s.style.display='none');
  document.getElementById(screen).style.display='block';
}));

// search simple filter
document.getElementById('search').addEventListener('input', function(){
  const q = this.value.toLowerCase();
  const full = document.getElementById('transactions-full'); Array.from(full.children).forEach(node => {
    const text = node.innerText.toLowerCase();
    node.style.display = text.includes(q) ? '' : 'none';
  });
});

// service worker registration
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW registered')).catch(()=>console.log('SW failed'));
}

// init
load();
