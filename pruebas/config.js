const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const WHATSAPP_NUMBER = "51921675846";
const PROMO_ACTIVE = true;
const PROMO_CODE = "CLIENTE-FRECUENTE-WEB";
let PROMO_MAX_FREE = 2;
let PROMO_MIN_PAID = 2;
const PROMO_USED_KEY = "djgabo_promo_lanzamiento_web_usada_v2";
const CAMPAIGN_SEGMENT = "CAMPANIA";
const CAMPAIGN_CLAIM_KEY = "djgabo_campania_reclamo_v1";
const CAMPAIGN_PHONE_KEY = "djgabo_campania_whatsapp_v1";
const CLIENTES_API_URL =
"https://script.google.com/macros/s/AKfycbw7tZhfRhN18yikrZWgozffmWS8HsWR2OWyevtNstsjJyNJAt7qcFgaklf-h7MYUW_5EA/exec";
const CLIENT_VERIFY_URL = CLIENTES_API_URL;
const CLIENT_ACCESS_KEY = "djgabo_cliente_frecuente_verificado_v1";
const CLIENT_ACCESS_TTL_MS = 24 * 60 * 60 * 1000;
let UNIT_PRICE = 15;
let PRICE_TABLE = {1:15,2:25,3:30,4:35,5:40,6:45,7:48,8:51,9:53,10:55,11:59,12:63,13:67,14:71,15:75,16:77,17:79,18:81,19:83,20:85,21:87,22:89,23:91,24:93,25:95,26:95,27:96,28:97,29:98,30:99,31:101,32:103,33:105,34:107,35:109,36:111,37:113,38:115,39:117,40:119,41:121,42:123,43:125,44:127,45:129,46:131,47:133,48:135,49:137,50:139};
let NORMAL_PRICE_TABLE = Object.fromEntries(Object.keys(PRICE_TABLE).map(qty => [qty, Number(qty) * UNIT_PRICE]));
let PRICE_TEXT_TABLE = {};
const DJGABO_APPS_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbwMsLDUtsuzPFqjUXC4N6dEWWlIK_cuI-xGsXDORHJKMHpfouCERmdM9W9GGpVmCOb2/exec";

/* CATÁLOGO RÁPIDO:
   El listado grande de canciones ahora se carga desde el JSON estático del hosting.
   Apps Script se mantiene para promociones, precios, clientes, pedidos y más pedidos. */
