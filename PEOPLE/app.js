/* ═══════════════════════════════════════════════════════
   PEOPLE — app.js  |  Plataforma de Eventos
   ═══════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────
   1. CONFIGURACIÓN
───────────────────────────────────────────────────── */
var API_BASE  = 'https://6aff19e83a0e70bc8d549b95.mockapi.io/v1';
var EP_EVENTS = API_BASE + '/events';
var EP_USERS  = API_BASE + '/users';

var ADMIN_CREDENTIALS = { user: 'admin', pass: 'people2024' };

var ZONES = [
  { id:'lounge',   label:'Lounge',    max:10, mult:2.5, emoji:'🛋',  pill:'lounge'   },
  { id:'supervip', label:'Super VIP', max:8,  mult:3.5, emoji:'👑',  pill:'supervip' },
  { id:'vip',      label:'VIP',       max:6,  mult:2.0, emoji:'⭐',  pill:'vip'      },
  { id:'general',  label:'General',   max:4,  mult:1.0, emoji:'🎉',  pill:'general'  }
];

var EMOJIS = ['🎵','🌙','🎭','🎪','🔥','✨','🥂','🎸','🎺','💃','🎧','🎷'];

var SAMPLE_DATA = [
  { title:'Noche de Salsa',      date:'2026-12-05', time:'21:00', venue:'Club People — Piso 3',  category:'Salsa',      price:80,  stock:120, active:true, description:'La mejor noche de salsa con orquesta en vivo y open bar.', image:'' },
  { title:'Electronic Friday',   date:'2026-12-11', time:'22:30', venue:'People Rooftop',        category:'Electrónica',price:120, stock:80,  active:true, description:'DJs internacionales y producción audiovisual de primer nivel.', image:'' },
  { title:'Cumbia Fest',         date:'2026-12-12', time:'20:00', venue:'Club People — Salón',   category:'Tropical',   price:60,  stock:150, active:true, description:'Noche tropical con cumbia y artistas invitados de toda la región.', image:'' },
  { title:'VIP Cocktail Night',  date:'2026-12-18', time:'20:00', venue:'People Lounge VIP',     category:'VIP',        price:200, stock:40,  active:true, description:'Coctelería exclusiva, música en vivo y vista panorámica.', image:'' },
  { title:'Reggaeton & Urbano',  date:'2026-12-19', time:'23:00', venue:'Club People — Arena',   category:'Urbano',     price:90,  stock:200, active:true, description:'Los mejores exponentes del reggaeton urbano en un solo escenario.', image:'' }
];

/* ─────────────────────────────────────────────────────
   2. ESTADO
───────────────────────────────────────────────────── */
var allEvents    = [];
var cart         = [];
var currentUser  = null;
var isAdmin      = false;
var filterCat    = 'all';
var searchQ      = '';
var editId       = null;
var rsId         = null;
var seatsEv      = null;
var seatsChoice  = null;
var pendingPay   = null;  // { items, total, method }

/* ─────────────────────────────────────────────────────
   3. DOM
───────────────────────────────────────────────────── */
var $ = function(id){ return document.getElementById(id); };

var splash       = $('splash');
var toastEl      = $('toast');
var nbTabEls     = document.querySelectorAll('.nb-tab');
var adminTabBtn  = document.querySelector('.admin-tab');

/* Nav auth blocks */
var nbGuest      = $('nb-auth-guest');
var nbUser       = $('nb-auth-user');
var nbAdminBlock = $('nb-auth-admin');

/* Modales */
var mLogin       = $('modal-login');
var mReg         = $('modal-reg');
var mAdminAuth   = $('modal-admin-auth');
var mCart        = $('modal-cart');
var mSeats       = $('modal-seats');
var mPay         = $('modal-pay');
var mEF          = $('modal-ef');
var mRS          = $('modal-rs');

/* Catálogo */
var evGrid       = $('ev-grid');
var stLoad       = $('st-loading');
var stErr        = $('st-error');
var stErrMsg     = $('st-err-msg');
var stEmpty      = $('st-empty');

/* ─────────────────────────────────────────────────────
   4. SPLASH
───────────────────────────────────────────────────── */
function hideSplash(){
  if(!splash) return;
  splash.style.transition    = 'opacity .42s ease, visibility .42s ease';
  splash.style.opacity       = '0';
  splash.style.visibility    = 'hidden';
  splash.style.pointerEvents = 'none';
  setTimeout(function(){ if(splash&&splash.parentNode) splash.parentNode.removeChild(splash); }, 460);
}
setTimeout(hideSplash, 7000);

