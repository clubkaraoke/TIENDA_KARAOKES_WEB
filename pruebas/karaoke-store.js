(() => {
"use strict";
const CATALOG_URL="./data/catalogo-karaoke.json?v=20260829-2";
const PLAYER_TECH_URL="http://149.56.96.226:8770/pruebas/";
const state={all:[],filtered:[],shown:48,mode:"full",cart:new Map()};
const $=s=>document.querySelector(s);
const q=$("#q"),list=$("#list"),count=$("#count"),catalogCounter=$("#catalogCounter"),
statusBox=$("#statusBox"),loadMore=$("#loadMore"),newWrap=$("#newWrap"),newRail=$("#newRail"),
mostWrap=$("#mostRequestedWrap"),mostRail=$("#mostRequestedRail"),cartBtn=$("#floatCartBtn"),
cartLabel=$("#floatCartLabel"),cartBadge=$("#heroCartBadge"),mobileOrderBar=$("#mobileOrderBar"),
mobileOrderCount=$("#mobileOrderCount");

function norm(v=""){return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9ñ]+/g," ").trim()}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function placeholder(item){
 const initials=(item.artista||"DJ").split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
 return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#24183e"/><stop offset="1" stop-color="#5b367f"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="250" cy="205" r="92" fill="rgba(255,255,255,.12)"/><text x="50%" y="47%" text-anchor="middle" fill="white" font-size="72" font-family="Arial" font-weight="800">'+initials+'</text><text x="50%" y="68%" text-anchor="middle" fill="white" font-size="28" font-family="Arial" font-weight="700">KARAOKE DJGABO</text></svg>');
}
function tags(item){
 const a=[];
 if(String(item.coros).toUpperCase()==="SI") a.push("COROS");
 String(item.variante||"").split("/").map(x=>x.trim()).filter(Boolean).forEach(v=>{if(!a.some(x=>norm(x)===norm(v))) a.push(v)});
 if(item.anio) a.push(item.anio);
 return a.slice(0,4)
}
function card(item,compact=false){
 const tagHtml=tags(item).map(x=>'<span>'+esc(x)+'</span>').join("");
 return '<article class="karaoke-card'+(compact?' karaoke-card-compact':'')+'" data-id="'+esc(item.id)+'">'+
 '<button class="karaoke-cover" data-action="demo" aria-label="Demo '+esc(item.titulo)+'"><img src="'+placeholder(item)+'" alt="" loading="lazy"><span class="karaoke-play"><i class="fa-solid fa-play"></i></span></button>'+
 '<div class="karaoke-info"><div class="karaoke-title">'+esc(item.titulo)+'</div><div class="karaoke-artist">'+esc(item.artista||"DJGABO")+'</div>'+
 '<div class="karaoke-tags">'+tagHtml+'</div><div class="karaoke-id">'+esc(item.id)+'</div>'+
 '<div class="karaoke-actions"><button class="karaoke-demo" data-action="demo"><i class="fa-solid fa-play"></i> DEMO</button><button class="karaoke-add" data-action="add"><i class="fa-solid fa-cart-plus"></i> PEDIR</button></div></div></article>'
}
function applyMode(){
 let rows=state.all.slice();
 if(state.mode==="tops") rows=rows.filter(x=>String(x.anio)==="2026");
 if(state.mode==="most") rows=rows.filter(x=>String(x.coros).toUpperCase()==="SI");
 const query=norm(q?.value||"");
 if(query){const toks=query.split(/\s+/);rows=rows.filter(x=>{const hay=norm([x.artista,x.titulo,x.marca,x.anio,x.mes,x.variante].join(" "));return toks.every(t=>hay.includes(t))})}
 state.filtered=rows;state.shown=48;render()
}
function render(){
 const rows=state.filtered.slice(0,state.shown);
 if(list) list.innerHTML='<div class="karaoke-grid">'+rows.map(x=>card(x)).join("")+'</div>';
 if(count) count.textContent=state.filtered.length.toLocaleString("es-PE")+" karaokes";
 if(statusBox) statusBox.style.display="none";
 if(loadMore){loadMore.style.display=state.shown<state.filtered.length?"block":"none";loadMore.textContent="Cargar más karaokes"}
}
function renderRails(){
 if(newWrap&&newRail){newWrap.style.display="";newRail.innerHTML=state.all.slice(0,14).map(x=>card(x,true)).join("")}
 if(mostWrap&&mostRail){const rows=state.all.filter(x=>String(x.coros).toUpperCase()==="SI").slice(0,14);mostWrap.style.display=rows.length?"":"none";mostRail.innerHTML=rows.map(x=>card(x,true)).join("")}
}
function updateCart(){
 const n=state.cart.size;
 if(cartLabel) cartLabel.textContent=n+" karaoke"+(n===1?"":"s");
 if(cartBadge) cartBadge.textContent=String(n);
 if(mobileOrderCount) mobileOrderCount.textContent=n+" karaoke"+(n===1?"":"s");
 if(mobileOrderBar) mobileOrderBar.classList.toggle("is-visible",n>0)
}
function showCart(){
 const a=[...state.cart.values()];
 if(!a.length){alert("Todavía no agregaste karaokes.");return}
 alert("PEDIDO DE PRUEBA\n\n"+a.map((x,i)=>(i+1)+". "+x.artista+" - "+x.titulo).join("\n")+"\n\nSiguiente etapa: este pedido se registrará en Medusa.")
}
function demo(item){
 const ok=confirm("DEMO KARAOKE\n\n"+item.artista+" - "+item.titulo+"\nID: "+item.id+"\n\nEl catálogo ya está conectado al mismo ID del motor.\n\n¿Abrir ahora el panel técnico del reproductor?");
 if(ok) window.open(PLAYER_TECH_URL,"_blank","noopener")
}
function handle(e){
 const b=e.target.closest("[data-action]");if(!b)return;
 const c=b.closest("[data-id]");if(!c)return;
 const item=state.all.find(x=>x.id===c.dataset.id);if(!item)return;
 if(b.dataset.action==="add"){state.cart.has(item.id)?state.cart.delete(item.id):state.cart.set(item.id,item);updateCart()}
 else demo(item)
}
async function init(){
 if(statusBox){statusBox.style.display="block";statusBox.textContent="Cargando catálogo karaoke del MAESTRO..."}
 try{
  const r=await fetch(CATALOG_URL,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);
  const data=await r.json();state.all=Array.isArray(data.items)?data.items:[];state.filtered=state.all.slice();
  if(catalogCounter)catalogCounter.textContent=state.all.length.toLocaleString("es-PE");
  renderRails();render()
 }catch(e){console.error(e);if(statusBox){statusBox.style.display="block";statusBox.textContent="No se pudo cargar el catálogo karaoke."}}
}
q?.addEventListener("input",applyMode);
$("#clearSearchBtn")?.addEventListener("click",()=>{q.value="";applyMode();q.focus()});
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");state.mode=tab.dataset.mode||"full";applyMode()}));
list?.addEventListener("click",handle);newRail?.addEventListener("click",handle);mostRail?.addEventListener("click",handle);
loadMore?.addEventListener("click",()=>{state.shown+=48;render()});
cartBtn?.addEventListener("click",showCart);mobileOrderBar?.addEventListener("click",showCart);
$("#premiumBtn")?.addEventListener("click",()=>$("#catalogo")?.scrollIntoView({behavior:"smooth"}));
$("#goSearchBtn")?.addEventListener("click",()=>{window.scrollTo({top:0,behavior:"smooth"});setTimeout(()=>q?.focus(),400)});
$("#clientAccessTopBtn")?.addEventListener("click",()=>alert("MI CUENTA\n\nSiguiente etapa: Login + Mis Karaokes con Medusa."));
init();
})();