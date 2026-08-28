const state={
  products:[],
  cart:[],
  category:"Todos",
  variant:"Todos",
  search:"",
  sort:"featured",
  loggedIn:false,
  selected:null,
  playerTimer:null,
  playerPct:30,
  library:[]
};

const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const money=n=>"S/"+Number(n).toFixed(2);
const STORAGE_KEY="djgabo-karaoke-demo-v1";

const palette=[
  ["#25324a","#6d56ff"],["#342650","#a35def"],["#17384a","#3d9fc5"],
  ["#4a2d2d","#d46666"],["#243f36","#53ad7c"],["#473919","#d0a13c"],
  ["#2b2f48","#6574d8"],["#40264a","#b259bd"],["#263d46","#4eb8b8"],["#3c2d42","#a967a2"]
];

function loadPersisted(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    state.loggedIn=Boolean(saved.loggedIn);
    state.library=Array.isArray(saved.library)?saved.library:[];
  }catch{
    state.loggedIn=false;
    state.library=[];
  }
}

function persistState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify({
    loggedIn:state.loggedIn,
    library:state.library
  }));
}

async function init(){
  loadPersisted();
  try{
    state.products=await fetch("./data/karaokes.json",{cache:"no-store"}).then(r=>{
      if(!r.ok) throw new Error("No se pudo cargar el catálogo");
      return r.json();
    });
  }catch(err){
    console.error(err);
    state.products=[];
    showToast("No se pudo cargar el catálogo demo");
  }
  renderAll();
  bindStaticEvents();
  updateAuthState();
}

function renderAll(){
  renderNew();
  renderCatalog();
  renderCart();
  renderAccountLibrary();
}

function productColors(p){
  return palette[(p.colorIndex??0)%palette.length];
}

function cardMarkup(p){
  const [a,b]=productColors(p);
  return `
    <article class="product-card" data-product-card="${p.id}">
      <button class="product-cover" type="button" data-open-product="${p.id}" style="--coverA:${a};--coverB:${b}" aria-label="Ver ${escapeHtml(p.titulo)}">
        <span class="cover-ring"></span>
        <span class="cover-icon">🎤</span>
        <span class="cover-label">KARAOKE HD</span>
        ${p.nuevo?'<span class="cover-new">NUEVO</span>':''}
      </button>
      <div class="product-content">
        <h3 class="product-title" title="${escapeHtml(p.titulo)}">${escapeHtml(p.titulo)}</h3>
        <p class="product-artist">${escapeHtml(p.artista)}</p>
        <div class="product-tags">
          <span class="pill">${escapeHtml(p.genero)}</span>
          <span class="pill gray">${p.coros?"CON COROS":"SIN COROS"}</span>
        </div>
        <div class="product-bottom">
          <span class="price">${money(p.precio)}</span>
          <div class="card-actions">
            <button class="mini-button" type="button" data-preview="${p.id}" title="Escuchar demo">▶</button>
            <button class="add-button" type="button" data-add="${p.id}">${state.cart.some(x=>x.id===p.id)?"Agregado ✓":"Agregar"}</button>
          </div>
        </div>
      </div>
    </article>`;
}

function visibleProducts(){
  let list=[...state.products];
  if(state.category!=="Todos"){
    if(state.category==="Top Hits") list=list.filter(p=>p.top);
    else list=list.filter(p=>p.genero===state.category);
  }
  if(state.variant==="Con coros") list=list.filter(p=>p.coros);
  if(state.variant==="Sin coros") list=list.filter(p=>!p.coros);
  if(state.search){
    const q=normalize(state.search);
    list=list.filter(p=>normalize(`${p.artista} ${p.titulo} ${p.genero}`).includes(q));
  }
  if(state.sort==="newest") list.sort((a,b)=>Number(b.nuevo)-Number(a.nuevo)||b.id.localeCompare(a.id));
  if(state.sort==="az") list.sort((a,b)=>a.titulo.localeCompare(b.titulo,"es"));
  if(state.sort==="price") list.sort((a,b)=>a.precio-b.precio);
  if(state.sort==="featured") list.sort((a,b)=>Number(b.top)-Number(a.top)||Number(b.nuevo)-Number(a.nuevo));
  return list;
}

