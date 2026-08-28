const state={products:[],cart:[],mode:"full",search:"",loggedIn:false,library:[],orders:[],selected:null,menuProduct:null,playerTimer:null,playerPct:30};
const KEY="djgabo-karaoke-v4-demo";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const palette=[["#20344d","#147eb0"],["#38284d","#8d4fb9"],["#173b48","#2589a2"],["#442a2a","#b64d4d"],["#233c32","#3f9d6d"],["#423719","#b48e32"],["#282d47","#5969c5"],["#3b2545","#9350a7"],["#233b43","#3f9696"],["#382d42","#865b91"]];
const money=n=>"S/"+Number(n).toFixed(2);
const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const esc=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const colors=p=>palette[(p.colorIndex||0)%palette.length];

function loadSaved(){try{const v=JSON.parse(localStorage.getItem(KEY)||"{}");state.loggedIn=!!v.loggedIn;state.library=Array.isArray(v.library)?v.library:[];state.orders=Array.isArray(v.orders)?v.orders:[]}catch{}}
function save(){localStorage.setItem(KEY,JSON.stringify({loggedIn:state.loggedIn,library:state.library,orders:state.orders}))}

async function init(){
 loadSaved();
 try{state.products=await fetch("../data/karaokes.json",{cache:"no-store"}).then(r=>r.json())}catch(e){console.error(e);toast("No se pudo cargar el catálogo")}
 bind();renderAll();updateAuth();
}

function filtered(){
 let list=[...state.products];
 if(state.mode==="tops")list=list.filter(p=>p.top);
 if(state.mode==="chorus")list=list.filter(p=>p.coros);
 if(state.search){const q=norm(state.search);list=list.filter(p=>norm(p.titulo+" "+p.artista+" "+p.genero).includes(q))}
 return list;
}

function albumCard(p){
 const [a,b]=colors(p);
 return `<button class="album-card" type="button" data-detail="${p.id}">
   <div class="album-cover" style="--a:${a};--b:${b}"><span>🎤</span><button class="album-play" type="button" data-demo="${p.id}">▶</button></div>
   <div class="album-title">${esc(p.titulo)}</div><div class="album-sub">${esc(p.artista)}</div>
 </button>`;
}

function songRow(p){
 const [a,b]=colors(p);
 return `<article class="song-row">
   <button class="song-cover" style="--a:${a};--b:${b}" data-demo="${p.id}" type="button"><span class="song-cover-icon">🎤</span><span class="cover-play-btn">▶</span></button>
   <div class="song-info">
     <strong class="song-title">${esc(p.titulo)}</strong>
     <div class="song-artist">${esc(p.artista)}</div>
     <div class="tag-row">${p.coros?'<span class="pill pill-coro">CORO</span>':'<span class="pill pill-full">SIN COROS</span>'}${p.top?'<span class="pill pill-top">TOP 2026</span>':''}</div>
   </div>
   <div class="song-actions"><button class="more-btn" type="button" data-more="${p.id}">⋮</button></div>
 </article>`;
}

function renderAll(){renderRails();renderList();renderCart();renderLibrary();renderOrders()}
function renderRails(){
 $("#newRail").innerHTML=state.products.filter(p=>p.nuevo).slice(0,8).map(albumCard).join("");
 $("#topRail").innerHTML=state.products.filter(p=>p.top).slice(0,8).map(albumCard).join("");
}
function renderList(){
 const list=filtered();$("#list").innerHTML=list.map(songRow).join("");$("#count").textContent=list.length+" "+(list.length===1?"karaoke":"karaokes");
 $("#noResult").hidden=list.length>0;$("#list").hidden=list.length===0;
}
function renderCart(){
 const n=state.cart.length;$("#cartBadge").textContent=n;$("#floatCartLabel").textContent=n+" karaokes";$("#mobileOrderCount").textContent=n+" karaokes";$("#mobileOrderBar").classList.toggle("has-items",n>0);
 $("#cartItems").innerHTML=state.cart.map(p=>`<div class="cart-item"><div class="cart-item-cover">🎤</div><div><div class="cart-item-title">${esc(p.titulo)}</div><div class="cart-item-artist">${esc(p.artista)} · ${money(p.precio)}</div></div><button class="remove-cart" data-remove="${p.id}" type="button">×</button></div>`).join("");
 $("#cartEmpty").hidden=n>0;$("#priceCard").hidden=n===0;$("#checkoutBtn").disabled=n===0;$("#clearCartBtn").disabled=n===0;
 const total=state.cart.reduce((s,p)=>s+p.precio,0);$("#totalText").textContent=money(total);$("#cartQtyText").textContent=n;
 $("#checkoutItems").innerHTML=state.cart.map(p=>`<div><span>${esc(p.artista)} - ${esc(p.titulo)}</span><b>${money(p.precio)}</b></div>`).join("");
}
function renderLibrary(){
 const list=state.library.map(id=>state.products.find(p=>p.id===id)).filter(Boolean);$("#libraryCount").textContent=list.length;
 $("#libraryList").innerHTML=list.length?list.map(p=>`<div class="library-item"><div class="library-thumb">🎤</div><div><strong>${esc(p.titulo)}</strong><small>${esc(p.artista)} · MP4 HD</small><small class="verified">✓ COMPRA VERIFICADA</small></div><button class="download-btn" data-download="${p.id}" type="button">DESCARGAR</button></div>`).join(""):'<div class="cart-empty">Aún no tienes karaokes comprados.</div>';
}
function renderOrders(){
 $("#ordersList").innerHTML=state.orders.length?state.orders.map(o=>`<div class="order-card"><div class="order-card-top"><strong>Pedido #${o.id}</strong><span>${o.date}</span></div><div class="order-card-bottom"><span class="paid-pill">PAGADO</span><b>${money(o.total)} · ${o.items} karaoke${o.items===1?"":"s"}</b></div></div>`).join(""):'<div class="cart-empty">Todavía no hay pedidos.</div>';
}