/* ─────────────────────────────────────────────────────
   5. UTILIDADES
───────────────────────────────────────────────────── */
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(s){ if(!s)return''; var p=s.split('-'); var m=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; return parseInt(p[2])+' '+m[parseInt(p[1])-1]+' '+p[0]; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function getEmoji(t,i){ var s=(t||'').toLowerCase(); if(s.includes('salsa')||s.includes('cumbia'))return'💃'; if(s.includes('electr')||s.includes('dj'))return'🎧'; if(s.includes('jazz'))return'🎷'; if(s.includes('reggaeton'))return'🔥'; if(s.includes('vip')||s.includes('cocktail'))return'🥂'; if(s.includes('rock'))return'🎸'; return EMOJIS[(i||0)%EMOJIS.length]; }
function fmtCard(v){ return v.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim(); }
function fmtExp(v){ return v.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1/$2').slice(0,5); }

var _tt=null;
function showToast(msg,type,dur){
  type=type||'success'; dur=dur||3200;
  toastEl.textContent=msg; toastEl.className='toast '+type+' show';
  if(_tt) clearTimeout(_tt);
  _tt=setTimeout(function(){ toastEl.className='toast '+type+' hide'; setTimeout(function(){ toastEl.className='toast hidden'; },280); },dur);
}

function openM(m){ m.classList.remove('hidden'); document.body.style.overflow='hidden'; }
function closeM(m){ m.classList.add('hidden'); document.body.style.overflow=''; }

function fetchT(url,opts,ms){
  ms=ms||10000;
  return Promise.race([
    fetch(url,opts||{}),
    new Promise(function(_,r){ setTimeout(function(){ r(new Error('Sin respuesta (10s)')); },ms); })
  ]);
}
function apiFetch(url,opts){
  opts=opts||{};
  var hdrs={'Content-Type':'application/json'};
  if(opts.headers) Object.keys(opts.headers).forEach(function(k){ hdrs[k]=opts.headers[k]; });
  var o={method:opts.method||'GET',headers:hdrs};
  if(opts.body) o.body=opts.body;
  return fetchT(url,o).then(function(res){
    if(!res.ok) return res.text().then(function(t){ throw new Error('HTTP '+res.status+': '+(t||res.statusText)); });
    return res.json();
  });
}
var apiGet    = function(url)      { return apiFetch(url); };
var apiPost   = function(url,d)    { return apiFetch(url,{method:'POST',  body:JSON.stringify(d)}); };
var apiPut    = function(url,d)    { return apiFetch(url,{method:'PUT',   body:JSON.stringify(d)}); };
var apiDel    = function(url)      { return apiFetch(url,{method:'DELETE'}); };

/* ─────────────────────────────────────────────────────
   6. NAVEGACIÓN
───────────────────────────────────────────────────── */
var VIEWS = ['home','events','profile','contact','admin'];

function showView(name){
  VIEWS.forEach(function(v){
    var el=$('view-'+v);
    if(el){ el.classList.toggle('active',v===name); el.classList.toggle('hidden',v!==name); }
  });
  nbTabEls.forEach(function(t){ t.classList.toggle('active',t.dataset.view===name); });
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='profile') renderProfile();
  if(name==='admin')   renderAdminTable();
  if(name==='events')  renderCatalog();
}

nbTabEls.forEach(function(tab){
  tab.addEventListener('click',function(){
    var v=tab.dataset.view;
    if(v==='admin'&&!isAdmin) return;
    if(v==='profile'&&!currentUser) return;
    showView(v);
  });
});

$('btn-brand').addEventListener('click',function(){ showView('home'); });
$('btn-hero-events').addEventListener('click',function(){ showView('events'); loadEvents(); });

/* ─────────────────────────────────────────────────────
   7. LOCALSTORAGE
───────────────────────────────────────────────────── */
function getUsers(){ try{ return JSON.parse(localStorage.getItem('people_users')||'[]'); }catch(e){ return []; } }
function saveUsers(u){ localStorage.setItem('people_users',JSON.stringify(u)); }
function getSession(){ try{ return JSON.parse(localStorage.getItem('people_session')||'null'); }catch(e){ return null; } }
function saveSession(d){ localStorage.setItem('people_session',JSON.stringify(d)); }
function clearSession(){ localStorage.removeItem('people_session'); }
function getRes(email){ try{ return JSON.parse(localStorage.getItem('pres_'+email)||'[]'); }catch(e){ return []; } }
function addRes(email,r){ var l=getRes(email); l.unshift(r); localStorage.setItem('pres_'+email,JSON.stringify(l)); }

/* ─────────────────────────────────────────────────────
   8. INICIALIZAR SESIÓN
───────────────────────────────────────────────────── */
function initSession(){
  var s=getSession();
  if(!s) return;
  if(s.isAdmin){ isAdmin=true; applyAdminUI(); return; }
  if(s.email){ currentUser=s; applyUserUI(); }
}

function applyUserUI(){
  nbGuest.classList.add('hidden');
  nbUser.classList.remove('hidden');
  nbAdminBlock.classList.add('hidden');
  $('nb-username').textContent = currentUser.name ? currentUser.name.split(' ')[0] : 'Perfil';
  /* Mostrar pestaña Perfil */
  document.querySelector('[data-view="profile"]') && document.querySelector('[data-view="profile"]').classList.remove('hidden');
}
function applyAdminUI(){
  nbGuest.classList.add('hidden');
  nbUser.classList.add('hidden');
  nbAdminBlock.classList.remove('hidden');
  adminTabBtn.classList.remove('hidden');
}
function resetUI(){
  nbGuest.classList.remove('hidden');
  nbUser.classList.add('hidden');
  nbAdminBlock.classList.add('hidden');
  adminTabBtn.classList.add('hidden');
}

/* ─────────────────────────────────────────────────────
   9. MODALES AUTH — separados
───────────────────────────────────────────────────── */
/* Abrir / cerrar login */
$('btn-open-login').addEventListener('click',function(){ clearLoginForm(); openM(mLogin); $('li-email').focus(); });
$('close-login').addEventListener('click',function(){ closeM(mLogin); });
$('bg-login').addEventListener('click',function(){ closeM(mLogin); });

/* Abrir / cerrar registro */
$('btn-open-reg').addEventListener('click',function(){ clearRegForm(); openM(mReg); $('rg-name').focus(); });
$('close-reg').addEventListener('click',function(){ closeM(mReg); });
$('bg-reg').addEventListener('click',function(){ closeM(mReg); });

/* Abrir / cerrar admin auth */
$('btn-open-admin-modal').addEventListener('click',function(){
  $('adm-user').value=''; $('adm-pass').value='';
  $('adm-error').classList.add('hidden');
  openM(mAdminAuth); $('adm-user').focus();
});
$('close-admin-auth').addEventListener('click',function(){ closeM(mAdminAuth); });
$('bg-admin-auth').addEventListener('click',function(){ closeM(mAdminAuth); });

/* Cruzar entre login y registro — limpia campos */
$('li-to-reg').addEventListener('click',function(){
  clearLoginForm();
  closeM(mLogin);
  clearRegForm();
  openM(mReg);
  $('rg-name').focus();
});
$('reg-to-li').addEventListener('click',function(){
  clearRegForm();
  closeM(mReg);
  clearLoginForm();
  openM(mLogin);
  $('li-email').focus();
});

function clearLoginForm(){
  $('li-email').value=''; $('li-pass').value='';
  $('li-error').classList.add('hidden');
}
function clearRegForm(){
  $('rg-name').value=''; $('rg-phone').value='';
  $('rg-email').value=''; $('rg-pass').value='';
  $('rg-error').classList.add('hidden');
}

/* ── Acción Login ── */
$('btn-do-login').addEventListener('click', doLogin);
$('li-pass').addEventListener('keydown',function(e){ if(e.key==='Enter') doLogin(); });
function doLogin(){
  var email=$('li-email').value.trim().toLowerCase();
  var pass=$('li-pass').value;
  var err=$('li-error');
  err.classList.add('hidden');
  if(!email||!pass){ err.textContent='Completa todos los campos.'; err.classList.remove('hidden'); return; }
  var users=getUsers(), found=null;
  users.forEach(function(u){ if(u.email===email&&u.password===pass) found=u; });
  if(!found){ err.classList.remove('hidden'); return; }
  currentUser={name:found.name,email:found.email,phone:found.phone};
  saveSession(currentUser); applyUserUI(); closeM(mLogin);
  showToast('¡Bienvenido/a, '+found.name.split(' ')[0]+'!');
}

/* ── Acción Registro ── */
$('btn-do-reg').addEventListener('click', doRegister);
function doRegister(){
  var name=$('rg-name').value.trim();
  var phone=$('rg-phone').value.trim();
  var email=$('rg-email').value.trim().toLowerCase();
  var pass=$('rg-pass').value;
  var err=$('rg-error');
  err.classList.add('hidden');
  if(!name||!email||!pass){ err.textContent='Nombre, correo y contraseña son obligatorios.'; err.classList.remove('hidden'); return; }
  if(pass.length<6){ err.textContent='La contraseña debe tener al menos 6 caracteres.'; err.classList.remove('hidden'); return; }
  var users=getUsers();
  if(users.some(function(u){ return u.email===email; })){ err.textContent='Ese correo ya está registrado.'; err.classList.remove('hidden'); return; }
  var nu={id:uid(),name:name,email:email,phone:phone,password:pass};
  users.push(nu); saveUsers(users);
  currentUser={name:name,email:email,phone:phone};
  saveSession(currentUser); applyUserUI(); closeM(mReg);
  showToast('¡Cuenta creada! Bienvenido/a, '+name.split(' ')[0]+'.');
}

/* ── Acción Admin Login ── */
$('btn-do-admin-login').addEventListener('click', doAdminLogin);
$('adm-pass').addEventListener('keydown',function(e){ if(e.key==='Enter') doAdminLogin(); });
function doAdminLogin(){
  var u=$('adm-user').value.trim(), p=$('adm-pass').value;
  var err=$('adm-error'); err.classList.add('hidden');
  if(u===ADMIN_CREDENTIALS.user&&p===ADMIN_CREDENTIALS.pass){
    isAdmin=true; saveSession({isAdmin:true}); applyAdminUI(); closeM(mAdminAuth);
    showToast('✅ Acceso admin activado'); renderCatalog();
  } else { err.classList.remove('hidden'); }
}

/* ── Logout admin navbar ── */
$('btn-admin-logout').addEventListener('click',function(){
  if(!confirm('¿Cerrar sesión de administrador?')) return;
  isAdmin=false; clearSession(); resetUI();
  adminTabBtn.classList.add('hidden');
  if(['admin','profile'].includes(getCurrentView())) showView('home');
  showToast('Sesión admin cerrada'); renderCatalog();
});

function getCurrentView(){
  for(var i=0;i<VIEWS.length;i++){
    var el=$('view-'+VIEWS[i]);
    if(el&&el.classList.contains('active')) return VIEWS[i];
  }
  return 'home';
}

/* ─────────────────────────────────────────────────────
   10. PERFIL
───────────────────────────────────────────────────── */
function renderProfile(){
  if(!currentUser){ showView('home'); return; }
  var wrap=$('profile-info');
  wrap.innerHTML=
    '<div style="display:flex;align-items:center;gap:14px">'+
      '<div class="profile-avatar">'+getEmoji(currentUser.name,0)+'</div>'+
      '<div>'+
        '<div class="profile-name">'+esc(currentUser.name)+'</div>'+
        '<div class="profile-email">'+esc(currentUser.email)+'</div>'+
        (currentUser.phone?'<div class="profile-phone">📱 '+esc(currentUser.phone)+'</div>':'')+
      '</div>'+
    '</div>'+
    '<button class="btn-logout-profile" id="btn-profile-logout">'+
      '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/></svg>'+
      'Cerrar Sesión'+
    '</button>';

  $('btn-profile-logout').addEventListener('click',function(){
    if(!confirm('¿Cerrar sesión?')) return;
    currentUser=null; clearSession(); resetUI(); cart=[]; updateBadge();
    showView('home'); showToast('Sesión cerrada');
  });

  /* Reservas */
  var list=getRes(currentUser.email);
  var rg=$('res-grid'), re=$('res-empty');
  rg.innerHTML=''; rg.classList.add('hidden'); re.classList.add('hidden');
  if(list.length===0){ re.classList.remove('hidden'); return; }
  rg.classList.remove('hidden');
  list.forEach(function(r){
    var card=document.createElement('div'); card.className='res-card';
    var evHTML='';
    (r.items||[]).forEach(function(it){
      evHTML+='<div class="res-row"><span>'+esc(it.title)+'</span><span>'+esc(it.zone)+' · '+it.qty+' pers.</span><span>Bs. '+it.sub+'</span></div>';
    });
    card.innerHTML=
      '<div class="res-card-top">'+
        '<div>'+
          '<div class="res-ev-name">Reserva #'+esc(r.id.slice(-6).toUpperCase())+'</div>'+
          '<div style="font-size:.76rem;color:var(--tx3)">'+esc(r.date)+'</div>'+
        '</div>'+
        '<span class="res-confirmed">✅ Confirmada</span>'+
      '</div>'+
      evHTML+
      '<div class="res-total-row">'+
        '<span class="res-method">'+esc(r.method)+'</span>'+
        '<span class="res-total-val">Bs. '+r.total+'</span>'+
      '</div>'+
      '<div class="res-id">ID: '+esc(r.id)+'</div>';
    rg.appendChild(card);
  });
}

/* ─────────────────────────────────────────────────────
   11. CARGAR EVENTOS (GET)
───────────────────────────────────────────────────── */
function showCatState(s){
  stLoad.classList.toggle('hidden',s!=='loading');
  stErr.classList.toggle('hidden',s!=='error');
  stEmpty.classList.toggle('hidden',s!=='empty');
  evGrid.classList.toggle('hidden',s!=='grid');
}

function loadEvents(){
  showCatState('loading');
  return apiGet(EP_EVENTS).then(function(data){
    allEvents = deduplicateEvents(Array.isArray(data)?data:[]);
    renderCatalog(); renderCatFilters();
    showCatState(allEvents.length===0?'empty':'grid');
  }).catch(function(err){
    console.error('[People]',err); showCatState('error');
    stErrMsg.textContent='Error al cargar: '+err.message;
  });
}

/* Elimina duplicados por título+fecha y aplica regla de máx. 2 eventos entre semana */
function deduplicateEvents(events){
  /* 1. Quitar duplicados exactos (mismo título normalizado + misma fecha) */
  var seen = {};
  var unique = events.filter(function(ev){
    var key = (ev.title||'').toLowerCase().trim() + '|' + (ev.date||'');
    if(seen[key]) return false;
    seen[key] = true;
    return true;
  });

  /* 2. Regla: máx. 2 eventos entre semana (lun-jue), preferir vie-sáb */
  /* Ordenar por fecha asc */
  unique.sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });

  var weekdayCount = {}; /* clave: semana ISO + año */
  var result = [];

  unique.forEach(function(ev){
    if(!ev.date){ result.push(ev); return; }
    var d = new Date(ev.date + 'T12:00:00');
    if(isNaN(d.getTime())){ result.push(ev); return; }
    var dow = d.getDay(); /* 0=dom,1=lun,...,6=sáb */
    var isWeekend = dow===5||dow===6||dow===0; /* vie,sáb,dom */

    if(isWeekend){
      result.push(ev); /* Los eventos de fin de semana siempre pasan */
      return;
    }
    /* Entre semana: máx 2 por semana ISO */
    var weekKey = isoWeek(d);
    weekdayCount[weekKey] = (weekdayCount[weekKey]||0);
    if(weekdayCount[weekKey] < 2){
      weekdayCount[weekKey]++;
      result.push(ev);
    }
    /* Si supera 2, se descarta de la vista (no se elimina de MockAPI) */
  });

  return result;
}

