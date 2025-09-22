// Full app script with Firebase Auth + Firestore integration
const APP_KEY = 'akuntansi_pro_production_v1';
let appData = {transaksi:[], piutang:[], hutang:[], kas:0, pendapatan:0, pengeluaran:0};

// Firebase config - REPLACE with your project's values
const firebaseConfig = {
  apiKey: "REPLACE_API_KEY",
  authDomain: "REPLACE_AUTH_DOMAIN",
  projectId: "REPLACE_PROJECT_ID",
  storageBucket: "REPLACE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_MSG_SENDER_ID",
  appId: "REPLACE_APP_ID"
};

// init firebase (compat)
if(window.firebase && !firebase.apps.length){
  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var firestore = firebase.firestore();
} else {
  console.warn('Firebase not loaded or already initialized');
}

// DOM helpers
const qs = s => document.querySelector(s); const qsa = s => document.querySelectorAll(s); const id = n => document.getElementById(n);
const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR'}).format(n||0);

// Local load/save
function loadLocal(){ try{ const raw = localStorage.getItem(APP_KEY); if(raw) appData = JSON.parse(raw); }catch(e){console.warn(e);} updateUI(); }
function saveLocal(){ localStorage.setItem(APP_KEY, JSON.stringify(appData)); updateUI(); }

// Cloud variables
let currentUser = null;
let userDocRef = null;
let userUnsubscribe = null;

// UI update and render functions (same as previous production script)
function updateUI(){
  id('saldo-kas').textContent = fmt(appData.kas);
  id('total-income').textContent = fmt(appData.pendapatan);
  id('total-expense').textContent = fmt(appData.pengeluaran);
  id('balance').textContent = fmt(appData.pendapatan - appData.pengeluaran);
  id('total-piutang').textContent = fmt((appData.piutang||[]).filter(p=>p.status!=='lunas').reduce((a,b)=>a+b.amount,0));
  id('total-hutang').textContent = fmt((appData.hutang||[]).filter(h=>h.status!=='lunas').reduce((a,b)=>a+b.amount,0));
  renderRecent(); renderFullTransactions(); renderPiutang(); renderHutang(); updateCharts();
}

function createTxNode(t){ const div = document.createElement('div'); div.className='tx'; div.innerHTML = `
  <div><div style="font-weight:700">${t.category}</div><div class="meta">${t.date} • ${t.description||''}</div></div>
  <div style="text-align:right"><div style="font-weight:700">${fmt(t.amount)}</div><div class="meta">${t.type}</div></div>`; return div; }
function renderRecent(){ const list = id('transactions-list'); list.innerHTML=''; (appData.transaksi||[]).slice(0,8).forEach(t=> list.appendChild(createTxNode(t))); }
function renderFullTransactions(){ const list = id('transactions-full'); list.innerHTML=''; (appData.transaksi||[]).forEach(t=> list.appendChild(createTxNode(t))); }
function renderPiutang(){ const el = id('piutang-list'); el.innerHTML=''; (appData.piutang||[]).forEach(p=>{ const d=document.createElement('div'); d.className='tx'; d.innerHTML = `<div><strong>${p.name}</strong><div class="meta">${p.date}</div></div><div><strong>${fmt(p.amount)}</strong><div class="meta">${p.status==='lunas' ? '✅ Lunas' : `<button class="ghost" onclick="lunaskanPiutang(${p.id})">Tandai Lunas</button>`}</div></div>`; el.appendChild(d); }); }
function renderHutang(){ const el = id('hutang-list'); el.innerHTML=''; (appData.hutang||[]).forEach(h=>{ const d=document.createElement('div'); d.className='tx'; d.innerHTML = `<div><strong>${h.name}</strong><div class="meta">${h.date}</div></div><div><strong>${fmt(h.amount)}</strong><div class="meta">${h.status==='lunas' ? '✅ Lunas' : `<button class="ghost" onclick="lunaskanHutang(${h.id})">Bayar</button>`}</div></div>`; el.appendChild(d); }); }

// Actions (transactions, piutang, hutang)
qs('#transaction-form').addEventListener('submit', e=>{ e.preventDefault(); const type = id('transaction-type').value; const category = id('transaction-category').value.trim(); const amount = parseFloat(id('transaction-amount').value||0); const description = id('transaction-description').value.trim(); const feedback = id('formFeedback'); feedback.textContent=''; if(!type||!category||!amount){ feedback.textContent='Please fill required fields correctly.'; return; } const t={id:Date.now(),date:new Date().toLocaleDateString('id-ID'),time:new Date().toLocaleTimeString('id-ID'),type,category,amount,description}; appData.transaksi.unshift(t); if(type==='pemasukan'){ appData.kas += amount; appData.pendapatan += amount; } else { appData.kas -= amount; appData.pengeluaran += amount; } save(); e.target.reset(); feedback.textContent='Transaction saved.'; });

qs('#resetForm').addEventListener('click', ()=>{ qs('#transaction-form').reset(); id('formFeedback').textContent='Form reset.'; });