function renderNew(){
  $("#newProducts").innerHTML=state.products.filter(p=>p.nuevo).slice(0,6).map(cardMarkup).join("");
}

function renderCatalog(){
  const list=visibleProducts();
  $("#productGrid").innerHTML=list.map(cardMarkup).join("");
  $("#resultsCount").textContent=`${list.length} ${list.length===1?"resultado":"resultados"}`;
  $("#emptyState").hidden=list.length>0;
  $("#productGrid").hidden=list.length===0;
  let title="Todos los karaokes";
  if(state.search) title=`Resultados para “${state.search}”`;
  else if(state.category!=="Todos") title=state.category==="Top Hits"?"Top Hits 2026":state.category;
  $("#catalogTitle").textContent=title;
}

function renderCart(){
  $("#cartBadge").textContent=state.cart.length;
  const wrap=$("#cartItems");
  if(!state.cart.length){
    wrap.innerHTML='<div class="empty-cart"><span>🛒</span><h3>Tu carrito está vacío</h3><p>Busca un karaoke y presiona “Agregar”.</p></div>';
  }else{
    wrap.innerHTML=state.cart.map(p=>`
      <div class="cart-item">
        <div class="cart-thumb">🎤</div>
        <div class="cart-copy"><strong>${escapeHtml(p.titulo)}</strong><span>${escapeHtml(p.artista)} · ${money(p.precio)}</span></div>
        <button class="remove-cart" type="button" data-remove="${p.id}">QUITAR</button>
      </div>`).join("");
  }
  const total=state.cart.reduce((sum,p)=>sum+p.precio,0);
  $("#cartSubtotal").textContent=money(total);
  $("#cartTotal").textContent=money(total);
  $("#checkoutButton").disabled=!state.cart.length;
}

function renderAccountLibrary(){
  const products=state.library.map(id=>state.products.find(p=>p.id===id)).filter(Boolean);
  $("#libraryItems").innerHTML=products.length?products.map(p=>`
    <div class="library-item">
      <div class="library-thumb">🎤</div>
      <div class="library-copy">
        <strong>${escapeHtml(p.titulo)}</strong>
        <span>${escapeHtml(p.artista)}</span>
        <small>✓ COMPRA VERIFICADA</small>
      </div>
      <button class="download-button" type="button" data-download="${p.id}">⬇ DESCARGAR</button>
    </div>`).join(""):'<div class="empty-cart"><span>🎵</span><h3>Aún no tienes karaokes</h3><p>Haz una compra de prueba y aparecerá aquí.</p></div>';
  const count=$("#libraryPanel .panel-heading>span");
  if(count) count.textContent=`${products.length} comprados`;
}