function isoWeek(d){
  var tmp = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  var dayNum = tmp.getUTCDay()||7;
  tmp.setUTCDate(tmp.getUTCDate()+4-dayNum);
  var yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
  return tmp.getUTCFullYear()+'-W'+Math.ceil((((tmp-yearStart)/86400000)+1)/7);
}

/* ─────────────────────────────────────────────────────
   12. RENDERIZAR CATÁLOGO
───────────────────────────────────────────────────── */
function renderCatFilters(){
  var cats=['all'];
  allEvents.forEach(function(e){ if(e.category&&cats.indexOf(e.category)<0) cats.push(e.category); });
  var row=$('cat-filters'); row.innerHTML='';
  cats.forEach(function(c){
    var b=document.createElement('button');
    b.className='cat-btn'+(c===filterCat?' on':'');
    b.textContent=c==='all'?'Todos':c;
    b.addEventListener('click',function(){
      filterCat=c;
      document.querySelectorAll('.cat-btn').forEach(function(x){ x.classList.toggle('on',x.textContent===(c==='all'?'Todos':c)); });
      renderCatalog();
    });
    row.appendChild(b);
  });
}

function renderCatalog(){
  var q=searchQ.trim().toLowerCase();
  var list=allEvents.filter(function(ev){
    if(!ev.active&&!isAdmin) return false;
    if(filterCat!=='all'&&ev.category!==filterCat) return false;
    if(q) return (ev.title||'').toLowerCase().includes(q)||(ev.description||'').toLowerCase().includes(q)||(ev.category||'').toLowerCase().includes(q);
    return true;
  });
  evGrid.innerHTML='';
  if(list.length===0){ showCatState(allEvents.length===0?'empty':'empty'); return; }
  showCatState('grid');
  list.forEach(function(ev,i){
    var stk=typeof ev.stock==='number'?ev.stock:0;
    var sold=stk===0, low=!sold&&stk<=10;
    var emoji=getEmoji(ev.title,i);
    var card=document.createElement('div');
    card.className='ev-card'+(sold?' ev-sold':'');
    card.style.animationDelay=(i*0.045)+'s';
    card.innerHTML=
      '<div class="ev-card-img">'+
        (ev.image?'<img src="'+esc(ev.image)+'" alt="" loading="lazy">':emoji)+
        (sold?'<div class="ev-sold-tag">Agotado</div>':'')+
      '</div>'+
      '<div class="ev-card-body">'+
        '<div class="ev-cat-pill">'+esc(ev.category||'Evento')+'</div>'+
        '<div class="ev-card-title">'+esc(ev.title||'Sin nombre')+'</div>'+
        '<div class="ev-card-meta">'+
          '<span>📅 '+fmtDate(ev.date)+'</span>'+
          '<span>⏰ '+esc(ev.time||'')+'</span>'+
          (ev.venue?'<span>📍 '+esc(ev.venue)+'</span>':'')+
        '</div>'+
        '<div class="ev-card-foot">'+
          '<div>'+
            '<div class="ev-price-val">Bs. '+Number(ev.price||ev.priceManilla||0).toFixed(0)+'</div>'+
            '<div class="ev-price-label">/ persona</div>'+
          '</div>'+
          '<div class="ev-stock-txt'+(sold?' out':low?' low':'')+'">'+
            (sold?'Sin cupos':stk+' cupos')+
          '</div>'+
          '<button class="ev-btn"'+(sold?' disabled':'')+'>'+
            (sold?'Agotado':'Reservar')+
          '</button>'+
        '</div>'+
      '</div>';
    card.querySelector('.ev-btn').addEventListener('click',function(e){
      e.stopPropagation();
      if(!sold) openSeats(ev);
    });
    card.addEventListener('click',function(){ if(!sold) openSeats(ev); });
    evGrid.appendChild(card);
  });
}