function bind(){
 document.addEventListener("click",e=>{
   const demo=e.target.closest("[data-demo]");if(demo){e.preventDefault();e.stopPropagation();playDemo(demo.dataset.demo);return}
   const detail=e.target.closest("[data-detail]");if(detail){openDetail(detail.dataset.detail);return}
   const more=e.target.closest("[data-more]");if(more){openMenu(more,more.dataset.more);return}
   const rem=e.target.closest("[data-remove]");if(rem){state.cart=state.cart.filter(p=>p.id!==rem.dataset.remove);renderCart();return}
   const down=e.target.closest("[data-download]");if(down){downloadDemo(down.dataset.download);return}
   if(e.target.closest("[data-close-modal]"))closeAll();
 });
 $("#q").oninput=e=>{state.search=e.target.value.trim();$("#clearSearchBtn").style.display=state.search?"block":"none";renderList()};
 $("#clearSearchBtn").onclick=()=>{state.search="";$("#q").value="";$("#clearSearchBtn").style.display="none";renderList()};
 $("#resetSearchBtn").onclick=()=>{state.search="";$("#q").value="";renderList()};
 $$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.mode=b.dataset.mode;renderList()});
 $("#newSeeAll").onclick=()=>{state.mode="full";state.search="";activateTab("full");$("#catalogo").scrollIntoView({behavior:"smooth"})};
 $("#topSeeAll").onclick=()=>{state.mode="tops";activateTab("tops");renderList();$("#catalogo").scrollIntoView({behavior:"smooth"})};
 $("#heroCatalogBtn").onclick=()=>$("#catalogo").scrollIntoView({behavior:"smooth"});
 $("#cartBtn").onclick=openCart;$("#mobileOrderBar").onclick=openCart;
 $("#accountBtn").onclick=openAccount;$("#accountStripBtn").onclick=openAccount;
 $("#songDemoBtn").onclick=()=>state.selected&&playDemo(state.selected.id);
 $("#songModalCover").onclick=()=>state.selected&&playDemo(state.selected.id);
 $("#songAddBtn").onclick=()=>{if(state.selected)addCart(state.selected.id)};
 $("#clearCartBtn").onclick=()=>{state.cart=[];renderCart()};
 $("#checkoutBtn").onclick=startCheckout;
 $("#loginOpenBtn").onclick=()=>openAuth("login");$("#registerOpenBtn").onclick=()=>openAuth("register");
 $$("[data-auth]").forEach(b=>b.onclick=()=>setAuthMode(b.dataset.auth));
 $("#authForm").onsubmit=e=>{e.preventDefault();state.loggedIn=true;save();closeAll();openAccount();toast("Sesión demo iniciada")};
 $("#logoutBtn").onclick=()=>{state.loggedIn=false;save();updateAuth();toast("Sesión cerrada")};
 $$("[data-account-tab]").forEach(b=>b.onclick=()=>showAccountTab(b.dataset.accountTab));
 $("#approvePurchaseBtn").onclick=approvePurchase;
 $("#goLibraryBtn").onclick=()=>{closeAll();openAccount();showAccountTab("library")};
 $("#bottomDemoClose").onclick=stopPlayer;$("#playerToggle").onclick=togglePlayer;
 document.addEventListener("click",e=>{if(!e.target.closest("#songOptionsMenu")&&!e.target.closest("[data-more]"))$("#songOptionsMenu").hidden=true});
 $("#songOptionsMenu").addEventListener("click",e=>{const btn=e.target.closest("[data-menu-action]");if(!btn||!state.menuProduct)return;const id=state.menuProduct.id;$("#songOptionsMenu").hidden=true;if(btn.dataset.menuAction==="listen")playDemo(id);if(btn.dataset.menuAction==="detail")openDetail(id);if(btn.dataset.menuAction==="add")addCart(id)});
}