qs('#add-piutang-form').addEventListener('submit', e=>{ e.preventDefault(); const name = id('piutang-name').value.trim()||'Debitur'; const amount = parseFloat(id('piutang-amount').value||0); if(!amount){ alert('Please enter valid amount'); return; } appData.piutang.unshift({id:Date.now(),date:new Date().toLocaleDateString('id-ID'),name,amount,status:'belum'}); save(); e.target.reset(); alert('Receivable added'); });

qs('#add-hutang-form').addEventListener('submit', e=>{ e.preventDefault(); const name = id('hutang-name').value.trim()||'Kreditur'; const amount = parseFloat(id('hutang-amount').value||0); if(!amount){ alert('Please enter valid amount'); return; } appData.hutang.unshift({id:Date.now(),date:new Date().toLocaleDateString('id-ID'),name,amount,status:'belum'}); save(); e.target.reset(); alert('Payable added'); });

function lunaskanPiutang(idv){ const p = appData.piutang.find(x=>x.id===idv); if(!p) return; if(confirm('Mark receivable as paid?')){ p.status='lunas'; appData.kas += p.amount; appData.pendapatan += p.amount; appData.transaksi.unshift({id:Date.now(),date:new Date().toLocaleDateString('id-ID'),type:'pemasukan',category:'Pelunasan Piutang',amount:p.amount,description:`Pelunasan ${p.name}`}); save(); } }
function lunaskanHutang(idv){ const h = appData.hutang.find(x=>x.id===idv); if(!h) return; if(confirm('Pay this payable now?')){ h.status='lunas'; appData.kas -= h.amount; appData.pengeluaran += h.amount; appData.transaksi.unshift({id:Date.now(),date:new Date().toLocaleDateString('id-ID'),type:'pengeluaran',category:'Pelunasan Hutang',amount:h.amount,description:`Bayar ${h.name}`}); save(); } }

