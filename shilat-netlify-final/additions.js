// additions.js v2.4

// ── ייבוא פריטים מבינה ───────────────────────────────────────────────────────
async function importItemsFromBina() {
  const btn = document.getElementById('btnImportItems');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ טוען...'; }
  try {
    const res = await binaCall({ docType: -34 }, true);
    const items = res?.Items || res?.items || res?.Catalog || res?.catalog ||
                  res?.Data  || res?.data  || (Array.isArray(res) ? res : null);
    if (!items || !items.length) {
      toast('⚠️ לא נמצאו פריטים בבינה', 3000);
    } else {
      let added = 0, updated = 0;
      items.forEach(item => {
        const id    = String(item.itemId || item.ItemId || item.id || '');
        const name  = item.itemDesc || item.ItemDesc || item.name || '';
        const group = item.itemGroup || item.ItemGroup || item.category || 'כללי';
        const sale  = parseFloat(item.itemSalePrice || item.ItemSalePrice || 0);
        const cost  = parseFloat(item.itemBuyPrice  || item.ItemBuyPrice  || 0);
        if (!name) return;
        const idx = products.findIndex(p => p.binaId === id || p.code === id);
        const obj = {
          id: idx >= 0 ? products[idx].id : 'p' + Date.now() + Math.random().toString(36).slice(2,5),
          code: id, name, category: group, unit: 'יח׳',
          cost: cost || Math.round(sale / 1.5 * 100) / 100,
          sale: sale || Math.round(cost * 1.5 * 100) / 100,
          binaId: id
        };
        if (idx >= 0) { products[idx] = { ...products[idx], ...obj }; updated++; }
        else { products.push(obj); added++; }
      });
      saveAll();
      toast('✅ יובאו ' + added + ' פריטים' + (updated ? ', עודכנו ' + updated : ''), 3500);
      if (typeof renderCatalog === 'function') renderCatalog();
    }
  } catch(e) { toast('❌ ' + e.message, 4000); }
  if (btn) { btn.disabled = false; btn.textContent = '📦 ייבא פריטים מבינה'; }
}

