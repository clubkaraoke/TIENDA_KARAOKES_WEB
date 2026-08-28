const state={products:[],cart:[]};
const $=s=>document.querySelector(s);
const grid=$("#productGrid"), count=$("#resultCount"), search=$("#searchInput");
async function load(){
  try{state.products=await fetch("../data/mock-karaokes.json").then(r=>r.json())}
  catch(e){state.products=[]}
  render(state.products);
}
function render(items){
  count.textContent=items.length+" karaokes";
  grid.innerHTML=items.map(p=>`
    <article class="product">
      <div class="cover">♪</div>
      <h3>${p.titulo}</h3>
      <div class="artist">${p.artista}</div>
      <div class="product-meta"><span class="tag">${p.genero}</span><span class="price">S/${Number(p.precio_pen).toFixed(2)}</span></div>
      <div class="product-actions">
        <button class="preview" data-preview="${p.id}" title="Escuchar demo">▶</button>
        <button class="add" data-add="${p.id}">Agregar</button>
      </div>
    </article>`).join("");
}
function filter(){
  const q=search.value.trim().toLowerCase();
  const active=$(".nav button.active")?.dataset.filter||"Todos";
  const items=state.products.filter(p=>(!q||(`${p.artista} ${p.titulo}`.toLowerCase().includes(q)))&&(active==="Todos"||active==="Top Hits"||p.genero===active));
  render(items);
}
function openDrawer(el){
  $("#backdrop").hidden=false;
  document.querySelectorAll(".drawer").forEach(x=>x.classList.remove("open"));
  el.classList.add("open"); el.setAttribute("aria-hidden","false");
}
function closeAll(){
  $("#backdrop").hidden=true;
  document.querySelectorAll(".drawer").forEach(x=>{x.classList.remove("open");x.setAttribute("aria-hidden","true")});
}
function updateCart(){
  $("#cartCount").textContent=state.cart.length;
  $("#cartTotal").textContent="S/"+state.cart.reduce((a,p)=>a+Number(p.precio_pen),0).toFixed(2);
  $("#cartItems").innerHTML=state.cart.length?state.cart.map((p,i)=>`<div class="cart-line"><div class="thumb">♪</div><div><strong>${p.titulo}</strong><span>${p.artista} · S/${Number(p.precio_pen).toFixed(2)}</span></div><button data-remove="${i}">Quitar</button></div>`).join(""):`<div class="empty-cart">Tu carrito está vacío.</div>`;
}
document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add]"); if(add){const p=state.products.find(x=>x.id===add.dataset.add); if(p&&!state.cart.some(x=>x.id===p.id))state.cart.push(p);updateCart();openDrawer($("#cartDrawer"));return}
  const prev=e.target.closest("[data-preview]"); if(prev){const p=state.products.find(x=>x.id===prev.dataset.preview);$("#playerTitle").textContent=p.titulo;$("#playerArtist").textContent=p.artista;$("#player").hidden=false;return}
  const rem=e.target.closest("[data-remove]"); if(rem){state.cart.splice(Number(rem.dataset.remove),1);updateCart();return}
  if(e.target.closest("[data-close]"))closeAll();
});
search.addEventListener("input",filter);
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter()}));
$("#cartBtn").onclick=()=>openDrawer($("#cartDrawer"));
$("#accountBtn").onclick=()=>openDrawer($("#accountDrawer"));
$("#myKaraokesBtn").onclick=()=>openDrawer($("#accountDrawer"));
$("#exploreBtn").onclick=()=>$("#catalog").scrollIntoView({behavior:"smooth"});
$("#backdrop").onclick=closeAll;
$("#closePlayer").onclick=()=>$("#player").hidden=true;
$("#checkoutBtn").onclick=()=>{if(!state.cart.length)return;closeAll();$("#backdrop").hidden=false;$("#checkoutModal").hidden=false};
$("#closeCheckout").onclick=()=>{$("#checkoutModal").hidden=true;$("#backdrop").hidden=true};
$("#openAccountAfter").onclick=()=>{$("#checkoutModal").hidden=true;openDrawer($("#accountDrawer"))};
load();