const CATALOG_STATIC_URL = "https://cdn.jsdelivr.net/gh/clubkaraoke/TIENDA_PISTAS_WEB@main/data/catalogo.min.json?v=20260811-1";
const SHEET_JSON_FULL = CATALOG_STATIC_URL;
const SHEET_JSON_TOPS = CATALOG_STATIC_URL;
const SHEET_JSON_GLOBAL = CATALOG_STATIC_URL;
const MAIN_TOP_SOURCE = CATALOG_STATIC_URL;
const FULL_JSON_SOURCES = [CATALOG_STATIC_URL];
const TOP_JSON_SOURCES = [CATALOG_STATIC_URL];
const INTROS_JSON_SOURCES =
["https://kitkaraoke.com/Listados/ListadoPistasFull+Top/INTROS_convertido.json"];
// Franja global “LOS MÁS PEDIDOS” y registro real de pedidos en Google Sheet.
const MOST_REQUESTED_JSON_URL = DJGABO_APPS_SCRIPT_URL +
"?tipo=mas_pedidos&limit=24&v=4";
const ORDER_LOG_URL = CLIENTES_API_URL;
const CEREBRO_ORDER_LOG_URL = DJGABO_APPS_SCRIPT_URL;
const PROMO_LINK_WEB = (() => {
try { return String(new URLSearchParams(window.location.search).get("p") || "").trim(); }
catch (e) { return ""; }
})();
function getPromoConfigUrl(segment = "PUBLICO"){
const params = new URLSearchParams({tipo:"promo_web",segmento:String(segment || "PUBLICO"),v:String(Date.now())});
if(PROMO_LINK_WEB) params.set("link_web", PROMO_LINK_WEB);
return DJGABO_APPS_SCRIPT_URL + "?" + params.toString();
}
function getClientModalConfigUrl(status){
const params = new URLSearchParams({tipo:"modal_clientes",estado:String(status || "NO_VALIDADO"),v:String(Date.now())});
return DJGABO_APPS_SCRIPT_URL + "?" + params.toString();
}
const CRM_ORDER_LOG_URL = CLIENTES_API_URL;
const ORDER_RETRY_QUEUE_KEY = "djgabo_order_retry_queue_v1";
function getCrmUrl(tipo, params = {}){
const query = new URLSearchParams(Object.assign({tipo:String(tipo || "ping"),v:String(Date.now())}, params || {}));
return CLIENTES_API_URL + "?" + query.toString();
}
function getClientHistoryUrl(phone, limit = 20){
return getCrmUrl("historial", {telefono:phone || "",limit:String(limit || 20)});
}
function getClientRegistrationUrl(phone, origin = "WEB_TIENDA"){
return getCrmUrl("validar", {telefono:phone || "",crear:"SI",origen:origin || "WEB_TIENDA"});
}
function getCampaignClaimValidationUrl(phone, promoCode){
return getCrmUrl("validar_reclamo_meta", {telefono:phone || "",codigoPromo:promoCode || "PROMO_META_1_GRATIS"});
}
function getCampaignClaimRegistrationUrl(data = {}){
return getCrmUrl("registrar_reclamo_meta", data || {});
}
/* PRECIOS_DESDE_SHEET_PRINCIPAL: 06_PRECIOS_WEB */
function getPricesConfigUrl(){return DJGABO_APPS_SCRIPT_URL + "?tipo=precios_web&segmento=PUBLICO&v=" + Date.now();}
const PROMO_CONFIG_URL = getPromoConfigUrl("PUBLICO");
const ORDER_STATS_KEY = "djgabo_order_stats_v1";
const CLIENT_ID_KEY = "djgabo_cliente_id_v1";
const INTRO_COVER = "https://i.imgur.com/q8bxumns.jpg";
const COVER_EXTS = ["jpg","png","webp","jpeg"];
const COVER_IDS = [
"tXk4ae3","7yQANwf","IG6Rs7H","r2VmDjq","zE1NH5N","GHSaMH5","XZ8EpiZ","7h5BmyP"
,"LYGUDqG","eo7mWDK",
"ha0gA4Z","zg82LoC","y7XgYQ6","psupsAX","NxpmNnE","KAc8fEa","pP1lVKW","A3lUxyI","f6ucSEx","j5Vhg3o",
"RL5kSNV","2p7PVjA","9FZjV6K","LqrNc9Q","7qN2CSJ","HIZa8oY","j476OpY","H6qeaND"," dzXYO7F","3y7Mhux",
"7QTPBYw","NLUOojd","chKWqUq","HvYj3rt","1DROg9S","Q4r8UM2","w2YCjeP","1kpH8Ov ","geZKE5q","q8kXhhT",
"T0Jw41w","Vb8qWa8","67SYUlz","DuKffUd","Pd8N7Dk","CXYXlc4","ym5ehRE","EYe0dTe",
"ITf8d94","rRkG0Zr",
"2PR40aL","3M69FOt","Epo8DQ3","HMyXeZV","joZRnEA","Pz02TBX","bXsAASk","mrPLFZm","menCIuc","MZe6n8p",
"F8aETPf","It8l72m","N3eQKHG","IYySEP4","dFY3Voe","V9DriaY","HaamdWM","nIjISku","E5jlzSq"
];
const state = {mode:"full",data:[],rows:[],globalData:null,globalDataComplete:false,query:"",shown:0,cart:[],selectedItem:null,returnPoint:null,sourceCache:new Map(),deezerCache:new Map(),worldTracks:[],previewAudio:null,menuItem:null,menuAnchor:null,newItems:[],mostRequestedItems:[],activeDemoKey:"",currentDemoItem:null,scrollLockY:0,demoProgressTimer:null,demoProgressStartedAt:0,demoProgressDuration:30000,demoProgressValue:0,clientVerified:false,clientAllowed:false,clientPhone:"",clientMessage:"",clientPistasGratis:2,clientMinimoCompra:2,clientLoading:false,webPromo:null,webPromoActive:false,webPromoSegment:"PUBLICO",webPromoTitle:"",webPromoText:"",webPromoSub:"",webPromoCode:"PROMO_WEB",webPromoGuideActive:false,webPromoGuideText:"",webPromoGuideButton:"",webPromoGuideShownThisSession:false,webPromoGuideDismissed:false,catalogTotalCount:0,catalogCounterAnimated:false,searchAutoScrollTimer:null,searchRelatedSuggestion:null,campaignPromo:null,campaignActive:false,campaignTitle:"",campaignText:"",campaignSub:"",campaignCode:"PROMO_CAMPANIA_1GRATIS",campaignButtonText:"ELEGIR GRATIS",campaignMaxFree:1,campaignClaimed:false,campaignPhone:"",buyMode:false,pendingOrder:null,cartPayment:"",wheelMode:"client",regularPromoOptIn:false,lastOrderType:"",lastOrderPayload:null,postOrderPromo:null};
const qInput = $("#q");
const catalogCounter = $("#catalogCounter");
const clearSearchBtn = $("#clearSearchBtn");
const countEl = $("#count");
const modeLabel = $("#modeLabel");
const listEl = $("#list");
const deezerWorldWrap = $("#deezerWorldWrap");
const deezerWorldList = $("#deezerWorldList");
const loadMoreBtn = $("#loadMore");
const statusBox = $("#statusBox");
const promoLaunchStrip = $("#promoLaunchStrip");
const newWrap = $("#newWrap");
const newRail = $("#newRail");
const mostRequestedWrap = $("#mostRequestedWrap");
const mostRequestedRail = $("#mostRequestedRail");
const mostRequestedSeeAll = $("#mostRequestedSeeAll");
const goSearchBtn = $("#goSearchBtn");
const floatCartBtn = $("#floatCartBtn");
const floatCartLabel = $("#floatCartLabel");
const mobileOrderBar = $("#mobileOrderBar");
const mobileOrderCount = $("#mobileOrderCount");
const searchSuggestions = $("#searchSuggestions");
const searchHelpRow = $("#searchHelpRow");
const clientAccessTopBtn = $("#clientAccessTopBtn");
const clientAccessBackdrop = $("#clientAccessBackdrop");
const clientAccessClose = $("#clientAccessClose");
const clientPhoneInput = $("#clientPhoneInput");
const clientVerifyBtn = $("#clientVerifyBtn");
const clientBenefitStatus = $("#clientBenefitStatus");
const clientBenefitActions = $("#clientBenefitActions");
const clientChangeBtn = $("#clientChangeBtn");
const clientBuyNowBtn = $("#clientBuyNowBtn");
const wheelEntryBtn = $("#wheelEntryBtn");
const wheelBackdrop = $("#wheelBackdrop");
const wheelModal = wheelBackdrop ? wheelBackdrop.querySelector(".wheel-modal") : null;
const wheelClose = $("#wheelClose");
const wheelBoard = $("#wheelBoard");
const wheelPhoneInput = $("#wheelPhoneInput");
const wheelSpinBtn = $("#wheelSpinBtn");
const wheelResult = $("#wheelResult");
const wheelTitle = $("#wheelTitle");
const wheelSub = $("#wheelSub");
const wheelTierText = $("#wheelTierText");
const wheelActions = $("#wheelActions");
const wheelAgainBtn = $("#wheelAgainBtn");
const wheelUseBtn = $("#wheelUseBtn");
const wheelGuideWrap = $("#wheelGuideWrap");

