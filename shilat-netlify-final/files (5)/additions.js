// ═══════════════════════════════════════════════════════════════
// ADDITIONS v2 — ייבוא לקוחות / פריטים מבינה + קריאת שירות
// ═══════════════════════════════════════════════════════════════

// ── 1. ייבוא פריטים מבינה ──────────────────────────────────────

async function importItemsFromBina(){
  const btn = document.getElementById('btnImportBinaItems');
  if(btn){ btn.disabled=true; btn.textContent='⏳ טוען...'; }
  try{
    const res = await binaCall({ docType: 34 }, false);
    // Bina returns items in various keys
    const items = res?.Items || res?.items || res?.Data || res?.data || (Array.isArray(res)?res:[]);
    if(!items.length){
      toast('❌ לא נמצאו פריטים בבינה (docType 34)');
      if(btn){ btn.disabled=false; btn.textContent='☁️ ייבא מבינה'; }
      return;
    }
    showBinaItemsPreview(items);
  }catch(e){
    toast('❌ '+e.message, 4000);
    if(btn){ btn.disabled=false; btn.textContent='☁️ ייבא מבינה'; }
  }
}

let binaItemsPending = [];

function showBinaItemsPreview(items){
  // Map Bina fields to local product fields
  binaItemsPending = items.map(item => ({
    id: 'p'+Date.now()+Math.random().toString(36).slice(2,6),
    code: String(item.itemId||item.ItemId||item.id||''),
    name: item.itemDesc||item.ItemDesc||item.name||item.description||'',
    category: item.itemGroup||item.ItemGroup||item.group||'כללי',
    unit: item.itemUnit||item.unit||'יח׳',
    cost: parseFloat(item.itemBuyPrice||item.buyPrice||item.cost||0)||0,
    sale: parseFloat(item.itemSalePrice||item.salePrice||item.price||0)||0,
  })).filter(p=>p.name);

  // Apply margin if missing prices
  binaItemsPending = binaItemsPending.map(p=>{
    if(p.cost && !p.sale) p.sale = Math.round(p.cost*1.5*100)/100;
    if(p.sale && !p.cost) p.cost = Math.round(p.sale/1.5*100)/100;
    return p;
  });

  const existing = binaItemsPending.filter(p=>products.find(x=>x.code&&x.code===p.code)).length;
  const newItems = binaItemsPending.length - existing;

  // Build preview modal
  const overlay = document.getElementById('modal-catalog-import');
  document.getElementById('importPreviewInfo').innerHTML=`
    <div style="color:#2ecc71;font-size:14px;font-weight:700">☁️ בינה ERP — ${binaItemsPending.length} פריטים</div>
    <div style="font-size:12px;color:var(--text2);margin-top:4px">${newItems} חדשים · ${existing} יעודכנו</div>
  `;
  const warnEl = document.getElementById('importWarning');
  if(existing){ warnEl.style.display='block'; warnEl.innerHTML=`⚠️ ${existing} פריטים קיימים יעודכנו`; }
  else warnEl.style.display='none';

  const preview = binaItemsPending.slice(0,15);
  let html=`<table style="width:100%;font-size:11px;border-collapse:collapse">
    <thead><tr style="background:var(--bg3)">
      <th style="padding:5px;text-align:right;border-bottom:1px solid var(--border)">קוד</th>
      <th style="padding:5px;text-align:right;border-bottom:1px solid var(--border)">שם</th>
      <th style="padding:5px;text-align:right;border-bottom:1px solid var(--border)">קבוצה</th>
      <th style="padding:5px;text-align:left;border-bottom:1px solid var(--border);direction:ltr">עלות</th>
      <th style="padding:5px;text-align:left;border-bottom:1px solid var(--border);direction:ltr">מכירה</th>
    </tr></thead><tbody>`;
  preview.forEach(p=>{
    html+=`<tr>
      <td style="padding:4px 5px;border-bottom:1px solid rgba(255,255,255,.04)">${p.code}</td>
      <td style="padding:4px 5px;border-bottom:1px solid rgba(255,255,255,.04)">${p.name}</td>
      <td style="padding:4px 5px;border-bottom:1px solid rgba(255,255,255,.04);color:var(--text2)">${p.category}</td>
      <td style="padding:4px 5px;border-bottom:1px solid rgba(255,255,255,.04);direction:ltr;text-align:left">₪${p.cost}</td>
      <td style="padding:4px 5px;border-bottom:1px solid rgba(255,255,255,.04);direction:ltr;text-align:left;color:#2ecc71">₪${p.sale}</td>
    </tr>`;
  });
  if(binaItemsPending.length>15) html+=`<tr><td colspan="5" style="padding:6px;text-align:center;color:var(--text2)">... ועוד ${binaItemsPending.length-15} פריטים</td></tr>`;
  html+='</tbody></table>';
  document.getElementById('importPreviewTable').innerHTML=html;
  document.getElementById('importConfirmBtn').onclick = confirmBinaItemsImport;
  document.getElementById('importConfirmBtn').disabled=false;
  openModal('modal-catalog-import');
}

