const state={products:[],cart:[],genre:"Todos",filter:"Todos",sort:"featured",search:"",loggedIn:false,library:[],selected:null,playerTimer:null,playerPct:30};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>"S/"+Number(n).toFixed(2);
const KEY="djgabo-karaoke-v2-demo";
const palette=[["#20283d","#684eff"],["#34243f","#a05be9"],["#153744","#3393aa"],["#402a2a","#c95e5e"],["#1f3e34","#4dab78"],["#433916","#c79a36"],["#282d48","#6675d2"],["#3c2546","#a953b7"],["#233c44","#46a8a8"],["#372c42","#9763a2"]];

function loadSaved(){try{const v=JSON.parse(localStorage.getItem(KEY)||"{}");state.loggedIn=!!v.loggedIn;state.library=Array.isArray(v.library)?v.library:[]}catch{}}
function save(){localStorage.setItem(KEY,JSON.stringify({loggedIn:state.loggedIn,library:state.library}))}
function colors(p){return palette[(p.colorIndex||0)%palette.length]}
function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function escape(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function init(){
 loadSaved();
 try{state.products=await fetch("../data/karaokes.json",{cache:"no-store"}).then(r=>r.json())}catch(e){console.error(e);showToast("No se pudo cargar el catálogo")}
 bind();renderAll();updateAuth();
}

function visible(){
 let list=[...state.products];
 if(state.genre!=="Todos"){
   if(state.genre==="Top Hits") list=list.filter(p=>p.top);
   else if(state.genre!=="Más") list=list.filter(p=>p.genero===state.genre);
 }
 if(state.filter==="Con coros") list=list.filter(p=>p.coros);
 if(state.filter==="Sin coros") list=list.filter(p=>!p.coros);
 if(state.search){const q=norm(state.search);list=list.filter(p=>norm(p.artista+" "+p.titulo+" "+p.genero).includes(q))}
 if(state.sort==="newest") list.sort((a,b)=>Number(b.nuevo)-Number(a.nuevo)||b.id.localeCompare(a.id));
 else if(state.sort==="az") list.sort((a,b)=>a.titulo.localeCompare(b.titulo,"es"));
 else list.sort((a,b)=>Number(b.top)-Number(a.top)||Number(b.nuevo)-Number(a.nuevo));
 return list;
}

function card(p,compact=false){
 const [a,b]=colors(p);
 return `<article class="product-card">
   <button class="product-image" data-open="${p.id}" style="--a:${a};--b:${b}">
     <span class="mic">🎤</span>
     <span class="image-badge">${p.nuevo?"NUEVO":"KARAOKE HD"}</span>
     <span class="play-fab" data-demo="${p.id}">▶</span>
   </button>
   <div class="product-info">
     <h3 title="${escape(p.titulo)}">${escape(p.titulo)}</h3>
     <p class="artist">${escape(p.artista)}</p>
     <div class="product-meta"><span class="chip">${escape(p.genero)}</span><span class="chip gray">${p.coros?"CON COROS":"SIN COROS"}</span></div>
     <div class="product-buy"><strong>${money(p.precio)}</strong><button class="add-btn" data-add="${p.id}">${state.cart.some(x=>x.id===p.id)?"Agregado ✓":"Agregar"}</button></div>
   </div>
 </article>`;
}

function renderAll(){renderFeatured();renderMini();renderCatalog();renderCart();renderLibrary()}

function renderFeatured(){
 const list=state.products.filter(p=>p.top).slice(0,4);
 $("#featuredRow").innerHTML=list.map(p=>card(p)).join("");
}

function renderMini(){
 const list=state.products.filter(p=>p.nuevo).slice(0,3);
 $("#newMini").innerHTML=list.map(p=>`<article class="mini-card"><div class="mini-art">🎤</div><strong>${escape(p.titulo)}</strong><small>${escape(p.artista)}</small></article>`).join("");
}

function renderCatalog(){
 const list=visible();
 $("#catalogGrid").innerHTML=list.map(p=>card(p)).join("");
 $("#resultCount").textContent=list.length+" "+(list.length===1?"karaoke":"karaokes");
 $("#emptyState").hidden=list.length>0;$("#catalogGrid").hidden=list.length===0;
 let title="Todos los karaokes";
 if(state.search) title='Resultados para “'+state.search+'”';
 else if(state.genre!=="Todos") title=state.genre==="Top Hits"?"Top Hits 2026":state.genre;
 $("#catalogTitle").textContent=title;
}

function renderCart(){
 $("#cartCount").textContent=state.cart.length;
 $("#cartTotal").textContent=money(state.cart.reduce((s,p)=>s+p.precio,0));
 $("#cartItems").innerHTML=state.cart.length?state.cart.map(p=>`<div class="cart-line"><div class="cart-thumb">🎤</div><div><strong>${escape(p.titulo)}</strong><small>${escape(p.artista)} · ${money(p.precio)}</small></div><button class="remove" data-remove="${p.id}">QUITAR</button></div>`).join(""):'<div class="cart-empty"><span>🛒</span><h3>Tu carrito está vacío</h3><p>Agrega un karaoke para probar la compra.</p></div>';
}

function renderLibrary(){
 const list=state.library.map(id=>state.products.find(p=>p.id===id)).filter(Boolean);
 $("#libraryCount").textContent=list.length;
 $("#libraryList").innerHTML=list.length?list.map(p=>`<div class="library-line"><div class="library-thumb">🎤</div><div><strong>${escape(p.titulo)}</strong><small>${escape(p.artista)}</small><small class="verified">✓ COMPRA VERIFICADA</small></div><button class="download-btn" data-download="${p.id}">⬇ DESCARGAR</button></div>`).join(""):'<div class="cart-empty"><span>🎵</span><h3>Aún no tienes karaokes</h3><p>Haz una compra simulada y aparecerá aquí.</p></div>';
}

function setGenre(g){
 state.genre=g;state.search="";$("#searchInput").value="";$("#heroSearch").value="";
 $$(".genre").forEach(b=>b.classList.toggle("active",b.dataset.genre===g));
 renderCatalog();$("#catalogo").scrollIntoView({behavior:"smooth",block:"start"});
}

function bind(){
 document.addEventListener("click",e=>{
   const open=e.target.closest("[data-open]");if(open&&!e.target.closest("[data-demo]")){openProduct(open.dataset.open);return}
   const demo=e.target.closest("[data-demo]");if(demo){e.stopPropagation();playDemo(demo.dataset.demo);return}
   const add=e.target.closest("[data-add]");if(add){addCart(add.dataset.add);return}
   const remove=e.target.closest("[data-remove]");if(remove){state.cart=state.cart.filter(p=>p.id!==remove.dataset.remove);renderAll();return}
   const dl=e.target.closest("[data-download]");if(dl){downloadDemo(dl.dataset.download);return}
   if(e.target.closest("[data-close-drawer]"))closeDrawers();
   if(e.target.closest("[data-close-modal]"))closeModals();
 });
 $$(".genre").forEach(b=>b.onclick=()=>setGenre(b.dataset.genre));
 $$("[data-quick]").forEach(b=>b.onclick=()=>setGenre(b.dataset.quick));
 $$("[data-show-genre]").forEach(b=>b.onclick=()=>setGenre(b.dataset.showGenre));
 $$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;renderCatalog()});
 $("#sortSelect").onchange=e=>{state.sort=e.target.value;renderCatalog()};
 $("#searchInput").oninput=e=>{state.search=e.target.value.trim();$("#heroSearch").value=state.search;renderCatalog()};
 $("#heroSearch").oninput=e=>{state.search=e.target.value.trim();$("#searchInput").value=state.search};
 $("#heroSearchBtn").onclick=()=>{renderCatalog();$("#catalogo").scrollIntoView({behavior:"smooth"})};
 $("#newestBtn").onclick=()=>{state.sort="newest";$("#sortSelect").value="newest";setGenre("Todos")};
 $("#resetBtn").onclick=()=>{state.search="";$("#searchInput").value="";$("#heroSearch").value="";renderCatalog()};
 $("#cartBtn").onclick=()=>openDrawer("#cartDrawer");
 $("#accountBtn").onclick=()=>openDrawer("#accountDrawer");
 $("#overlay").onclick=()=>{closeDrawers();closeModals()};
 $("#loginBtn").onclick=()=>openAuth("login");
 $("#registerBtn").onclick=()=>openAuth("register");
 $("#logoutBtn").onclick=()=>{state.loggedIn=false;save();updateAuth();showToast("Sesión demo cerrada")};
 $$("[data-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
 $$("[data-auth]").forEach(b=>b.onclick=()=>setAuth(b.dataset.auth));
 $("#authForm").onsubmit=e=>{e.preventDefault();state.loggedIn=true;save();closeModals();openDrawer("#accountDrawer");showToast("Sesión demo iniciada")};
 $("#checkoutBtn").onclick=()=>{if(!state.cart.length){showToast("Agrega un karaoke primero");return}closeDrawers(false);if(!state.loggedIn){openAuth("login");showToast("Primero inicia sesión");return}openModal("#checkoutModal")};
 $("#approveBtn").onclick=()=>{state.cart.forEach(p=>{if(!state.library.includes(p.id))state.library.unshift(p.id)});state.cart=[];save();renderAll();closeModals(false);openModal("#successModal")};
 $("#goLibraryBtn").onclick=()=>{closeModals();openDrawer("#accountDrawer");showTab("library")};
 $("#modalDemoBtn").onclick=()=>state.selected&&playDemo(state.selected.id);
 $("#modalAddBtn").onclick=()=>{if(!state.selected)return;addCart(state.selected.id);closeModals(false);openDrawer("#cartDrawer")};
 $("#playerClose").onclick=stopPlayer;
 $("#playerPlay").onclick=togglePlayer;
}