function bindStaticEvents(){
  document.addEventListener("click",e=>{
    const open=e.target.closest("[data-open-product]");
    if(open){openProduct(open.dataset.openProduct);return}

    const add=e.target.closest("[data-add]");
    if(add){addToCart(add.dataset.add);return}

    const preview=e.target.closest("[data-preview]");
    if(preview){playDemo(preview.dataset.preview);return}

    const remove=e.target.closest("[data-remove]");
    if(remove){removeFromCart(remove.dataset.remove);return}

    const download=e.target.closest("[data-download]");
    if(download){downloadDemo(download.dataset.download);return}

    if(e.target.closest("[data-close-drawer]")) closeDrawers();
    if(e.target.closest("[data-close-modal]")) closeModals();
  });

  $("#globalSearch").addEventListener("input",e=>{
    state.search=e.target.value.trim();
    renderCatalog();
  });
  $("#clearSearch").addEventListener("click",resetSearch);
  $("#resetSearch").addEventListener("click",resetSearch);

  $$(".category").forEach(btn=>btn.addEventListener("click",()=>{
    $$(".category").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    state.category=btn.dataset.category;
    renderCatalog();
    $("#catalogo").scrollIntoView({behavior:"smooth",block:"start"});
  }));

  $$(".filter-pill").forEach(btn=>btn.addEventListener("click",()=>{
    $$(".filter-pill").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    state.variant=btn.dataset.filter;
    renderCatalog();
  }));

  $("#sortSelect").addEventListener("change",e=>{state.sort=e.target.value;renderCatalog()});
  $("#browseButton").addEventListener("click",()=>$("#catalogo").scrollIntoView({behavior:"smooth"}));
  $("#promoButton").addEventListener("click",()=>$("#catalogo").scrollIntoView({behavior:"smooth"}));
  $("#showAllButton").addEventListener("click",()=>{
    state.category="Todos";
    state.search="";
    $("#globalSearch").value="";
    $$(".category").forEach((x,i)=>x.classList.toggle("active",i===0));
    renderCatalog();
    $("#catalogo").scrollIntoView({behavior:"smooth"});
  });

  $("#cartButton").addEventListener("click",()=>openDrawer("#cartDrawer"));
  $("#accountButton").addEventListener("click",()=>openDrawer("#accountDrawer"));
  $("#heroAccountButton").addEventListener("click",()=>openDrawer("#accountDrawer"));
  $("#overlay").addEventListener("click",()=>{closeDrawers();closeModals()});

  $("#loginFromAccount").addEventListener("click",()=>openAuth("login"));
  $("#registerFromAccount").addEventListener("click",()=>openAuth("register"));

  $("#logoutButton").addEventListener("click",()=>{
    state.loggedIn=false;
    persistState();
    updateAuthState();
    showToast("Sesión demo cerrada");
  });

  $$(".account-tabs button").forEach(btn=>btn.addEventListener("click",()=>showAccountTab(btn.dataset.accountTab)));
  $$(".auth-tabs button").forEach(btn=>btn.addEventListener("click",()=>setAuthMode(btn.dataset.authMode)));

  $("#authForm").addEventListener("submit",e=>{
    e.preventDefault();
    state.loggedIn=true;
    persistState();
    closeModals();
    updateAuthState();
    openDrawer("#accountDrawer");
    showToast("Sesión demo iniciada");
  });

  $("#checkoutButton").addEventListener("click",()=>{
    if(!state.cart.length){showToast("Agrega un karaoke primero");return}
    closeDrawers();
    if(!state.loggedIn){
      openAuth("login");
      showToast("Primero inicia sesión para continuar");
      return;
    }
    openModal("#checkoutModal");
  });

  $("#simulatePurchase").addEventListener("click",()=>{
    state.cart.forEach(p=>{if(!state.library.includes(p.id))state.library.unshift(p.id)});
    state.cart=[];
    persistState();
    renderAll();
    closeModals();
    openModal("#successModal");
  });

  $("#goToLibrary").addEventListener("click",()=>{
    closeModals();
    openDrawer("#accountDrawer");
    showAccountTab("library");
  });

  $("#modalDemoButton").addEventListener("click",()=>state.selected&&playDemo(state.selected.id));
  $("#modalAddButton").addEventListener("click",()=>{
    if(!state.selected)return;
    addToCart(state.selected.id);
    closeModals();
    openDrawer("#cartDrawer");
  });

  $("#closePlayer").addEventListener("click",stopPlayer);
  $("#playerToggle").addEventListener("click",togglePlayer);
}

function openProduct(id){
  const p=state.products.find(x=>x.id===id);
  if(!p)return;
  state.selected=p;
  const [a,b]=productColors(p);
  $("#modalCover").style.setProperty("--modalA",a);
  $("#modalCover").style.setProperty("--modalB",b);
  $("#modalTitle").textContent=p.titulo;
  $("#modalArtist").textContent=p.artista;
  $("#modalPrice").textContent=money(p.precio);
  $("#modalBadges").innerHTML=`<span class="pill">${p.genero}</span><span class="pill gray">${p.coros?"CON COROS":"SIN COROS"}</span>`;
  $("#modalAddButton").textContent=state.cart.some(x=>x.id===p.id)?"Ya está en el carrito ✓":"Agregar al carrito";
  openModal("#productModal");
}

function addToCart(id){
  const p=state.products.find(x=>x.id===id);
  if(!p)return;
  if(state.cart.some(x=>x.id===id)){showToast("Ese karaoke ya está en tu carrito");return}
  state.cart.push(p);
  renderAll();
  showToast(`${p.titulo} agregado al carrito`);
}