// ── קריאת שירות ──────────────────────────────────────────────────────────────
function openNewServiceCall(custId) {
  const cust = customers.find(c => c.id === custId);
  if (!cust) { toast('לקוח לא נמצא'); return; }
  if (!cust.binaId) { toast('⚠️ הלקוח לא מקושר לבינה'); return; }
  document.getElementById('_scPanel')?.remove();
  const panel = document.createElement('div');
  panel.id = '_scPanel';
  panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:400;display:flex;align-items:flex-end;justify-content:center';
  panel.innerHTML = `<div style="width:100%;max-width:480px;background:var(--bg2);border-radius:20px 20px 0 0;padding:20px;max-height:90vh;overflow-y:auto;padding-bottom:30px">
    <div style="width:38px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px"></div>
    <div style="font-size:17px;font-weight:800;margin-bottom:14px">🔧 קריאת שירות — ${cust.name}</div>
    <div class="fg"><label class="fl">תיאור *</label><textarea class="fi" id="_scDesc" style="min-height:80px" placeholder="תאר את הבעיה..."></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fg"><label class="fl">תאריך</label><input class="fi" id="_scDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="fg"><label class="fl">עדיפות</label><select class="fi" id="_scPrio"><option value="1">🔴 דחוף</option><option value="2" selected>🟠 רגיל</option><option value="3">🔵 נמוך</option></select></div>
    </div>
    <div class="fg"><label class="fl">טכנאי</label><input class="fi" id="_scTech" value="${(typeof companySettings!=='undefined'?companySettings.defaultInspector:'')||''}"></div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn btn-o" style="flex:1;justify-content:center" onclick="document.getElementById('_scPanel').remove()">ביטול</button>
      <button class="btn btn-p" style="flex:2;justify-content:center;background:#2980b9;border-color:#2980b9" onclick="_saveServiceCall('${custId}','${cust.binaId}')">📤 שלח לבינה</button>
    </div>
  </div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click', e => { if(e.target===panel) panel.remove(); });
}

async function _saveServiceCall(custId, binaId) {
  const desc = document.getElementById('_scDesc')?.value.trim();
  if (!desc) { toast('יש להזין תיאור'); return; }
  const priority = parseInt(document.getElementById('_scPrio')?.value||'2');
  const date = document.getElementById('_scDate')?.value||new Date().toISOString().slice(0,10);
  const tech = document.getElementById('_scTech')?.value||'';
  const btn = document.querySelector('#_scPanel .btn-p');
  if (btn) { btn.disabled=true; btn.textContent='⏳ שולח...'; }
  try {
    const res = await binaCall({docType:17,custId:parseInt(binaId)||binaId,docDate:date,docRemark:desc,docSalesMan:tech,priority},false);
    const docNum = res?.docNum||res?.DocNum||'';
    toast('✅ קריאת שירות נפתחה'+(docNum?' #'+docNum:''), 3000);
    document.getElementById('_scPanel')?.remove();
    const cust = customers.find(c=>c.id===custId);
    tasks.push({id:'tk'+Date.now(),title:'🔧 קריאת שירות — '+(cust?.name||''),description:desc,priority:String(priority),status:'new',customerId:custId,assignee:tech,due:date,tags:['קריאת שירות'],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),comments:[],media:[],checklist:[]});
    saveAll(); _updateTaskBadge();
  } catch(e) {
    toast('❌ '+e.message, 4000);
    if (btn) { btn.disabled=false; btn.textContent='📤 שלח לבינה'; }
  }
}

// ── Badge משימות ──────────────────────────────────────────────────────────────
function _updateTaskBadge() {
  const open = typeof tasks!=='undefined' ? tasks.filter(t=>t.status!=='done'&&t.status!=='cancel').length : 0;
  const navBtn = document.getElementById('nb-tasks');
  if (!navBtn) return;
  navBtn.style.position = 'relative';
  let badge = document.getElementById('_taskBadge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = '_taskBadge';
    badge.style.cssText = 'position:absolute;top:5px;right:6px;background:#e74c3c;color:#fff;border-radius:50%;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:800;pointer-events:none';
    navBtn.appendChild(badge);
  }
  badge.style.display = open > 0 ? 'flex' : 'none';
  badge.textContent = open > 9 ? '9+' : String(open);
}

// ── setInterval — בדוק כל שנייה ──────────────────────────────────────────────
setInterval(() => {
  // כפתור ייבוא פריטים בעמוד בינה
  const binaPage = document.getElementById('p-bina');
  if (binaPage && binaPage.classList.contains('on') && !document.getElementById('btnImportItems')) {
    const bodies = binaPage.querySelectorAll('.bina-section-body');
    if (bodies.length > 0) {
      const body = bodies[0];
      const btn = document.createElement('button');
      btn.id = 'btnImportItems';
      btn.className = 'bina-btn full';
      btn.innerHTML = '📦 ייבא פריטים מבינה';
      btn.onclick = importItemsFromBina;
      body.appendChild(btn);
    }
  }

  // כפתור קריאת שירות בכרטיס לקוח
  const custDetail = document.getElementById('custDetailView');
  if (custDetail && custDetail.style.display !== 'none') {
    const binaBody = custDetail.querySelector('.bina-section-body');
    if (binaBody) {
      const loadBtn = binaBody.querySelector('button[onclick*="loadCustomerBinaOrders"]');
      if (loadBtn && !binaBody.querySelector('._sc_btn')) {
        const m = (loadBtn.getAttribute('onclick')||'').match(/loadCustomerBinaOrders\('([^']+)'/);
        if (m) {
          const custId = m[1];
          const cust = customers.find(c => c.id === custId);
          if (cust?.binaId) {
            const scBtn = document.createElement('button');
            scBtn.className = 'bina-btn full _sc_btn';
            scBtn.style.cssText = 'background:rgba(230,126,34,.18);color:#f39c12;border-color:rgba(230,126,34,.35);margin-top:4px';
            scBtn.innerHTML = '🔧 פתח קריאת שירות';
            scBtn.onclick = () => openNewServiceCall(custId);
            binaBody.appendChild(scBtn);
          }
        }
      }
    }
  }

  _updateTaskBadge();
}, 1000);

console.log('✅ additions.js v2.4 loaded');