function activateTab(mode){$$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));renderList()}
function openMenu(btn,id){state.menuProduct=state.products.find(p=>p.id===id);const menu=$("#songOptionsMenu"),r=btn.getBoundingClientRect();menu.hidden=false;const w=190;menu.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+"px";menu.style.top=Math.min(innerHeight-150,r.bottom+4)+"px"}
function openDetail(id){const p=state.products.find(x=>x.id===id);if(!p)return;state.selected=p;$("#songModalTitle").textContent=p.titulo;$("#songModalArtist").textContent=p.artista;$("#songPriceMain").textContent=money(p.precio);$("#songModalTags").innerHTML='<div class="tag-row">'+(p.coros?'<span class="pill pill-coro">CORO</span>':'<span class="pill pill-full">SIN COROS</span>')+(p.top?'<span class="pill pill-top">TOP 2026</span>':'')+'</div>';$("#songAddBtn").textContent=state.cart.some(x=>x.id===p.id)?"✓ Agregado":"🛒 Agregar";openBackdrop("#songBackdrop")}
function addCart(id){const p=state.products.find(x=>x.id===id);if(!p)return;if(state.cart.some(x=>x.id===id)){toast("Ese karaoke ya está en tu carrito");return}state.cart.push(p);renderCart();$("#songAddBtn").textContent="✓ Agregado";toast(p.titulo+" agregado")}
function openCart(){closeAll();openBackdrop("#cartBackdrop")}
function openAccount(){closeAll();updateAuth();renderLibrary();renderOrders();openBackdrop("#accountBackdrop")}
function openAuth(mode){closeAll();setAuthMode(mode);openBackdrop("#authBackdrop")}
function setAuthMode(mode){const reg=mode==="register";$$("[data-auth]").forEach(b=>b.classList.toggle("active",b.dataset.auth===mode));$("#nameRow").hidden=!reg;$("#authTitle").textContent=reg?"Crear cuenta":"Iniciar sesión";$("#authCopy").textContent=reg?"Crea tu biblioteca privada de karaokes.":"Accede a tus compras y descargas.";$("#authSubmit").textContent=reg?"Crear cuenta demo":"Ingresar"}
function updateAuth(){$("#loggedOut").hidden=state.loggedIn;$("#loggedIn").hidden=!state.loggedIn}
function showAccountTab(tab){$$("[data-account-tab]").forEach(b=>b.classList.toggle("active",b.dataset.accountTab===tab));$("#libraryPanel").hidden=tab!=="library";$("#ordersPanel").hidden=tab!=="orders";$("#profilePanel").hidden=tab!=="profile"}
function startCheckout(){if(!state.cart.length)return;closeAll();if(!state.loggedIn){openAuth("login");toast("Primero inicia sesión");return}openBackdrop("#checkoutBackdrop")}
function approvePurchase(){const total=state.cart.reduce((s,p)=>s+p.precio,0),items=state.cart.length;state.cart.forEach(p=>{if(!state.library.includes(p.id))state.library.unshift(p.id)});state.orders.unshift({id:String(Date.now()).slice(-6),date:new Date().toLocaleDateString("es-PE"),total,items});state.cart=[];save();renderAll();closeAll();openBackdrop("#successBackdrop")}
function openBackdrop(sel){$(sel).hidden=false}
function closeAll(){$$(".modal-backdrop").forEach(x=>x.hidden=true);$("#songOptionsMenu").hidden=true}
function playDemo(id){const p=state.products.find(x=>x.id===id);if(!p)return;state.playerPct=30;$("#bottomDemoTitle").textContent=p.titulo;$("#bottomDemoArtist").textContent=p.artista;$("#playerProgress").style.width=state.playerPct+"%";$("#bottomDemoPlayer").hidden=false;$("#playerToggle").textContent="❚❚";clearInterval(state.playerTimer);state.playerTimer=setInterval(()=>{state.playerPct++;if(state.playerPct>99)state.playerPct=10;$("#playerProgress").style.width=state.playerPct+"%";$("#playerTime").textContent="0:"+String(Math.floor(state.playerPct*.6)).padStart(2,"0")},600)}
function togglePlayer(){if(state.playerTimer){clearInterval(state.playerTimer);state.playerTimer=null;$("#playerToggle").textContent="▶"}else{state.playerTimer=setInterval(()=>{state.playerPct=(state.playerPct+1)%100;$("#playerProgress").style.width=state.playerPct+"%"},600);$("#playerToggle").textContent="❚❚"}}
function stopPlayer(){clearInterval(state.playerTimer);state.playerTimer=null;$("#bottomDemoPlayer").hidden=true}
function downloadDemo(id){const p=state.products.find(x=>x.id===id);if(!p||!state.library.includes(id)){toast("Compra no verificada");return}const blob=new Blob(["DJGABO KARAOKE STORE V4\nARCHIVO DEMO\n\n"+p.artista+" - "+p.titulo+"\n\nEn producción aquí se descargará el MP4 privado."],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=p.artista+" - "+p.titulo+" DEMO.txt";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),700);toast("Descarga demo iniciada")}
let tt;function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2200)}
init();