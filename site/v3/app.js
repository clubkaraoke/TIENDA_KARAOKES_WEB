const state={products:[],cart:[],genre:"Todos",filter:"Todos",sort:"featured",search:"",loggedIn:false,library:[],orders:[],selected:null,playerTimer:null,playerPct:30};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const KEY="djgabo-v3-demo";
const palette=[["#24304a","#6a51ee"],["#3b294d","#a15be9"],["#163743","#3998ad"],["#4a2b2b","#cf6464"],["#234036","#53ac7c"],["#463817","#c99c38"],["#2a2f49","#6875d4"],["#41264a","#aa57b9"],["#223d46","#47a9aa"],["#3a2d43","#9d64a4"]];
const money=n=>"S/"+Number(n).toFixed(2);
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function colors(p){return palette[(p.colorIndex||0)%palette.length]}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||"{}");state.loggedIn=!!s.loggedIn;state.library=Array.isArray(s.library)?s.library:[];state.orders=Array.isArray(s.orders)?s.orders:[]}catch{}}
function save(){localStorage.setItem(KEY,JSON.stringify({loggedIn:state.loggedIn,library:state.library,orders:state.orders}))}

async function init(){
 load();
 try{state.products=await fetch("../data/karaokes.json",{cache:"no-store"}).then(r=>r.json())}catch(e){console.error(e);toast("No se pudo cargar el catálogo")}
 bind();renderAll();updateAuth();
}

function visible(){
 let list=[...state.products];
 if(state.genre!=="Todos"){
   if(state.genre==="Top Hits") list=list.filter(p=>p.top);
   else if(state.genre!=="Más") list=list.filter(p=>p.genero===state.genre);
 }
 if(state.filter==="Con coros")list=list.filter(p=>p.coros);
 if(state.filter==="Sin coros")list=list.filter(p=>!p.coros);
 if(state.search){const q=norm(state.search);list=list.filter(p=>norm(p.titulo+" "+p.artista+" "+p.genero).includes(q))}
 if(state.sort==="newest")list.sort((a,b)=>Number(b.nuevo)-Number(a.nuevo)||b.id.localeCompare(a.id));
 else if(state.sort==="az")list.sort((a,b)=>a.titulo.localeCompare(b.titulo,"es"));
 else list.sort((a,b)=>Number(b.top)-Number(a.top)||Number(b.nuevo)-Number(a.nuevo));
 return list;
}

function card(p){
 const [a,b]=colors(p);
 return `<article class="product-card">
   <div class="product-visual" style="--a:${a};--b:${b}">
     <span class="product-status">${p.nuevo?"NUEVO":"KARAOKE HD"}</span>
     <span class="product-mic">🎤</span>
     <button class="demo-fab" data-demo="${p.id}" title="Escuchar demo">▶</button>
     <button class="quick-view" data-open="${p.id}">Vista rápida</button>
   </div>
   <div class="product-info">
     <h3 title="${esc(p.titulo)}">${esc(p.titulo)}</h3>
     <p class="artist">${esc(p.artista)}</p>
     <div class="product-tags"><span class="tag">${esc(p.genero)}</span><span class="tag gray">${p.coros?"CON COROS":"SIN COROS"}</span></div>
     <div class="product-price"><strong>${money(p.precio)}</strong><button class="add-btn" data-add="${p.id}">${state.cart.some(x=>x.id===p.id)?"Agregado ✓":"Agregar"}</button></div>
   </div>
 </article>`;
}

function renderAll(){renderTop();renderCatalog();renderCart();renderLibrary();renderOrders()}
function renderTop(){$("#topGrid").innerHTML=state.products.filter(p=>p.top).slice(0,5).map(card).join("")}
function renderCatalog(){
 const list=visible();$("#productGrid").innerHTML=list.map(card).join("");
 $("#resultsText").textContent=list.length+" "+(list.length===1?"resultado":"resultados");
 $("#emptyState").hidden=list.length>0;$("#productGrid").hidden=list.length===0;
 let title="Todos los karaokes";if(state.search)title='Resultados para “'+state.search+'”';else if(state.genre!=="Todos")title=state.genre==="Top Hits"?"Top Hits 2026":state.genre;$("#catalogTitle").textContent=title;
}
function renderCart(){
 $("#cartCount").textContent=state.cart.length;
 const total=state.cart.reduce((s,p)=>s+p.precio,0);$("#subtotal").textContent=money(total);$("#total").textContent=money(total);
 $("#cartItems").innerHTML=state.cart.length?state.cart.map(p=>`<div class="cart-line"><div class="cart-thumb">🎤</div><div><strong>${esc(p.titulo)}</strong><small>${esc(p.artista)} · ${money(p.precio)}</small></div><button class="remove" data-remove="${p.id}">QUITAR</button></div>`).join(""):'<div class="cart-empty"><span>🛒</span><h3>Tu carrito está vacío</h3><p>Agrega un karaoke para comenzar.</p></div>';
 $("#checkoutMini").innerHTML=state.cart.map(p=>`<article><span>${esc(p.titulo)}<small> · ${esc(p.artista)}</small></span><b>${money(p.precio)}</b></article>`).join("");
}
function renderLibrary(){
 const list=state.library.map(id=>state.products.find(p=>p.id===id)).filter(Boolean);$("#libraryCount").textContent=list.length;
 $("#libraryList").innerHTML=list.length?list.map(p=>`<div class="library-line"><div class="library-thumb">🎤</div><div><strong>${esc(p.titulo)}</strong><small>${esc(p.artista)} · MP4 HD</small><small class="verified">✓ COMPRA VERIFICADA</small></div><button class="download-btn" data-download="${p.id}">⬇ DESCARGAR</button></div>`).join(""):'<div class="cart-empty"><span>🎵</span><h3>Aún no tienes karaokes</h3><p>Haz una compra simulada y aparecerá aquí.</p></div>';
}
function renderOrders(){
 $("#ordersList").innerHTML=state.orders.length?state.orders.map(o=>`<article class="order-card"><div class="order-card-head"><div><strong>Pedido #${o.id}</strong><small>${o.items} ${o.items===1?"karaoke":"karaokes"}</small></div><div><strong>${o.date}</strong><small>Fecha del pedido</small></div></div><div class="order-card-foot"><span class="paid">Pagado</span><b>${money(o.total)}</b></div></article>`).join(""):'<div class="cart-empty"><span>🧾</span><h3>Sin pedidos todavía</h3><p>Las compras simuladas aparecerán aquí.</p></div>';
}