function confirmBinaItemsImport(){
  if(!binaItemsPending.length) return;
  let added=0, updated=0;
  binaItemsPending.forEach(p=>{
    const existIdx = p.code ? products.findIndex(x=>x.code===p.code) : -1;
    if(existIdx>=0){ products[existIdx]={...products[existIdx],...p}; updated++; }
    else { products.push(p); added++; }
  });
  saveAll();
  closeModal('modal-catalog-import');
  binaItemsPending=[];
  toast(`✅ יובאו ${added} פריטים${updated?', עודכנו '+updated:''}`);
  renderCatalog();
  // Reset button
  const btn = document.getElementById('btnImportBinaItems');
  if(btn){ btn.disabled=false; btn.textContent='☁️ ייבא מבינה'; }
}

// ── 2. שיפור חיפוש לקוחות מבינה ──────────────────────────────

async function doBinaCustomerSearchV2(query){
  const container = document.getElementById('binaSearchResults');
  try{
    // Try multiple docTypes for customer search
    const payloads = [
      { docType: binaSettings.docTypeCust || -6 },
      { docType: -1 },  // common customer read
    ];
    
    // Add search term based on type
    const isNumeric = /^\d+$/.test(query);
    
    let results = [];
    for(const base of payloads){
      const payload = { ...base };
      if(isNumeric) payload.custId = parseInt(query);
      else payload.custName = query;
      
      try{
        const res = await binaCall(payload, true);
        const list = res?.Customers||res?.customers||res?.Data||res?.data||(Array.isArray(res)?res:[]);
        if(list.length){ results = list; break; }
      }catch(e){ continue; }
    }
    
    if(!results.length){
      container.innerHTML=`<div class="bina-empty">לא נמצאו לקוחות עבור "${query}"<br><span style="font-size:11px;color:var(--text2)">נסה מספר לקוח / חלק שם</span></div>`;
      return;
    }
    
    let html='';
    results.slice(0,30).forEach(c=>{
      const name  = c.custName||c.CustName||c.name||'ללא שם';
      const id    = c.custId||c.CustId||c.id||'';
      const addr  = [c.custAddress||c.address||'', c.custCity||c.city||''].filter(Boolean).join(', ');
      const phone = c.custPhone||c.phone||'';
      const email = c.custEmail||c.email||'';
      const custObj = JSON.stringify({custId:id,custName:name,custAddress:addr,custPhone:phone,custEmail:email}).replace(/"/g,'&quot;');
      html+=`<div class="bsearch-row" onclick="selectBinaCustomer(${custObj})">
        <div style="width:38px;height:38px;background:rgba(41,128,185,.15);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏢</div>
        <div>
          <div class="name">${name}</div>
          <div class="sub">
            ${id?'<span style="background:rgba(41,128,185,.2);color:#5dade2;padding:1px 6px;border-radius:4px;font-size:10px">ID:'+id+'</span> ':' '}
            ${addr?'📍 '+addr:''}${phone?' · 📞 '+phone:''}
          </div>
        </div>
      </div>`;
    });
    container.innerHTML = html;
  }catch(e){
    container.innerHTML=`<div class="bina-empty" style="color:#ff6b6b">❌ ${e.message}</div>`;
  }
}

// Override original function
const _origDebounce = window.debounceBinaSearch;
window.debounceBinaSearch = function(){
  clearTimeout(binaSearchTimer);
  const q = document.getElementById('binaSearchInput').value.trim();
  if(q.length < 2){
    document.getElementById('binaSearchResults').innerHTML='<div class="bina-empty">הקלד לפחות 2 תווים</div>';
    return;
  }
  document.getElementById('binaSearchResults').innerHTML='<div class="bina-empty" style="color:var(--orange)">⏳ מחפש בבינה...</div>';
  binaSearchTimer = setTimeout(()=>doBinaCustomerSearchV2(q), 400);
};

// ── 3. קריאת שירות ────────────────────────────────────────────

function openNewServiceCall(customerId){
  const c = customers.find(x=>x.id===customerId);
  
  // Build service call modal dynamically
  let existingOverlay = document.getElementById('modal-service-call');
  if(!existingOverlay){
    existingOverlay = document.createElement('div');
    existingOverlay.className = 'overlay';
    existingOverlay.id = 'modal-service-call';
    existingOverlay.innerHTML = `
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">🔧 פתיחת קריאת שירות</div>
        <input type="hidden" id="scCustId">
        <div class="fg">
          <label class="fl">לקוח</label>
          <input class="fi" id="scCustName" type="text" readonly style="background:rgba(41,128,185,.1)">
        </div>
        <div class="fg">
          <label class="fl">כותרת הקריאה *</label>
          <input class="fi" id="scTitle" type="text" placeholder="תאור תקלה / בקשה קצרה">
        </div>
        <div class="fg">
          <label class="fl">סוג קריאה</label>
          <select class="fi" id="scType">
            <option value="תקלה">🔴 תקלה דחופה</option>
            <option value="תחזוקה">🟡 תחזוקה מתוכננת</option>
            <option value="התקנה">🟢 התקנה חדשה</option>
            <option value="ביקורת">🔵 ביקורת / בדיקה</option>
            <option value="שאלה">⚪ שאלה / ייעוץ</option>
          </select>
        </div>
        <div class="fg">
          <label class="fl">תיאור מפורט</label>
          <textarea class="fi" id="scDesc" placeholder="פרט את הבעיה..." style="min-height:80px"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="fg">
            <label class="fl">עדיפות</label>
            <select class="fi" id="scPriority">
              <option value="1">🔴 דחוף</option>
              <option value="2" selected>🟠 רגיל</option>
              <option value="3">🟢 נמוך</option>
            </select>
          </div>
          <div class="fg">
            <label class="fl">תאריך יעד</label>
            <input class="fi" id="scDue" type="date">
          </div>
        </div>
        <div class="fg">
          <label class="fl">טכנאי מוקצה</label>
          <select class="fi" id="scAssignee"></select>
        </div>
        <div style="background:rgba(41,128,185,.08);border:1px solid rgba(41,128,185,.2);border-radius:8px;padding:10px;margin-bottom:12px;font-size:12px;color:var(--text2)">
          📌 הקריאה תיצור משימה מקומית ותישלח לבינה ERP (אם מחובר)
        </div>
        <div class="action-row">
          <button class="btn btn-o" onclick="closeModal('modal-service-call')">ביטול</button>
          <button class="btn btn-p" style="flex:2;justify-content:center" onclick="saveServiceCall()">🔧 פתח קריאה</button>
        </div>
      </div>`;
    existingOverlay.addEventListener('click', e=>{ if(e.target===existingOverlay) closeModal('modal-service-call'); });
    document.body.appendChild(existingOverlay);
  }
  
  document.getElementById('scCustId').value = customerId||'';
  document.getElementById('scCustName').value = c?c.name:'לא צוין';
  document.getElementById('scTitle').value = '';
  document.getElementById('scDesc').value = '';
  document.getElementById('scPriority').value = '2';
  const today = new Date(); today.setDate(today.getDate()+2);
  document.getElementById('scDue').value = today.toISOString().slice(0,10);
  
  // Populate assignees
  const asSel = document.getElementById('scAssignee');
  asSel.innerHTML = employees.filter(e=>e.active).map(e=>`<option value="${e.name}">${e.name} · ${e.role}</option>`).join('');
  
  openModal('modal-service-call');
}

async function saveServiceCall(){
  const title = document.getElementById('scTitle').value.trim();
  if(!title){ toast('יש להזין כותרת קריאה'); return; }
  
  const custId = document.getElementById('scCustId').value;
  const type = document.getElementById('scType').value;
  const desc = document.getElementById('scDesc').value;
  const priority = document.getElementById('scPriority').value;
  const due = document.getElementById('scDue').value;
  const assignee = document.getElementById('scAssignee').value;
  const c = customers.find(x=>x.id===custId);
  
  // Create local task
  const task = {
    id: 'tk'+Date.now(),
    title: `[${type}] ${title}`,
    description: desc,
    priority,
    status: 'new',
    assignee,
    due,
    customerId: custId,
    tags: ['קריאת שירות', type],
    waPhone: c?.phone||'',
    email: c?.email||'',
    checklist: [
      {text:'יצירת קשר עם לקוח', done:false},
      {text:'אבחון הבעיה', done:false},
      {text:'ביצוע טיפול', done:false},
      {text:'סגירת קריאה ותיעוד', done:false}
    ],
    comments: [],
    media: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tasks.push(task);
  saveAll();
  
  // Try to send to Bina as service doc
  let binaSent = false;
  if(binaConnected && c?.binaId){
    try{
      const payload = {
        docType: 17, // service call docType — common in Bina
        custId: parseInt(c.binaId)||c.binaId,
        docDate: due||new Date().toISOString().slice(0,10),
        docRemark: `[${type}] ${title}\n${desc}`,
        docSalesMan: assignee
      };
      const res = await binaCall(payload, false);
      const docNum = res?.docNum||res?.DocNum||res?.id||'';
      if(docNum) binaSent = true;
      toast(`✅ קריאה נפתחה${docNum?' #'+docNum:''}! 📋`, 3000);
    }catch(e){
      toast(`✅ קריאה נשמרה מקומית (בינה: ${e.message.slice(0,30)})`, 3000);
    }
  } else {
    toast('✅ קריאת שירות נפתחה!');
  }
  
  closeModal('modal-service-call');
  
  // Navigate to task
  goPage('tasks');
  setTimeout(()=>showTaskDetail(task.id), 200);
}

// ── 4. ייבוא לקוח מהיר ע"ס טלפון / שם ──────────────────────

function quickImportCustomerByPhone(phone){
  document.getElementById('binaSearchInput').value = phone;
  openBinaCustomerSearch('import');
  setTimeout(()=>doBinaCustomerSearchV2(phone), 300);
}

// ── 5. שיפור דף בינה — הוספת כפתור ייבוא פריטים ────────────

const _origRenderBinaPage = window.renderBinaPage;
window.renderBinaPage = function(){
  _origRenderBinaPage();
  // Update quick actions section
  const actSection = document.querySelector('#p-bina .bina-section-body');
  if(actSection && !document.getElementById('btnImportBinaItems')){
    const btn = document.createElement('button');
    btn.id = 'btnImportBinaItems';
    btn.className = 'bina-btn full';
    btn.innerHTML = '📦 ייבא פריטי קטלוג מבינה';
    btn.onclick = importItemsFromBina;
    btn.style.background = 'rgba(39,174,96,.15)';
    btn.style.color = '#2ecc71';
    btn.style.borderColor = 'rgba(39,174,96,.3)';
    actSection.insertBefore(btn, actSection.firstChild);
  }
};

// ── 6. הוסף כפתור "קריאת שירות" בדף לקוח ────────────────────

const _origShowCustDetail = window.showCustDetail;
window.showCustDetail = function(id){
  _origShowCustDetail(id);
  // Find the action buttons area and inject service call button
  setTimeout(()=>{
    const detView = document.getElementById('custDetailView');
    if(!detView) return;
    // Find the "הצעת מחיר" button and add service call after it
    const btns = detView.querySelectorAll('.btn.btn-o.btn-full');
    btns.forEach(btn=>{
      if(btn.textContent.includes('סקר שטח') && !detView.querySelector('[data-sc-injected]')){
        const scBtn = document.createElement('button');
        scBtn.className = 'btn btn-o btn-full';
        scBtn.setAttribute('data-sc-injected','1');
        scBtn.style.cssText='background:rgba(231,76,60,.12);color:#ff6b6b;border-color:rgba(231,76,60,.3)';
        scBtn.innerHTML = '🔧 פתח קריאת שירות';
        scBtn.onclick = ()=>openNewServiceCall(id);
        btn.parentNode.insertBefore(scBtn, btn.nextSibling);
      }
    });
  }, 150);
};

console.log('✅ Additions v2 loaded — ייבוא לקוחות/פריטים + קריאת שירות');
