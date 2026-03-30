// ─── ADDITIONS.JS — שילת PWA v2.1 ───────────────────────────────────────────

// ── 1. ייבוא פריטים מבינה (docType -34) ──────────────────────────────────────

async function importItemsFromBina() {
  const btn = document.getElementById('btnImportItems');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ טוען פריטים מבינה...'; }

  try {
    const res = await binaCall({ docType: -34 }, true);
    const items = res?.Items || res?.items || res?.Catalog || res?.catalog ||
                  res?.Data || res?.data || (Array.isArray(res) ? res : null);

    if (!items || !items.length) {
      toast('⚠️ לא נמצאו פריטים בבינה', 3000);
      if (btn) { btn.disabled = false; btn.textContent = '📦 ייבא פריטים מבינה'; }
      return;
    }

    let added = 0, updated = 0;
    items.forEach(item => {
      const id    = String(item.itemId   || item.ItemId   || item.id    || '');
      const name  = item.itemDesc  || item.ItemDesc  || item.name  || '';
      const group = item.itemGroup || item.ItemGroup || item.category || 'כללי';
      const sale  = parseFloat(item.itemSalePrice || item.ItemSalePrice || item.salePrice || 0);
      const cost  = parseFloat(item.itemBuyPrice  || item.ItemBuyPrice  || item.buyPrice  || 0);
      if (!name) return;
      const existing = products.findIndex(p =>
        (p.binaId && p.binaId === id) || (p.code && p.code === id)
      );
      const obj = {
        id:       existing >= 0 ? products[existing].id : 'p' + Date.now() + Math.random().toString(36).slice(2,5),
        code:     id, name, category: group, unit: 'יח׳',
        cost:     cost  || Math.round(sale / 1.5 * 100) / 100,
        sale:     sale  || Math.round(cost * 1.5 * 100) / 100,
        binaId:   id
      };
      if (existing >= 0) { products[existing] = { ...products[existing], ...obj }; updated++; }
      else               { products.push(obj); added++; }
    });

    saveAll();
    toast('✅ יובאו ' + added + ' פריטים חדשים' + (updated ? ', עודכנו ' + updated : ''), 3500);
    if (typeof renderCatalog === 'function') renderCatalog();

  } catch(e) {
    toast('❌ ' + e.message, 4000);
  }
  if (btn) { btn.disabled = false; btn.textContent = '📦 ייבא פריטים מבינה'; }
}

// ── 2. Patch renderBinaPage — הוסף כפתור ייבוא פריטים ───────────────────────

const _orig_renderBinaPage = window.renderBinaPage;
window.renderBinaPage = function() {
  if (_orig_renderBinaPage) _orig_renderBinaPage.call(this);
  setTimeout(() => {
    const sections = document.querySelectorAll('#p-bina .bina-section-body');
    sections.forEach(sec => {
      if (!document.getElementById('btnImportItems') && sec.querySelector('.bina-btn')) {
        const btn = document.createElement('button');
        btn.id = 'btnImportItems';
        btn.className = 'bina-btn full';
        btn.innerHTML = '📦 ייבא פריטים מבינה';
        btn.onclick = importItemsFromBina;
        sec.appendChild(btn);
      }
    });
  }, 200);
};

// ── 3. קריאת שירות ───────────────────────────────────────────────────────────

function openNewServiceCall(custId) {
  const cust = customers.find(c => c.id === custId);
  if (!cust) { toast('לקוח לא נמצא'); return; }
  if (!cust.binaId) { toast('⚠️ הלקוח לא מקושר לבינה'); return; }
  document.getElementById('_scPanel')?.remove();
  const panel = document.createElement('div');
  panel.id = '_scPanel';
  panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:400;display:flex;align-items:flex-end;justify-content:center';
  panel.innerHTML = `
    <div style="width:100%;max-width:480px;background:var(--bg2);border-radius:20px 20px 0 0;padding:20px;max-height:90vh;overflow-y:auto;padding-bottom:calc(20px + env(safe-area-inset-bottom))">
      <div style="width:38px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 16px"></div>
      <div style="font-size:17px;font-weight:800;margin-bottom:16px">🔧 קריאת שירות — ${cust.name}</div>
      <div style="background:rgba(41,128,185,.1);border:1px solid rgba(41,128,185,.3);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:#5dade2">
        לקוח בינה: <strong>${cust.name}</strong> (ID: ${cust.binaId})
      </div>
      <div class="fg"><label class="fl">תיאור הקריאה *</label>
        <textarea class="fi" id="_scDesc" placeholder="תאר את הבעיה / הדרישה..." style="min-height:90px"></textarea>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="fg"><label class="fl">תאריך מבוקש</label>
          <input class="fi" id="_scDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="fg"><label class="fl">עדיפות</label>
          <select class="fi" id="_scPrio">
            <option value="1">🔴 דחוף</option>
            <option value="2" selected>🟠 רגיל</option>
            <option value="3">🔵 נמוך</option>
          </select>
        </div>
      </div>
      <div class="fg"><label class="fl">שם הטכנאי</label>
        <input class="fi" id="_scTech" type="text" value="${(typeof companySettings !== 'undefined' ? companySettings.defaultInspector : '') || ''}">
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button class="btn btn-o" style="flex:1;justify-content:center" onclick="document.getElementById('_scPanel').remove()">ביטול</button>
        <button class="btn btn-p" style="flex:2;justify-content:center;background:#2980b9;border-color:#2980b9"
          onclick="_saveServiceCall('${custId}','${cust.binaId}')">📤 שלח לבינה</button>
      </div>
    </div>`;
  document.body.appendChild(panel);
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
  setTimeout(() => document.getElementById('_scDesc')?.focus(), 300);
}