$('search-ev').addEventListener('input',function(e){ searchQ=e.target.value; renderCatalog(); });
$('btn-retry').addEventListener('click',loadEvents);
$('btn-refresh').addEventListener('click',loadEvents);

/* ─────────────────────────────────────────────────────
   13. MODAL SELECCIÓN DE MESAS
───────────────────────────────────────────────────── */
function openSeats(ev){
  seatsEv=ev; seatsChoice=null;
  $('seats-title').textContent=ev.title;
  $('seats-sub').textContent='📅 '+fmtDate(ev.date)+' · '+esc(ev.time||'')+' · 📍 '+esc(ev.venue||'');
  $('btn-seats-add').disabled=true;
  var stk=typeof ev.stock==='number'?ev.stock:0;
  var base=Number(ev.price||ev.priceManilla||50);
  var wrap=$('seats-zones'); wrap.innerHTML='';

  ZONES.forEach(function(z){
    var zp=Math.round(base*z.mult);
    var avail=stk>0;
    var div=document.createElement('div');
    div.className='zone-block';
    div.innerHTML=
      '<div class="zone-hdr">'+
        '<div class="zone-name">'+z.emoji+' '+z.label+
          ' <span class="zone-pill '+z.pill+'">'+z.label+'</span>'+
        '</div>'+
        '<div class="zone-price">Bs. '+zp+' / persona</div>'+
      '</div>'+
      '<div class="zone-ctrls">'+
        '<span class="zone-info2">Máx. '+z.max+' personas por mesa</span>'+
        (avail?
          '<div class="qty-ctrl">'+
            '<button class="qty-btn" data-dir="-1" data-zone="'+z.id+'">−</button>'+
            '<div class="qty-num" id="qn-'+z.id+'">0</div>'+
            '<button class="qty-btn" data-dir="1" data-zone="'+z.id+'">+</button>'+
          '</div>'+
          '<span class="zone-av'+(stk<=5?' low':'')+'">'+stk+' cupos disp.</span>'
        :
          '<span class="zone-av out">Sin disponibilidad</span>'
        )+
      '</div>';
    wrap.appendChild(div);
  });

  wrap.querySelectorAll('.qty-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var zid=btn.dataset.zone, dir=parseInt(btn.dataset.dir);
      var zone=ZONES.find(function(z){ return z.id===zid; });
      var stk2=typeof seatsEv.stock==='number'?seatsEv.stock:0;
      var cap=Math.min(zone.max,stk2);
      var disp=$('qn-'+zid);
      var cur=parseInt(disp.textContent)||0, nxt=cur+dir;
      if(nxt<0) nxt=0;
      if(nxt>cap){ showToast('Máximo '+cap+' personas en '+zone.label,'warn'); return; }
      disp.textContent=nxt;
      if(nxt>0){
        ZONES.forEach(function(z){ if(z.id!==zid){ var d=$('qn-'+z.id); if(d) d.textContent='0'; } });
        document.querySelectorAll('.zone-block').forEach(function(b){ b.classList.remove('selected'); });
        btn.closest('.zone-block').classList.add('selected');
        var zp=Math.round(Number(seatsEv.price||seatsEv.priceManilla||50)*zone.mult);
        seatsChoice={zone:zone, qty:nxt, sub:nxt*zp, ppp:zp};
      } else {
        btn.closest('.zone-block').classList.remove('selected');
        var any=ZONES.some(function(z){ var d=$('qn-'+z.id); return d&&parseInt(d.textContent)>0; });
        if(!any) seatsChoice=null;
      }
      $('btn-seats-add').disabled=!seatsChoice;
    });
  });
  openM(mSeats);
}

