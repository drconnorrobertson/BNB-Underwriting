'use strict';
const AMEN={
  essentials:[
    {id:'wifi',   label:'WiFi + Smart Hub',      impact:'+2%', cost:400,  tier:'good',always:true},
    {id:'kitchen',label:'Full Kitchen Setup',     impact:'Req.',cost:2500, tier:'good',always:true},
    {id:'washer', label:'Washer + Dryer',         impact:'+3%', cost:1800, tier:'good',always:true},
    {id:'ac',     label:'Air Conditioning',       impact:'+5%', cost:0,    tier:'good',always:true},
    {id:'parking',label:'Free Parking',           impact:'+5%', cost:0,    tier:'good',always:true},
    {id:'tvs',    label:'Smart TVs (all rooms)',  impact:'+2%', cost:1200, tier:'good',always:true},
    {id:'coffee', label:'Premium Coffee Station', impact:'+3%', cost:600,  tier:'good',always:true},
    {id:'linens', label:'Linen + Towel Package',  impact:'+1%', cost:800,  tier:'good',always:true},
  ],
  mid:[
    {id:'hot_tub',   label:'Hot Tub',             impact:'+18%',cost:9500, tier:'better',rec:['Mountain','Ski','Cabin','Lakefront','Pocono','Deep Creek Lake','Tennessee','Georgia']},
    {id:'fire_pit',  label:'Fire Pit + Seating',  impact:'+10%',cost:2800, tier:'better',rec:['Mountain','Ski','Cabin','Oklahoma','Pocono','Tennessee','Georgia']},
    {id:'patio',     label:'Patio / Outdoor Space',impact:'+8%', cost:4500, tier:'better',rec:['Beach','Florida','Desert','Alabama','South Carolina']},
    {id:'game_room', label:'Game Room + Console', impact:'+7%', cost:3500, tier:'better'},
    {id:'bbq',       label:'BBQ / Outdoor Kitchen',impact:'+6%',cost:2200, tier:'better',rec:['Beach','Florida','Texas','Alabama']},
    {id:'workspace', label:'Dedicated Workspace', impact:'+4%', cost:1800, tier:'better',rec:['Austin Metro','Dallas','Texas','Urban']},
    {id:'kayak',     label:'Kayak / Canoe (2×)',  impact:'+9%', cost:2400, tier:'better',rec:['Lakefront','Deep Creek Lake','Beach','Lake']},
    {id:'arcade',    label:'Arcade Games',         impact:'+8%', cost:5000, tier:'better'},
    {id:'outdoor_furn',label:'Premium Outdoor Set',impact:'+5%',cost:3200, tier:'better',rec:['Beach','Florida','Desert','Alabama']},
  ],
  premium:[
    {id:'pool',       label:'Pool',                impact:'+22%',cost:45000,tier:'best',rec:['Beach','Florida','Desert','Texas','Alabama','South Carolina']},
    {id:'ev_charger', label:'EV Charger (L2)',     impact:'+8%', cost:2800, tier:'best',rec:['Austin Metro','Dallas','Texas','Nevada','Colorado']},
    {id:'gym',        label:'Home Gym Setup',      impact:'+10%',cost:8500, tier:'best'},
    {id:'sauna',      label:'Sauna (barrel)',      impact:'+15%',cost:12000,tier:'best',rec:['Mountain','Ski','Lakefront','Pocono','Deep Creek Lake','Colorado','Tennessee','Georgia']},
    {id:'beach_gear', label:'Beach/Lake Gear Kit', impact:'+25%',cost:3500, tier:'best',rec:['Beach','Florida','Lakefront','Deep Creek Lake','Lake','Alabama','South Carolina']},
    {id:'boat_dock',  label:'Boat Dock',           impact:'+20%',cost:22000,tier:'best',rec:['Deep Creek Lake','Lakefront','Lake']},
    {id:'ski_storage',label:'Ski Storage+Dryers',  impact:'+20%',cost:3500, tier:'best',rec:['Mountain','Ski','Colorado','Nevada']},
    {id:'theater',    label:'Theater Room',        impact:'+12%',cost:15000,tier:'best'},
    {id:'pickleball', label:'Pickleball Court',    impact:'+10%',cost:8000, tier:'best',rec:['Florida','Arizona','Alabama','South Carolina']},
    {id:'putting',    label:'Putting Green',       impact:'+8%', cost:8000, tier:'best',rec:['Arizona','Texas','Florida']},
  ]
};

let AS={}, CA=[];
function initAmen(tags){
  AS={}; allA().forEach(a=>{AS[a.id]=false;});
  AMEN.essentials.forEach(a=>{AS[a.id]=true;});
  if(tags) [...AMEN.mid,...AMEN.premium].forEach(a=>{if(a.rec?.some(r=>tags.includes(r))) AS[a.id]=true;});
}
function allA(){ return [...AMEN.essentials,...AMEN.mid,...AMEN.premium,...CA]; }
function getIds(tier){
  const all=allA();
  if(tier==='good') return AMEN.essentials.map(a=>a.id);
  if(tier==='better') return all.filter(a=>(a.tier==='good'||a.tier==='better')&&AS[a.id]).map(a=>a.id);
  return all.filter(a=>AS[a.id]).map(a=>a.id);
}
function getAmenCost(){ return allA().filter(a=>AS[a.id]&&!a.always).reduce((s,a)=>s+(a.cost||0),0); }
function togA(id){
  if(AMEN.essentials.find(a=>a.id===id)?.always) return;
  AS[id]=!AS[id];
  const el=document.getElementById(`at_${id}`); if(el) el.classList.toggle('on',AS[id]);
  const et=G('enhTotal'); if(et) et.textContent=fm(getAmenCost());
}
function addCA(){
  const name=G('caName')?.value.trim(),cost=parseInt(G('caCost')?.value)||0,tier=G('caTier')?.value||'best',impact=G('caImpact')?.value||'+10%';
  if(!name) return; const id='c_'+Date.now();
  CA.push({id,label:name,impact,cost,tier}); AS[id]=true;
  if(G('caName')) G('caName').value='';
  renderAG([...AMEN.premium,...CA],'agPremium',false);
  const et=G('enhTotal'); if(et) et.textContent=fm(getAmenCost());
}
function renderAG(defs,cid,locked){
  const el=G(cid); if(!el) return;
  el.innerHTML=defs.map(a=>`<div class="amen-item${AS[a.id]?' on':''}${locked?' locked':''}" id="at_${a.id}" ${locked?'':` onclick="togA('${a.id}')"`}>
    <div class="a-chk"></div>
    <div class="a-nm">${a.label}${a.rec?'<span class="a-rec"> rec</span>':''}</div>
    <div class="a-cost">${a.cost?fm(a.cost):'—'} · ${a.impact}</div>
  </div>`).join('');
}
function renderAllA(){
  renderAG(AMEN.essentials,'agEssentials',true);
  renderAG(AMEN.mid,'agMid',false);
  renderAG([...AMEN.premium,...CA],'agPremium',false);
  const et=G('enhTotal'); if(et) et.textContent=fm(getAmenCost());
}