function removeFromCart(id){
  state.cart=state.cart.filter(p=>p.id!==id);
  renderAll();
}

function downloadDemo(id){
  const p=state.products.find(x=>x.id===id);
  if(!p||!state.library.includes(id)){showToast("Compra no verificada");return}
  const blob=new Blob([
    "DJGABO KARAOKE STORE - ARCHIVO DEMO\n\n"+
    "Karaoke: "+p.titulo+"\n"+
    "Artista: "+p.artista+"\n\n"+
    "En producción este botón entregará el MP4 privado comprado."
  ],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=p.artista+" - "+p.titulo+" DEMO.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  showToast("Descarga demo iniciada");
}

function openDrawer(selector){
  closeModals(false);
  $$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true")});
  const el=$(selector);
  el.classList.add("open");
  el.setAttribute("aria-hidden","false");
  $("#overlay").hidden=false;
  if(selector==="#accountDrawer"){
    updateAuthState();
    renderAccountLibrary();
  }
}

function closeDrawers(hideOverlay=true){
  $$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true")});
  if(hideOverlay) $("#overlay").hidden=true;
}

function openModal(selector){
  closeDrawers(false);
  $$(".modal").forEach(m=>m.hidden=true);
  $(selector).hidden=false;
  $("#overlay").hidden=false;
}

function closeModals(hideOverlay=true){
  $$(".modal").forEach(m=>m.hidden=true);
  if(hideOverlay&&!$$(".drawer.open").length) $("#overlay").hidden=true;
}

function openAuth(mode){
  closeDrawers(false);
  setAuthMode(mode);
  openModal("#authModal");
}

function setAuthMode(mode){
  const register=mode==="register";
  $$(".auth-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.authMode===mode));
  $("#nameField").hidden=!register;
  $("#authTitle").textContent=register?"Crear tu cuenta":"Iniciar sesión";
  $("#authSubtitle").textContent=register?"Guarda tus compras en una biblioteca privada.":"Accede a tus compras y descargas.";
  $("#authSubmit").textContent=register?"Crear cuenta demo":"Ingresar";
}

function updateAuthState(){
  $("#accountLoggedOut").hidden=state.loggedIn;
  $("#accountLoggedIn").hidden=!state.loggedIn;
}

function showAccountTab(tab){
  $$(".account-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.accountTab===tab));
  $("#libraryPanel").hidden=tab!=="library";
  $("#ordersPanel").hidden=tab!=="orders";
  $("#profilePanel").hidden=tab!=="profile";
}

function playDemo(id){
  const p=state.products.find(x=>x.id===id);
  if(!p)return;
  state.playerPct=30;
  $("#playerSong").textContent=p.titulo;
  $("#playerArtist").textContent=p.artista;
  $("#playerProgress").style.width=state.playerPct+"%";
  $("#demoPlayer").hidden=false;
  $("#playerToggle").textContent="❚❚";
  clearInterval(state.playerTimer);
  state.playerTimer=setInterval(()=>{
    state.playerPct+=1;
    if(state.playerPct>=100)state.playerPct=10;
    $("#playerProgress").style.width=state.playerPct+"%";
    const sec=Math.floor(state.playerPct*.6);
    $("#playerTime").textContent=`0:${String(sec).padStart(2,"0")} / 1:00`;
  },600);
}

function togglePlayer(){
  if(state.playerTimer){
    clearInterval(state.playerTimer);
    state.playerTimer=null;
    $("#playerToggle").textContent="▶";
  }else{
    $("#playerToggle").textContent="❚❚";
    state.playerTimer=setInterval(()=>{
      state.playerPct=(state.playerPct+1)%100;
      $("#playerProgress").style.width=state.playerPct+"%";
    },600);
  }
}

function stopPlayer(){
  clearInterval(state.playerTimer);
  state.playerTimer=null;
  $("#demoPlayer").hidden=true;
}

function resetSearch(){
  state.search="";
  $("#globalSearch").value="";
  renderCatalog();
}

let toastTimer;
function showToast(msg){
  const el=$("#toast");
  el.textContent=msg;
  el.hidden=false;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.hidden=true,2300);
}

function normalize(v){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function escapeHtml(v){
  return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

init();