$('close-seats').addEventListener('click',function(){ closeM(mSeats); });
$('bg-seats').addEventListener('click',function(){ closeM(mSeats); });
$('btn-seats-cancel').addEventListener('click',function(){ closeM(mSeats); });

$('btn-seats-add').addEventListener('click',function(){
  if(!seatsChoice||!seatsEv) return;
  if(!currentUser&&!isAdmin){ closeM(mSeats); openM(mLogin); showToast('Inicia sesión para reservar','warn'); return; }
  addToCart(seatsEv, seatsChoice);
  closeM(mSeats);
});

/* ─────────────────────────────────────────────────────
   14. CARRITO
───────────────────────────────────────────────────── */
function addToCart(ev, ch){
  var key=ev.id+'-'+ch.zone.id, ex=null;
  cart.forEach(function(c){ if(c.key===key) ex=c; });
  var stk=typeof ev.stock==='number'?ev.stock:0;
  var total=(ex?ex.ch.qty:0)+ch.qty;
  if(total>stk){ showToast('No hay suficientes cupos','warn'); return; }
  if(ex){ ex.ch.qty+=ch.qty; ex.ch.sub=ex.ch.qty*ex.ch.ppp; }
  else  { cart.push({key:key,event:ev,ch:Object.assign({},ch)}); }
  updateBadge();
  showToast('✅ '+ch.qty+' lugar(es) en '+ch.zone.label+' agregados');
}