function bind(){
 document.addEventListener("click",e=>{
   const add=e.target.closest("[data-add]");if(add){addCart(add.dataset.add);return}
   const open=e.target.closest("[data-open]");if(open){openProduct(open.dataset.open);return}
   const demo=e.target.closest("[data-demo]");if(demo){playDemo(demo.dataset.demo);return}
   const rem=e.target.closest("[data-remove]");if(rem){state.cart=state.cart.filter(p=>p.id!==rem.dataset.remove);renderAll();return}
   const down=e.target.closest("[data-download]");if(down){downloadDemo(down.dataset.download);return}
   if(e.target.closest("[data-close-drawer]"))closeDrawers();
   if(e.target.closest("[data-close-modal]"))closeModals();
 });
 $$(".nav-item[data-genre]").forEach(b=>b.onclick=()=>setGenre(b.dataset.genre));
 $$("[data-show]").forEach(b=>b.onclick=()=>setGenre(b.dataset.show));
 $$(".segmented button").forEach(b=>b.onclick=()=>{$$(".segmented button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;renderCatalog()});
 $("#sortSelect").onchange=e=>{state.sort=e.target.value;renderCatalog()};
 $("#searchInput").oninput=e=>{state.search=e.target.value.trim();renderCatalog()};
 $("#clearSearch").onclick=()=>{state.search="";$("#searchInput").value="";renderCatalog()};
 $("#resetBtn").onclick=()=>{state.search="";$("#searchInput").value="";renderCatalog()};
 $("#heroCatalogBtn").onclick=()=>$("#catalogo").scrollIntoView({behavior:"smooth"});
 $("#newestBtn").onclick=()=>{state.sort="newest";$("#sortSelect").value="newest";setGenre("Todos")};
 $("#heroLibraryBtn").onclick=()=>openLibrary();
 $("#libraryBtn").onclick=()=>openLibrary();
 $("#libraryBannerBtn").onclick=()=>openLibrary();
 $("#cartBtn").onclick=()=>openDrawer("#cartDrawer");
 $("#accountBtn").onclick=()=>openDrawer("#accountDrawer");
 $("#overlay").onclick=()=>{closeDrawers();closeModals()};
 $("#loginBtn").onclick=()=>openAuth("login");$("#registerBtn").onclick=()=>openAuth("register");
 $("#logoutBtn").onclick=()=>{state.loggedIn=false;save();updateAuth();toast("Sesión demo cerrada")};
 $$("[data-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
 $$("[data-auth]").forEach(b=>b.onclick=()=>setAuth(b.dataset.auth));
 $("#authForm").onsubmit=e=>{e.preventDefault();state.loggedIn=true;save();closeModals();openDrawer("#accountDrawer");showTab("library");toast("Sesión demo iniciada")};
 $("#checkoutBtn").onclick=()=>{if(!state.cart.length){toast("Agrega un karaoke primero");return}if(!state.loggedIn){closeDrawers(false);openAuth("login");toast("Primero inicia sesión");return}closeDrawers(false);openModal("#checkoutModal")};
 $("#approveBtn").onclick=approvePurchase;
 $("#goLibraryBtn").onclick=()=>{closeModals();openDrawer("#accountDrawer");showTab("library")};
 $("#detailDemoBtn").onclick=()=>state.selected&&playDemo(state.selected.id);
 $("#detailAddBtn").onclick=()=>{if(!state.selected)return;addCart(state.selected.id);closeModals(false);openDrawer("#cartDrawer")};
 $("#playerClose").onclick=stopPlayer;$("#playPause").onclick=togglePlayer;
}

function setGenre(g){state.genre=g;state.search="";$("#searchInput").value="";$$(".nav-item[data-genre]").forEach(b=>b.classList.toggle("active",b.dataset.genre===g));renderCatalog();$("#catalogo").scrollIntoView({behavior:"smooth",block:"start"})}
function addCart(id){const p=state.products.find(x=>x.id===id);if(!p)return;if(state.cart.some(x=>x.id===id)){toast("Ese karaoke ya está en tu carrito");return}state.cart.push(p);renderAll();toast(p.titulo+" agregado")}
function openProduct(id){const p=state.products.find(x=>x.id===id);if(!p)return;state.selected=p;const [a,b]=colors(p);$("#detailArt").style.setProperty("--ma",a);$("#detailArt").style.setProperty("--mb",b);$("#detailTitle").textContent=p.titulo;$("#detailArtist").textContent=p.artista;$("#detailPrice").textContent=money(p.precio);$("#detailTags").innerHTML='<span class="tag">'+esc(p.genero)+'</span><span class="tag gray">'+(p.coros?"CON COROS":"SIN COROS")+'</span>';$("#detailAddBtn").textContent=state.cart.some(x=>x.id===p.id)?"Ya está en el carrito ✓":"Agregar al carrito";openModal("#productModal")}

function openLibrary(){openDrawer("#accountDrawer");if(state.loggedIn)showTab("library")}
function openDrawer(sel){closeModals(false);$$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true")});const d=$(sel);d.classList.add("open");d.setAttribute("aria-hidden","false");$("#overlay").hidden=false;if(sel==="#accountDrawer"){updateAuth();renderLibrary();renderOrders()}}
function closeDrawers(hide=true){$$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true")});if(hide)$("#overlay").hidden=true}
function openModal(sel){closeDrawers(false);$$(".modal").forEach(m=>m.hidden=true);$(sel).hidden=false;$("#overlay").hidden=false}
function closeModals(hide=true){$$(".modal").forEach(m=>m.hidden=true);if(hide&&!$$(".drawer.open").length)$("#overlay").hidden=true}
function openAuth(mode){setAuth(mode);openModal("#authModal")}
function setAuth(mode){const reg=mode==="register";$$("[data-auth]").forEach(b=>b.classList.toggle("active",b.dataset.auth===mode));$("#nameField").hidden=!reg;$("#authTitle").textContent=reg?"Crear cuenta":"Iniciar sesión";$("#authDescription").textContent=reg?"Crea tu biblioteca privada de karaokes.":"Accede a tus compras y descargas.";$("#authSubmit").textContent=reg?"Crear cuenta demo":"Ingresar"}
function updateAuth(){$("#loggedOut").hidden=state.loggedIn;$("#loggedIn").hidden=!state.loggedIn}
function showTab(tab){$$("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));$("#libraryPanel").hidden=tab!=="library";$("#ordersPanel").hidden=tab!=="orders";$("#profilePanel").hidden=tab!=="profile"}

function approvePurchase(){const total=state.cart.reduce((s,p)=>s+p.precio,0),items=state.cart.length;state.cart.forEach(p=>{if(!state.library.includes(p.id))state.library.unshift(p.id)});state.orders.unshift({id:String(Date.now()).slice(-6),date:new Date().toLocaleDateString("es-PE"),items,total});state.cart=[];save();renderAll();closeModals(false);openModal("#successModal")}
function playDemo(id){const p=state.products.find(x=>x.id===id);if(!p)return;state.playerPct=30;$("#playerTitle").textContent=p.titulo;$("#playerArtist").textContent=p.artista;$("#progress").style.width=state.playerPct+"%";$("#player").hidden=false;$("#playPause").textContent="❚❚";clearInterval(state.playerTimer);state.playerTimer=setInterval(()=>{state.playerPct++;if(state.playerPct>99)state.playerPct=10;$("#progress").style.width=state.playerPct+"%";const s=Math.floor(state.playerPct*.6);$("#playerTime").textContent="0:"+String(s).padStart(2,"0")+" / 1:00"},600)}
function togglePlayer(){if(state.playerTimer){clearInterval(state.playerTimer);state.playerTimer=null;$("#playPause").textContent="▶"}else{state.playerTimer=setInterval(()=>{state.playerPct=(state.playerPct+1)%100;$("#progress").style.width=state.playerPct+"%"},600);$("#playPause").textContent="❚❚"}}
function stopPlayer(){clearInterval(state.playerTimer);state.playerTimer=null;$("#player").hidden=true}
function downloadDemo(id){const p=state.products.find(x=>x.id===id);if(!p||!state.library.includes(id)){toast("Compra no verificada");return}const blob=new Blob(["DJGABO KARAOKE STORE V3\nARCHIVO DEMO\n\n"+p.artista+" - "+p.titulo+"\n\nEn producción aquí se descargará el MP4 privado."],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=p.artista+" - "+p.titulo+" DEMO.txt";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),600);toast("Descarga demo iniciada")}
let toastTimer;function toast(msg){const el=$("#toast");el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2200)}
init();