const cartBackdrop = $("#cartBackdrop");
const cartBadge = $("#cartBadge");
const heroCartBadge = $("#heroCartBadge");
const cartItemsEl = $("#cartItems");
const cartMoreNote = $("#cartMoreNote");
const toggleCartListBtn = $("#toggleCartListBtn");
const cartEmptyEl = $("#cartEmpty");
const priceCardEl = $("#priceCard");
const realPriceText = $("#realPriceText");
const discountText = $("#discountText");
const totalText = $("#totalText");
const savingText = $("#savingText");
const tariffNote = $("#tariffNote");
const paymentCartWrap = $("#paymentCartWrap");
const paymentSheetBackdrop = $("#paymentSheetBackdrop");
const paymentSheetClose = $("#paymentSheetClose");
const paymentSheetTotal = $("#paymentSheetTotal");
const paymentSheetContent = $("#paymentSheetContent");
const paymentSuccessPanel = $("#paymentSuccessPanel");
const paymentSuccessTitle = $("#paymentSuccessTitle");
const paymentSuccessText = $("#paymentSuccessText");
const paymentSuccessSummary = $("#paymentSuccessSummary");
const paymentSuccessOffer = $("#paymentSuccessOffer");
const paymentSuccessOfferTitle = $("#paymentSuccessOfferTitle");
const paymentSuccessOfferText = $("#paymentSuccessOfferText");
const paymentSuccessOfferBtn = $("#paymentSuccessOfferBtn");
const paymentSuccessPrimary = $("#paymentSuccessPrimary");
const paymentSuccessWhatsappBtn = $("#paymentSuccessWhatsappBtn");
const campaignPhoneSheetBackdrop = $("#campaignPhoneSheetBackdrop");
const campaignPhoneSheetClose = $("#campaignPhoneSheetClose");
const campaignPhoneSheetInput = $("#campaignPhoneSheetInput");
const campaignPhoneSheetError = $("#campaignPhoneSheetError");
const campaignPhoneConfirmBtn = $("#campaignPhoneConfirmBtn");
const campaignPhoneTrackTitle = $("#campaignPhoneTrackTitle");
const campaignPhoneTrackArtist = $("#campaignPhoneTrackArtist");
const campaignPhoneTags = $("#campaignPhoneTags");
const campaignChangeTrackBtn = $("#campaignChangeTrackBtn");
const campaignPhoneSheetSub = $("#campaignPhoneSheetSub");
const campaignNoPaymentText = $("#campaignNoPaymentText");
const campaignPhoneContent = $("#campaignPhoneContent");
const campaignSuccessPanel = $("#campaignSuccessPanel");
const campaignSuccessTitle = $("#campaignSuccessTitle");
const campaignSuccessText = $("#campaignSuccessText");
const campaignSuccessOffer = $("#campaignSuccessOffer");
const campaignSuccessOfferTitle = $("#campaignSuccessOfferTitle");
const campaignSuccessOfferText = $("#campaignSuccessOfferText");
const campaignSuccessOfferBtn = $("#campaignSuccessOfferBtn");
const campaignSuccessPrimary = $("#campaignSuccessPrimary");
const campaignSuccessWhatsappBtn = $("#campaignSuccessWhatsappBtn");
const orderPhoneSheetBackdrop = $("#orderPhoneSheetBackdrop");
const orderPhoneSheetClose = $("#orderPhoneSheetClose");
const orderPhoneSheetInput = $("#orderPhoneSheetInput");
const orderPhoneSheetError = $("#orderPhoneSheetError");
const orderPhoneSheetConfirm = $("#orderPhoneSheetConfirm");
const cartError = $("#cartError");
const sendOrderBtn = $("#sendOrderBtn");
const promoCartNote = $("#promoCartNote");
const cartCountPill = $("#cartCountPill");
const cartPriceDetailToggle = $("#cartPriceDetailToggle");
const cartPriceDetail = $("#cartPriceDetail");
const freeGuideBackdrop = $("#freeGuideBackdrop");
const freeGuideTitle = $("#freeGuideTitle");
const freeGuideText = $("#freeGuideText");
const freeGuideClose = $("#freeGuideClose");
const freeGuideGoBtn = $("#freeGuideGoBtn");
const freeDemoCoverImg = $("#freeDemoCoverImg");
const freeDemoTitle = $("#freeDemoTitle");
const freeDemoArtist = $("#freeDemoArtist");
const freePendingBackdrop = $("#freePendingBackdrop");
const freePendingTitle = $("#freePendingTitle");
const freePendingText = $("#freePendingText");
const freePendingChoose = $("#freePendingChoose");
const freePendingContinue = $("#freePendingContinue");
const songBackdrop = $("#songBackdrop");
const songModalCover = $("#songModalCover");
const songModalTitle = $("#songModalTitle");
const songModalArtist = $("#songModalArtist");
const songModalTags = $("#songModalTags");
const songVariantPicker = $("#songVariantPicker");
const songModalNote = $("#songModalNote");
const songPriceMain = $("#songPriceMain");
const songPriceSub = $("#songPriceSub");
const songVoiceBtn = $("#songVoiceBtn");
const songDemoBtn = $("#songDemoBtn");
const songInlinePlayer = $("#songInlinePlayer");
const songInlinePlayerTitle = $("#songInlinePlayerTitle");
const songLocalAudio = $("#songLocalAudio");
const songDrivePreview = $("#songDrivePreview");
const songInlineHelp = $("#songInlineHelp");
const songModalCoverPlayBtn = $("#songModalCoverPlayBtn");
const songModalHand = $("#songModalHand");
const songAddBtn = $("#songAddBtn");
const songFreeBtn = $("#songFreeBtn");
const songOrderActionRow = songAddBtn ? songAddBtn.closest(".song-order-actions") : null;
const bottomDemoPlayer = $("#bottomDemoPlayer");
const bottomDemoCover = $("#bottomDemoCover");
const bottomDemoTitle = $("#bottomDemoTitle");
const bottomDemoArtist = $("#bottomDemoArtist");
const bottomDemoAudio = $("#bottomDemoAudio");
const bottomDemoDrive = $("#bottomDemoDrive");
const driveWarmFrame = $("#driveWarmFrame");
const bottomDemoClose = $("#bottomDemoClose");
const demoPlayHint = $("#demoPlayHint");
const demoPlayHintTextA = $("#demoPlayHintTextA");
const demoPlayHintTextB = $("#demoPlayHintTextB");
const demoToast = $("#demoToast");
const songOptionsMenu = $("#songOptionsMenu");
const promoFreeMenuBtn = $("#promoFreeMenuBtn");
const nowPlayingBar = $("#nowPlayingBar");
const nowPlayingCover = $("#nowPlayingCover");
const nowPlayingTitle = $("#nowPlayingTitle");
const nowPlayingArtist = $("#nowPlayingArtist");
const nowPlayingMoreBtn = $("#nowPlayingMoreBtn");
const packagesBackdrop = $("#packagesBackdrop");
const allPackagesList = $("#allPackagesList");
const togglePackagesBtn = $("#togglePackagesBtn");
const requestBackdrop = $("#requestBackdrop");
const requestSongInput = $("#requestSongInput");
const requestLinkInput = $("#requestLinkInput");
const requestError = $("#requestError");
const requestSendBtn = $("#requestSendBtn");
const requestLinkHelp = $("#requestLinkHelp");
const directLoadingScreen = $("#directLoadingScreen");
const directLoadingTitle = $("#directLoadingTitle");
const directLoadingText = $("#directLoadingText");
const JSON_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const SEARCH_GLOBAL_MIN_CHARS = 2;