function updateBadge(){
  var t=0; cart.forEach(function(c){ t+=c.ch.qty; });
  $('cart-badge').textContent=t;
  $('cart-badge').classList.toggle('hidden',t===0);
}

function renderCart(){
  var list=$('cart-list'), em=$('cart-empty'), foot=$('cart-foot'), tot=$('cart-total');
  list.innerHTML='';
  if(cart.length===0){ em.classList.remove('hidden'); foot.classList.add('hidden'); return; }
  em.classList.add('hidden'); foot.classList.remove('hidden');
  var grand=0;
  cart.forEach(function(item,idx){
    grand+=item.ch.sub;
    var d=document.createElement('div'); d.className='cart-item';
    d.innerHTML=
      '<div class="ci-emoji">'+getEmoji(item.event.title,idx)+'</div>'+
      '<div class="ci-info">'+
        '<div class="ci-name">'+esc(item.event.title)+'</div>'+
        '<div class="ci-meta">'+item.ch.zone.label+' · '+item.ch.qty+' pers. · Bs. '+item.ch.ppp+'/c/u</div>'+
      '</div>'+
      '<div class="ci-price">Bs. '+item.ch.sub+'</div>'+
      '<button class="ci-rm" data-i="'+idx+'">✕</button>';
    list.appendChild(d);
  });
  tot.textContent='Bs. '+grand;
  list.querySelectorAll('.ci-rm').forEach(function(btn){
    btn.addEventListener('click',function(){
      cart.splice(parseInt(btn.dataset.i),1); updateBadge(); renderCart();
    });
  });
}

$('btn-cart-nav').addEventListener('click',function(){ renderCart(); openM(mCart); });
$('close-cart').addEventListener('click',function(){ closeM(mCart); });
$('bg-cart').addEventListener('click',function(){ closeM(mCart); });

/* ─────────────────────────────────────────────────────
   15. PASARELA DE PAGO
───────────────────────────────────────────────────── */
$('btn-checkout').addEventListener('click',function(){
  if(!currentUser&&!isAdmin){ closeM(mCart); openM(mLogin); return; }
  if(cart.length===0) return;
  /* Validar stock */
  var valid=true;
  cart.forEach(function(item){
    var ev=allEvents.find(function(e){ return e.id===item.event.id; });
    if(!ev) return;
    if(item.ch.qty>(typeof ev.stock==='number'?ev.stock:0)){
      showToast('"'+ev.title+'" ya no tiene suficientes cupos','warn',4000); valid=false;
    }
  });
  if(!valid){ closeM(mCart); loadEvents(); return; }

  var grand=0; cart.forEach(function(c){ grand+=c.ch.sub; });
  pendingPay={grand:grand};

  /* Resumen */
  var sumHTML='<div style="font-size:.85rem;line-height:1.8">';
  cart.forEach(function(c){ sumHTML+='<div>'+esc(c.event.title)+' — '+c.ch.zone.label+' × '+c.ch.qty+' pers. <strong>Bs. '+c.ch.sub+'</strong></div>'; });
  sumHTML+='</div><div style="margin-top:8px;font-size:.82rem;color:var(--tx3)">Total a pagar: <strong style="color:var(--cy);font-size:1.1rem">Bs. '+grand+'</strong></div>';
  $('pay-summary').innerHTML=sumHTML;

  /* Ref QR */
  $('qr-amount').textContent='Bs. '+grand;
  $('qr-ref').textContent='PEOPLE-'+uid().toUpperCase().slice(0,6);

  /* Reset método */
  document.querySelectorAll('.pay-method').forEach(function(m){ m.classList.remove('active'); m.querySelector('.pm-check').classList.add('hidden'); });
  ['pay-qr-panel','pay-card-panel','pay-cash-panel'].forEach(function(id){ $(id).classList.add('hidden'); });
  $('btn-pay-confirm').disabled=true;
  $('pay-error').classList.add('hidden');

  closeM(mCart); openM(mPay);
});

/* Selección de método */
document.querySelectorAll('.pay-method').forEach(function(pm){
  pm.addEventListener('click',function(){
    document.querySelectorAll('.pay-method').forEach(function(x){ x.classList.remove('active'); x.querySelector('.pm-check').classList.add('hidden'); });
    pm.classList.add('active'); pm.querySelector('.pm-check').classList.remove('hidden');
    var m=pm.dataset.method;
    ['pay-qr-panel','pay-card-panel','pay-cash-panel'].forEach(function(id){ $(id).classList.add('hidden'); });
    if(m==='qr')   $('pay-qr-panel').classList.remove('hidden');
    if(m==='card') $('pay-card-panel').classList.remove('hidden');
    if(m==='cash') $('pay-cash-panel').classList.remove('hidden');
    $('btn-pay-confirm').disabled=false;
    $('pay-error').classList.add('hidden');
  });
});

/* Formato tarjeta */
$('card-num').addEventListener('input',function(){ this.value=fmtCard(this.value); });
$('card-exp').addEventListener('input',function(){ this.value=fmtExp(this.value); });
$('card-cvv').addEventListener('input',function(){ this.value=this.value.replace(/\D/g,'').slice(0,4); });

$('close-pay').addEventListener('click',function(){ closeM(mPay); });
$('bg-pay').addEventListener('click',function(){ closeM(mPay); });
$('btn-pay-cancel').addEventListener('click',function(){ closeM(mPay); });