async function _saveServiceCall(custId, binaId) {
  const desc = document.getElementById('_scDesc')?.value.trim();
  if (!desc) { toast('יש להזין תיאור'); return; }
  const priority = parseInt(document.getElementById('_scPrio')?.value || '2');
  const date     = document.getElementById('_scDate')?.value || new Date().toISOString().slice(0,10);
  const tech     = document.getElementById('_scTech')?.value || '';
  const saveBtn  = document.querySelector('#_scPanel .btn-p');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ שולח...'; }
  try {
    const res = await binaCall({ docType: 17, custId: parseInt(binaId)||binaId, docDate: date, docRemark: desc, docSalesMan: tech, priority }, false);
    const docNum = res?.docNum || res?.DocNum || res?.orderId || res?.id || '';
    toast('✅ קריאת שירות נפתחה' + (docNum ? ' #' + docNum : ''), 3000);
    document.getElementById('_scPanel')?.remove();
    const cust = customers.find(c => c.id === custId);
    tasks.push({ id: 'tk'+Date.now(), title: '🔧 קריאת שירות — '+(cust?.name||''), description: desc, priority: String(priority), status: 'new', customerId: custId, assignee: tech, due: date, tags: ['קריאת שירות','בינה'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), comments: [], media: [], checklist: [], binaDocNum: String(docNum) });
    saveAll();
  } catch(e) {
    toast('❌ ' + e.message, 4000);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '📤 שלח לבינה'; }
  }
}

// ── 4. Patch showCustDetail ───────────────────────────────────────────────────

const _orig_showCustDetail = window.showCustDetail;
window.showCustDetail = function(id) {
  if (_orig_showCustDetail) _orig_showCustDetail.call(this, id);
  setTimeout(() => {
    const cust = customers.find(c => c.id === id);
    if (!cust?.binaId) return;
    const binaBody = document.querySelector('#custDetailView .bina-section-body');
    if (binaBody && !document.getElementById('_scBtn_'+id)) {
      const btn = document.createElement('button');
      btn.id = '_scBtn_'+id;
      btn.className = 'bina-btn full';
      btn.style.cssText = 'background:rgba(230,126,34,.18);color:#f39c12;border-color:rgba(230,126,34,.35);margin-top:4px';
      btn.innerHTML = '🔧 פתח קריאת שירות';
      btn.onclick = () => openNewServiceCall(id);
      binaBody.appendChild(btn);
    }
  }, 200);
};

// ── 5. Badge משימות פתוחות ───────────────────────────────────────────────────

function _updateTaskBadge() {
  const open = (typeof tasks !== 'undefined') ? tasks.filter(t => t.status !== 'done' && t.status !== 'cancel').length : 0;
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

const _orig_saveTask = window.saveTask;
if (_orig_saveTask) {
  window.saveTask = function() { _orig_saveTask.call(this); setTimeout(_updateTaskBadge, 100); };
}
setTimeout(_updateTaskBadge, 800);

// ── 6. תיקון goPage למשימות ──────────────────────────────────────────────────

const _orig_goPage = window.goPage;
window.goPage = function(p) {
  if (_orig_goPage) _orig_goPage.call(this, p);
  if (p === 'tasks') {
    setTimeout(() => {
      if (typeof renderTaskStats   === 'function') renderTaskStats();
      if (typeof renderTaskFilters === 'function') renderTaskFilters();
      if (typeof currentTaskView !== 'undefined') {
        if (currentTaskView === 'list' && typeof renderTaskList  === 'function') renderTaskList();
        else if (typeof renderTaskBoard === 'function') renderTaskBoard();
      }
    }, 150);
  }
};

console.log('✅ additions.js v2.1 loaded');