// Export / Import / CSV / Print
id('exportBtn').addEventListener('click', ()=>{ const blob=new Blob([JSON.stringify(appData,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup-akuntansi.json'; a.click(); });
id('importBtn').addEventListener('click', ()=>{ const input=document.createElement('input'); input.type='file'; input.accept='.json'; input.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=ev=>{ try{ const data=JSON.parse(ev.target.result); if(data && typeof data==='object'){ appData=data; save(); alert('Data restored'); } else alert('Invalid file'); } catch(err){ alert('Invalid JSON file'); } }; reader.readAsText(f); }; input.click(); });
id('exportCsv').addEventListener('click', ()=>{ const rows=[['id','date','time','type','category','amount','description']]; (appData.transaksi||[]).forEach(t=> rows.push([t.id,t.date,t.time,t.type,t.category,t.amount,(t.description||'').replace(/\n/g,' ')])); const csv = rows.map(r=> r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='transactions.csv'; a.click(); });
id('printReport').addEventListener('click', ()=>{ window.print(); });
id('reportBtn').addEventListener('click', ()=>{ alert('Quick report generated (use Export/Print for full).'); });

// Clear data
if(id('clear-data')) id('clear-data').addEventListener('click', ()=>{ if(confirm('Reset all data? This cannot be undone')){ appData = {transaksi:[], piutang:[], hutang:[], kas:0, pendapatan:0, pengeluaran:0 }; save(); alert('Data reset'); } });

// Navigation & filters & search (same as production script)
qsa('.nav-btn').forEach(b=> b.addEventListener('click', ()=>{ qsa('.nav-btn').forEach(x=> x.classList.remove('active')); b.classList.add('active'); const screen=b.dataset.screen; qsa('[data-screen]').forEach(s=> s.style.display='none'); document.getElementById(screen).style.display='block'; }));
if(id('clearFilters')) id('clearFilters').addEventListener('click', ()=>{ id('filterType').value=''; id('filterCategory').value=''; renderFullTransactions(); });
if(id('filterType')) id('filterType').addEventListener('change', ()=> applyFilters());
if(id('filterCategory')) id('filterCategory').addEventListener('input', ()=> applyFilters());
if(id('search')) id('search').addEventListener('input', ()=> applySearch());
function applyFilters(){ const type = id('filterType').value; const cat = id('filterCategory').value.toLowerCase(); const full = id('transactions-full'); full.innerHTML=''; (appData.transaksi||[]).filter(t=> (type? t.type===type:true) && (cat? t.category.toLowerCase().includes(cat): true)).forEach(t=> full.appendChild(createTxNode(t))); }
function applySearch(){ const q = id('search').value.toLowerCase(); const full = id('transactions-full'); Array.from(full.children).forEach(node=>{ const txt = node.innerText.toLowerCase(); node.style.display = txt.includes(q) ? '' : 'none'; }); }

// Charts (same aggregation logic)
let lineChart, pieChart;
function updateCharts(){ try{
  const now = new Date(); const months=[]; for(let i=11;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i,1); months.push(d.toLocaleString('id-ID',{month:'short',year:'numeric'})); }
  const incomeSeries = new Array(12).fill(0), expenseSeries = new Array(12).fill(0);
  (appData.transaksi||[]).forEach(t=>{ const parts = t.date.split('/'); let d; if(parts.length===3){ d = new Date(parts[2], parts[1]-1, parts[0]); } else { d = new Date(t.date); } if(isNaN(d)) return; const monthIndex = ( (d.getFullYear()-now.getFullYear())*12 + d.getMonth() - now.getMonth() ) + 11; if(monthIndex>=0 && monthIndex<12){ if(t.type==='pemasukan') incomeSeries[monthIndex]+=t.amount; else expenseSeries[monthIndex]+=t.amount; } });
  if(lineChart) try{ lineChart.destroy(); }catch(e){} if(pieChart) try{ pieChart.destroy(); }catch(e){} const ctx = document.getElementById('lineChart').getContext('2d'); lineChart = new Chart(ctx, { type:'line', data:{ labels:months, datasets:[ { label:'Income', data:incomeSeries, borderColor:'#06b6d4', backgroundColor:'rgba(6,182,212,0.12)', tension:0.3, fill:true }, { label:'Expense', data:expenseSeries, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.12)', tension:0.3, fill:true } ] }, options:{ responsive:true, plugins:{ legend:{position:'bottom'} }, interaction:{mode:'index',intersect:false} } });
  const categories = {}; (appData.transaksi||[]).forEach(t=> categories[t.category] = (categories[t.category]||0) + t.amount ); const pieCtx = document.getElementById('pieChart').getContext('2d'); pieChart = new Chart(pieCtx, { type:'doughnut', data:{ labels:Object.keys(categories), datasets:[{ data:Object.values(categories), backgroundColor:Object.keys(categories).map((k,i)=> ['#06b6d4','#0ea5e9','#34d399','#f59e0b','#ef4444'][i%5]) }] }, options:{ responsive:true, plugins:{ legend:{position:'bottom'} } } });
} catch(e){ console.warn(e); } }

// --- Firebase Auth integration ---
// DOM auth elements
const authArea = id('auth-area'); const googleSignInBtn = id('googleSignIn'); const userProfile = id('user-profile'); const userNameEl = id('user-name'); const userPhotoEl = id('user-photo'); const signOutBtn = id('signOutBtn');

function showSignInUI(){ if(authArea) authArea.style.display=''; if(userProfile) userProfile.style.display='none'; }
function showSignedInUI(user){ if(authArea) authArea.style.display='none'; if(userProfile){ userProfile.style.display='flex'; userNameEl.textContent = user.displayName || user.email; userPhotoEl.src = user.photoURL || 'icon-192.png'; } }

if(typeof firebase !== 'undefined' && firebase.auth){
  // login click
  if(googleSignInBtn) googleSignInBtn.addEventListener('click', async ()=>{
    const provider = new firebase.auth.GoogleAuthProvider();
    try{ await firebase.auth().signInWithPopup(provider); } catch(err){ console.error(err); alert('Sign-in failed: '+err.message); }
  });

  if(signOutBtn) signOutBtn.addEventListener('click', async ()=>{ if(userUnsubscribe) userUnsubscribe(); await firebase.auth().signOut(); showSignInUI(); });

  // auth state listener
  firebase.auth().onAuthStateChanged(async (user)=>{
    if(user){
      currentUser = user;
      showSignedInUI(user);
      userDocRef = firebase.firestore().collection('users').doc(user.uid);
      try{
        const doc = await userDocRef.get();
        if(!doc.exists){
          await userDocRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp(), uid: user.uid, email: user.email, displayName: user.displayName || '', appData: appData });
        } else {
          const cloud = doc.data().appData;
          if(cloud){ appData = cloud; saveLocal(); }
        }
        if(userUnsubscribe) userUnsubscribe();
        userUnsubscribe = userDocRef.onSnapshot(snapshot=>{ if(!snapshot.exists) return; const data = snapshot.data(); if(!data) return; const cloudData = data.appData; if(!cloudData) return; appData = cloudData; saveLocal(); });
      } catch(err){ console.error('Firestore error', err); }
    } else {
      currentUser = null; userDocRef = null; if(userUnsubscribe){ userUnsubscribe(); userUnsubscribe = null; } showSignInUI();
    }
  });
} else {
  console.warn('Firebase SDK not found - Auth disabled');
  // hide auth area so user can use local-only app
  if(authArea) authArea.style.display = 'none';
}

// Override save() to sync local + cloud (debounced naive)
let saveTimer = null;
function save(){
  // local save
  localStorage.setItem(APP_KEY, JSON.stringify(appData));
  updateUI();
  // cloud save if signed in
  if(currentUser && userDocRef){
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async ()=>{
      try{ await userDocRef.set({ appData: appData, lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch(err){ console.error('Save to firestore failed', err); }
    }, 800);
  }
}

// initial load & charts
loadLocal(); updateCharts();

// service worker registration (optional)
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').then(()=>console.log('sw ok')).catch(()=>console.log('sw fail')); }