/* Confirmar pago */
$('btn-pay-confirm').addEventListener('click',function(){
  var active=document.querySelector('.pay-method.active');
  if(!active){ $('pay-error').textContent='Selecciona un método de pago.'; $('pay-error').classList.remove('hidden'); return; }
  var method=active.dataset.method;
  var errEl=$('pay-error'); errEl.classList.add('hidden');

  /* Validar tarjeta si aplica */
  if(method==='card'){
    var num=$('card-num').value.replace(/\s/g,'');
    var exp=$('card-exp').value;
    var cvv=$('card-cvv').value;
    if(num.length<13||exp.length<5||cvv.length<3){
      errEl.textContent='Completa los datos de tu tarjeta correctamente.';
      errEl.classList.remove('hidden'); return;
    }
  }

  var btn=$('btn-pay-confirm'); btn.disabled=true; btn.textContent='Procesando…';
  var methodLabel=method==='qr'?'QR / Transferencia':method==='card'?'Tarjeta':'Efectivo / Boletería';

  /* PUT stock en MockAPI */
  var promises=cart.map(function(item){
    var ev=allEvents.find(function(e){ return e.id===item.event.id; });
    if(!ev) return Promise.resolve();
    var ns=Math.max(0,(typeof ev.stock==='number'?ev.stock:0)-item.ch.qty);
    return apiPut(EP_EVENTS+'/'+ev.id,{stock:ns}).then(function(upd){
      ev.stock=typeof upd.stock==='number'?upd.stock:ns;
    });
  });

  Promise.all(promises).then(function(){
    /* Guardar reserva */
    if(currentUser){
      var grand=0; cart.forEach(function(c){ grand+=c.ch.sub; });
      var res={
        id:uid(), date:new Date().toLocaleDateString('es-BO'), method:methodLabel,
        total:grand,
        items:cart.map(function(c){ return {title:c.event.title,zone:c.ch.zone.label,qty:c.ch.qty,sub:c.ch.sub}; })
      };
      addRes(currentUser.email, res);
    }
    var total=0; cart.forEach(function(c){ total+=c.ch.qty; });
    showToast('🎉 ¡Pago confirmado! '+total+' lugar(es) reservados','success',5000);
    cart=[]; updateBadge(); closeM(mPay);
    renderCatalog(); if(isAdmin) renderAdminTable();
  }).catch(function(err){
    errEl.textContent='Error al procesar: '+err.message; errEl.classList.remove('hidden');
  }).then(function(){ btn.disabled=false; btn.textContent='Confirmar Pago'; });
});

/* ─────────────────────────────────────────────────────
   16. ADMIN — TABLA
───────────────────────────────────────────────────── */
function renderAdminTable(){
  var tbody=$('adm-tbody'); tbody.innerHTML='';
  if(allEvents.length===0){
    tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--tx3);padding:32px">No hay eventos. Crea uno con "+ Nuevo Evento".</td></tr>';
    return;
  }
  allEvents.forEach(function(ev,i){
    var stk=typeof ev.stock==='number'?ev.stock:0;
    var sold=stk===0, low=!sold&&stk<=10;
    var tr=document.createElement('tr');
    tr.innerHTML=
      '<td><div class="td-title-txt">'+getEmoji(ev.title,i)+' '+esc(ev.title||'Sin nombre')+
        (ev.venue?'<small>📍 '+esc(ev.venue)+'</small>':'')+
      '</div></td>'+
      '<td>'+fmtDate(ev.date)+'<br><small style="color:var(--tx3)">⏰ '+esc(ev.time||'')+'</small></td>'+
      '<td>'+esc(ev.category||'—')+'</td>'+
      '<td class="td-price">Bs. '+Number(ev.price||ev.priceManilla||0).toFixed(0)+'</td>'+
      '<td class="td-stk'+(sold?' out':low?' low':'')+'">'+( sold?'😔 Agotado':stk)+'</td>'+
      '<td><span class="pill '+(ev.active?'on':'off')+'">'+(ev.active?'Publicado':'Oculto')+'</span></td>'+
      '<td><div class="td-acts">'+
        '<button class="btn-icon" data-ac="edit"    data-id="'+ev.id+'">✏ Editar</button>'+
        '<button class="btn-icon" data-ac="restock" data-id="'+ev.id+'">📦 Cupos</button>'+
        '<button class="btn-danger" data-ac="del"   data-id="'+ev.id+'">🗑</button>'+
      '</div></td>';
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-ac]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var ac=btn.dataset.ac, id=btn.dataset.id;
      var ev=allEvents.find(function(e){ return e.id===id; });
      if(ac==='edit')    { if(ev) openEF(ev); }
      if(ac==='restock') { if(ev) openRS(ev); }
      if(ac==='del')     { delEv(id,ev&&ev.title); }
    });
  });
}

/* ─────────────────────────────────────────────────────
   17. ADMIN — CREAR / EDITAR
───────────────────────────────────────────────────── */
$('btn-new-ev').addEventListener('click',function(){ openEF(null); });
$('close-ef').addEventListener('click',function(){ closeM(mEF); });
$('bg-ef').addEventListener('click',function(){ closeM(mEF); });
$('btn-ef-cancel').addEventListener('click',function(){ closeM(mEF); });

function openEF(ev){
  editId=ev?ev.id:null;
  $('ef-label').textContent=ev?'✏ Editar Evento':'+ Nuevo Evento';
  $('ef-error').classList.add('hidden');
  $('ef-title').value = ev?(ev.title    ||''):'';
  $('ef-date').value  = ev?(ev.date     ||''):'';
  $('ef-time').value  = ev?(ev.time     ||''):'';
  $('ef-venue').value = ev?(ev.venue    ||''):'';
  $('ef-cat').value   = ev?(ev.category ||''):'';
  $('ef-price').value = ev?(ev.price||ev.priceManilla||''):'';
  $('ef-stock').value = ev?(typeof ev.stock==='number'?ev.stock:''):'';
  $('ef-desc').value  = ev?(ev.description||''):'';
  $('ef-img').value   = ev?(ev.image    ||''):'';
  $('ef-active').checked=ev?!!ev.active:true;
  openM(mEF); $('ef-title').focus();
}