function addCart(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;
 if(state.cart.some(x=>x.id===id)){showToast("Ese karaoke ya está en tu carrito");return}
 state.cart.push(p);renderAll();showToast(p.titulo+" agregado");
}

function openProduct(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;state.selected=p;
 const [a,b]=colors(p);$("#modalArt").style.setProperty("--ma",a);$("#modalArt").style.setProperty("--mb",b);
 $("#modalTitle").textContent=p.titulo;$("#modalArtist").textContent=p.artista;$("#modalPrice").textContent=money(p.precio);
 $("#modalTags").innerHTML='<span class="chip">'+escape(p.genero)+'</span> <span class="chip gray">'+(p.coros?"CON COROS":"SIN COROS")+'</span>';
 $("#modalAddBtn").textContent=state.cart.some(x=>x.id===p.id)?"Ya está en el carrito ✓":"Agregar al carrito";
 openModal("#productModal");
}

function openDrawer(sel){
 closeModals(false);$$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true")});
 const d=$(sel);d.classList.add("open");d.setAttribute("aria-hidden","false");$("#overlay").hidden=false;
 if(sel==="#accountDrawer"){updateAuth();renderLibrary()}
}
function closeDrawers(hide=true){$$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true")});if(hide)$("#overlay").hidden=true}
function openModal(sel){closeDrawers(false);$$(".modal").forEach(m=>m.hidden=true);$(sel).hidden=false;$("#overlay").hidden=false}
function closeModals(hide=true){$$(".modal").forEach(m=>m.hidden=true);if(hide&&!$$(".drawer.open").length)$("#overlay").hidden=true}
function openAuth(mode){closeDrawers(false);setAuth(mode);openModal("#authModal")}
function setAuth(mode){const reg=mode==="register";$$("[data-auth]").forEach(b=>b.classList.toggle("active",b.dataset.auth===mode));$("#nameField").hidden=!reg;$("#authTitle").textContent=reg?"Crear cuenta":"Iniciar sesión";$("#authText").textContent=reg?"Crea tu biblioteca privada de karaokes.":"Accede a tus compras y descargas.";$("#authSubmit").textContent=reg?"Crear cuenta demo":"Ingresar"}
function updateAuth(){$("#loggedOut").hidden=state.loggedIn;$("#loggedIn").hidden=!state.loggedIn}
function showTab(tab){$$("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));$("#libraryPanel").hidden=tab!=="library";$("#ordersPanel").hidden=tab!=="orders";$("#profilePanel").hidden=tab!=="profile"}

function playDemo(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;state.playerPct=30;
 $("#playerTitle").textContent=p.titulo;$("#playerArtist").textContent=p.artista;$("#playerProgress").style.width=state.playerPct+"%";$("#player").hidden=false;$("#playerPlay").textContent="❚❚";
 clearInterval(state.playerTimer);state.playerTimer=setInterval(()=>{state.playerPct+=1;if(state.playerPct>99)state.playerPct=10;$("#playerProgress").style.width=state.playerPct+"%";const s=Math.floor(state.playerPct*.6);$("#playerTime").textContent="0:"+String(s).padStart(2,"0")+" / 1:00"},600)
}
function togglePlayer(){if(state.playerTimer){clearInterval(state.playerTimer);state.playerTimer=null;$("#playerPlay").textContent="▶"}else{state.playerTimer=setInterval(()=>{state.playerPct=(state.playerPct+1)%100;$("#playerProgress").style.width=state.playerPct+"%"},600);$("#playerPlay").textContent="❚❚"}}
function stopPlayer(){clearInterval(state.playerTimer);state.playerTimer=null;$("#player").hidden=true}
function downloadDemo(id){const p=state.products.find(x=>x.id===id);if(!p||!state.library.includes(id))return;const blob=new Blob(["DJGABO KARAOKE STORE V2\nARCHIVO DEMO\n\n"+p.artista+" - "+p.titulo+"\n\nEn producción aquí se descargará el MP4 privado."],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=p.artista+" - "+p.titulo+" DEMO.txt";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),600);showToast("Descarga demo iniciada")}
let tt;function showToast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,2200)}
init();