$('btn-ef-save').addEventListener('click',function(){
  var title=$('ef-title').value.trim(), date=$('ef-date').value.trim(),
      time=$('ef-time').value.trim(), venue=$('ef-venue').value.trim(),
      cat=$('ef-cat').value.trim(), price=parseFloat($('ef-price').value),
      stock=parseInt($('ef-stock').value), desc=$('ef-desc').value.trim(),
      img=$('ef-img').value.trim(), active=$('ef-active').checked;
  var err=$('ef-error'); err.classList.add('hidden');
  if(!title||!date||!time||!venue||!cat||isNaN(price)||isNaN(stock)){
    err.textContent='Completa todos los campos obligatorios.'; err.classList.remove('hidden'); return;
  }
  var payload={title:title,date:date,time:time,venue:venue,category:cat,price:price,priceManilla:price,stock:stock,maxStock:stock,description:desc,image:img,active:active,occupiedTables:[]};
  if(editId){
    var old=allEvents.find(function(e){ return e.id===editId; });
    if(old){ payload.maxStock=Math.max(stock,old.maxStock||stock); payload.occupiedTables=old.occupiedTables||[]; }
  }
  var btn=$('btn-ef-save'); btn.disabled=true; btn.textContent='Guardando…';
  var p=editId?apiPut(EP_EVENTS+'/'+editId,payload):apiPost(EP_EVENTS,payload);
  p.then(function(res){
    if(editId){ var idx=allEvents.findIndex(function(e){ return e.id===editId; }); if(idx!==-1) Object.assign(allEvents[idx],res); showToast('✅ Evento actualizado'); }
    else { allEvents.unshift(res); showToast('✅ Evento creado'); }
    closeM(mEF); renderAdminTable(); renderCatalog(); renderCatFilters();
    showCatState(allEvents.length===0?'empty':'grid');
  }).catch(function(e){ err.textContent='Error: '+e.message; err.classList.remove('hidden'); })
  .then(function(){ btn.disabled=false; btn.textContent='Guardar'; });
});

/* ─────────────────────────────────────────────────────
   18. ADMIN — RESTOCK
───────────────────────────────────────────────────── */
function openRS(ev){
  rsId=ev.id;
  $('rs-name').textContent='Evento: "'+ev.title+'" (actual: '+(typeof ev.stock==='number'?ev.stock:0)+' cupos)';
  $('rs-val').value=typeof ev.stock==='number'?ev.stock:0;
  openM(mRS); $('rs-val').focus(); $('rs-val').select();
}
$('close-rs').addEventListener('click',function(){ closeM(mRS); });
$('bg-rs').addEventListener('click',function(){ closeM(mRS); });
$('btn-rs-cancel').addEventListener('click',function(){ closeM(mRS); });
$('btn-rs-ok').addEventListener('click',function(){
  var val=parseInt($('rs-val').value);
  if(isNaN(val)||val<0){ showToast('Ingresa un número ≥ 0','warn'); return; }
  var btn=$('btn-rs-ok'); btn.disabled=true; btn.textContent='Guardando…';
  var ev=allEvents.find(function(e){ return e.id===rsId; });
  apiPut(EP_EVENTS+'/'+rsId,{stock:val,maxStock:Math.max(val,ev?(ev.maxStock||val):val)})
    .then(function(upd){
      var idx=allEvents.findIndex(function(e){ return e.id===rsId; });
      if(idx!==-1) Object.assign(allEvents[idx],upd);
      showToast('📦 Cupos actualizados a '+val); closeM(mRS); renderAdminTable(); renderCatalog();
    }).catch(function(e){ showToast('Error: '+e.message,'error'); })
    .then(function(){ btn.disabled=false; btn.textContent='Actualizar'; });
});

/* ─────────────────────────────────────────────────────
   19. ADMIN — ELIMINAR
───────────────────────────────────────────────────── */
function delEv(id,name){
  if(!confirm('¿Eliminar "'+esc(name||id)+'"?\nNo se puede deshacer.')) return;
  apiDel(EP_EVENTS+'/'+id).then(function(){
    allEvents=allEvents.filter(function(e){ return e.id!==id; });
    showToast('🗑 Evento eliminado'); renderAdminTable(); renderCatalog(); renderCatFilters();
    showCatState(allEvents.length===0?'empty':'grid');
  }).catch(function(e){ showToast('Error: '+e.message,'error'); });
}

/* ─────────────────────────────────────────────────────
   20. DATOS DE EJEMPLO
───────────────────────────────────────────────────── */
$('btn-load-sample').addEventListener('click',function(){
  if(allEvents.length>0&&!confirm('Ya hay '+allEvents.length+' evento(s).\n¿Agregar ejemplos igualmente?')) return;
  var btn=$('btn-load-sample'); btn.disabled=true; btn.textContent='Cargando…';
  Promise.all(SAMPLE_DATA.map(function(ev){ return apiPost(EP_EVENTS,ev); }))
    .then(function(res){
      allEvents=res.concat(allEvents);
      showToast('✅ '+res.length+' eventos creados'); renderAdminTable(); renderCatalog(); renderCatFilters();
      showCatState(allEvents.length===0?'empty':'grid');
    }).catch(function(e){ showToast('Error: '+e.message,'error'); })
    .then(function(){ btn.disabled=false; btn.textContent='Cargar Ejemplos'; });
});

/* ─────────────────────────────────────────────────────
   21. ESC cierra modales
───────────────────────────────────────────────────── */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape') return;
  [mLogin,mReg,mAdminAuth,mCart,mSeats,mPay,mEF,mRS].forEach(function(m){
    if(!m.classList.contains('hidden')) closeM(m);
  });
});

/* ─────────────────────────────────────────────────────
   22. INICIO
───────────────────────────────────────────────────── */
/* Estado inicial de vistas */
VIEWS.forEach(function(v){
  var el=$('view-'+v);
  if(el){ el.classList.remove('active','hidden'); el.classList.add(v==='home'?'active':'hidden'); }
});

initSession();

loadEvents().then(function(){ hideSplash(); }).catch(function(err){
  console.error('[People]',err); showCatState('error');
  stErrMsg.textContent='No se pudo conectar. Verifica tu conexión.';
  hideSplash();
});
