// Tema «minecraft» · renderizador 3D (skinview3d + three.js incluido en el bundle).
//
// Código extraído y adaptado de SkinLibre Clips (mundos de bloques, cielos, animaciones, objetos en mano, rejilla de
// texturas): sin grabación, editor, plantillas ni marca de agua. Es el ÚNICO archivo que sabe de Minecraft; el motor
// (taps-engine.js) solo habla con la interfaz que devuelve createRenderer(). Para otro videojuego se escribe otro
// archivo con esa misma interfaz (ver ../../README.md). Texturas: Pixel Perfection / Minetest Game (CC BY-SA, ver
// textures/LICENSE.txt y textures-pp/LICENSE.txt). Sonidos: Minetest Game.
//
// Interfaz que devuelve createRenderer(opts):
//   setSize(w, h)            cambia la resolución interna
//   setScene({world,host,item,props,shot,enter,plano,hora,clima,fauna})  mundo (clave de WORLDS), personaje (clave de
//                            theme.characters), objeto en la mano, decorado, encuadre, entrada y modo cine (plano de cámara,
//                            hora del día, clima y animales de fondo)
//   plano(n, seed)           pequeño cambio de plano entre preguntas (la cámara viaja hasta la variante)
//   play(anim)               'idle' | 'talk' | 'think' | 'celebrate' | 'hurt' | 'scared' | 'sad' | 'dance' | 'wave' | 'jump'
//   frame(dt, t)             avanza la animación y dibuja en el canvas 2D de salida (ctx) con ambiente incluido
//   anchor(name)             posición en píxeles ('head' | 'top' | 'feet') para burbujas y partículas
//   dispose()
export async function createRenderer(opts) {
const { canvas: out, width, height, theme, resolve, skinview3d } = opts;
let W = width, H = height;
const VW = 1080, VH = 1920;                       // coordenadas virtuales del ambiente (partículas del fondo)
const FEET = -16;
const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x, easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const oc = out.getContext('2d');
const glc = document.createElement('canvas');
const viewer = new skinview3d.SkinViewer({ canvas: glc, width: W, height: H, pixelRatio: 1, renderPaused: true,
  preserveDrawingBuffer: false, enableControls: false, fov: 40 });
viewer.playerObject.visible = false;
const bg0 = document.createElement('canvas'); bg0.width = bg0.height = 2; viewer.loadBackground(bg0);
const L0 = { g: viewer.globalLight.intensity, c: viewer.cameraLight.intensity },
  V3 = viewer.camera.position.constructor, Group = viewer.playerWrapper.constructor, Tex = viewer.scene.background.constructor;
// ===== extracted: grade pass =====
// ---------- colour grade on the GPU: a touch brighter, warmer and more vivid (tuned per scene) ----------
const GradePass=viewer.fxaaPass.constructor;
const gradeFX=new GradePass({uniforms:{tDiffuse:{value:null},exposure:{value:1.08},sat:{value:1.2},con:{value:1.06},warm:{value:1},vig:{value:.45}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:'uniform sampler2D tDiffuse;uniform float exposure,sat,con,warm,vig;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 col=c.rgb*exposure;float l=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(l),col,sat);col=(col-.5)*con+.5;col+=vec3(.035,.014,-.022)*warm;vec2 d=vUv-.5;col*=1.0-vig*dot(d,d);gl_FragColor=vec4(clamp(col,0.0,1.0),c.a);}'});
viewer.composer.insertPass(gradeFX,1);
const GRADE={noche:[1.02,1.1,1.05,-1.2,.6],halloween:[1.05,1.18,1.07,.5,.62],cueva:[1.1,1.15,1.05,.8,.6],end:[1.02,1.15,1.06,-.8,.55],nether:[1.04,1.12,1.06,.6,.5],estudio:[1.02,1.1,1.05,0,.5]};
function setGrade(k){const g=GRADE[k]||[1.03,1.15,1.06,1,.45],u=gradeFX.uniforms;u.exposure.value=g[0];u.sat.value=g[1];u.con.value=g[2];u.warm.value=g[3];u.vig.value=g[4]}
// ===== extracted: procedural tiles =====
const T=64;
function tile(fn){const c=document.createElement('canvas');c.width=c.height=T;const x=c.getContext('2d');for(let j=0;j<16;j++)for(let i=0;i<16;i++){const[r,g,b]=fn(i,j,rnd(i*31+j*97));x.fillStyle=`rgb(${r|0},${g|0},${b|0})`;x.fillRect(i*4,j*4,4,4)}return c}
const shade=([r,g,b],k)=>[r*k,g*k,b*k],tex={};
function makeTiles(){
 tex.grass=tile((i,j,r)=>{const edge=3+(rnd(i*7)*3|0);return j<edge?shade([93,168,58],.82+r*.3):j===edge&&r>.5?shade([74,140,46],.9):shade([134,90,54],.78+r*.35)});
 tex.dirt=tile((i,j,r)=>shade([134,90,54],.78+r*.35));
 tex.leaves=tile((i,j,r)=>r>.85?[40,80,30]:shade([62,138,42],.7+r*.4));
 tex.log=tile((i,j,r)=>shade(i%4===0?[80,60,36]:[107,81,50],.85+r*.25));
 tex.sand=tile((i,j,r)=>shade([227,211,155],.9+r*.15));
 tex.nether=tile((i,j,r)=>r>.8?[150,50,45]:shade([110,40,40],.75+r*.35));
 tex.end=tile((i,j,r)=>r>.86?[190,190,130]:shade([226,226,168],.9+r*.12));
 tex.obsidian=tile((i,j,r)=>r>.9?[70,40,110]:shade([22,16,34],.8+r*.5));
 tex.floor=tile((i,j,r)=>i===0||j===0?[52,62,44]:shade([30,36,26],.9+r*.2));
 tex.stone=tile((i,j,r)=>shade([125,125,125],.8+r*.3));
 tex.snow=tile((i,j,r)=>j<4?shade([240,248,255],.95+r*.05):shade([134,90,54],.78+r*.35));
 tex.plank=tile((i,j,r)=>j%4===0?[110,80,44]:shade([168,128,78],.88+r*.18));
}
function glow(c,x,y,r,col){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}
function sq(c,x,y,s,col,a){c.globalAlpha=a;c.fillStyle=col;c.fillRect(Math.round(x-s/2),Math.round(y-s/2),s,s);c.globalAlpha=1}
const bits=Array.from({length:40},(_,i)=>({x:rnd(i+50)*VW,y:rnd(i+80)*VH,s:8+rnd(i+20)*10|0,v:.5+rnd(i+40),p:rnd(i+70)*6}));
// ===== extracted: animations =====
// ---------- animations (skinview3d built-ins + our own) ----------
const A=skinview3d,PI=Math.PI,fn=f=>new A.FunctionAnimation(f);
const ANIMS={
 idle:['Quieto',()=>new A.IdleAnimation()],
 talk:['Hablar',()=>fn((p,t)=>{const s=p.skin;s.head.rotation.x=.07*Math.sin(t*9);s.head.rotation.y=.14*Math.sin(t*2.1);s.rightArm.rotation.x=-.55-.3*Math.sin(t*4.2);s.rightArm.rotation.z=-.12;s.leftArm.rotation.x=.06*Math.sin(t*1.6);s.leftArm.rotation.z=.05})],
 wave:['Saludar',()=>{const a=new A.WaveAnimation('left');a.speed=1.3;return a}],
 point:['Señalar',()=>fn((p,t)=>{const s=p.skin;s.rightArm.rotation.x=-1.5+.06*Math.sin(t*5);s.head.rotation.x=-.05;s.leftArm.rotation.z=.08})],
 dance:['Bailar',()=>fn((p,t)=>{const s=p.skin,b=t*PI*2*1.1,k=Math.sin(b),u=Math.abs(Math.sin(b));p.position.y=u*1.8;p.rotation.z=.06*k;p.rotation.y=.35*Math.sin(b/2);
  s.rightArm.rotation.x=-.3-2.4*Math.max(0,k);s.leftArm.rotation.x=-.3-2.4*Math.max(0,-k);s.rightArm.rotation.z=-.25;s.leftArm.rotation.z=.25;s.rightLeg.rotation.x=.4*k;s.leftLeg.rotation.x=-.4*k;s.head.rotation.z=.14*k;s.head.rotation.x=.12*u})],
 celebrate:['Celebrar',()=>fn((p,t)=>{const s=p.skin,k=Math.sin(t*PI*2*1.4);p.position.y=Math.max(0,k)*1.4;s.rightArm.rotation.z=-2.7+.3*k;s.leftArm.rotation.z=2.7+.3*k;s.head.rotation.x=-.25;s.rightLeg.rotation.z=-.08;s.leftLeg.rotation.z=.08})],
 jump:['Saltar',()=>fn((p,t)=>{const s=p.skin,ph=(t*1.05)%1,air=ph<.6?Math.sin(ph/.6*PI):0,land=ph>=.6&&ph<.75?Math.sin((ph-.6)/.15*PI):0;p.position.y=air*11-land*1.2;
  s.rightArm.rotation.z=-air*2.4;s.leftArm.rotation.z=air*2.4;s.rightLeg.rotation.x=-air*.35;s.leftLeg.rotation.x=air*.35;s.head.rotation.x=-air*.2+land*.2})],
 shift:['Spam de shift',()=>{const a=new A.CrouchAnimation();a.speed=2.2;return a}],
 walk:['Caminar',()=>new A.WalkingAnimation()],
 run:['Correr',()=>{const a=new A.RunningAnimation();a.speed=.9;return a}],
 hit:['Pelear',()=>fn((p,t)=>{const s=p.skin,ph=(t*1.1)%1;let ax;
  if(ph<.3)ax=-.35-2.35*easeOut(ph/.3);else if(ph<.42)ax=-2.7+2.95*((ph-.3)/.12);else ax=.25-.6*((ph-.42)/.58);
  s.rightArm.rotation.x=ax;s.rightArm.rotation.z=-.12;s.leftArm.rotation.x=-.5;s.leftArm.rotation.z=.15;s.rightLeg.rotation.x=.35;s.leftLeg.rotation.x=-.35;s.head.rotation.x=.12;p.position.y=ph>.3&&ph<.45?.6:0})],
 defeated:['Derrotado',()=>fn((p,t)=>{const k=easeOut(Math.min(1,t/.6));p.rotation.x=-k*1.45;p.position.y=-k*13;p.position.z=-k*7;const s=p.skin;s.rightArm.rotation.x=-.2*k;s.leftArm.rotation.x=-.2*k})],
 sad:['Triste',()=>fn((p,t)=>{const s=p.skin;s.head.rotation.x=.6;s.rightArm.rotation.z=-.03;s.leftArm.rotation.z=.03;s.rightArm.rotation.x=.12;s.leftArm.rotation.x=.12;p.position.y=-.2+.15*Math.sin(t*1.3)})],
 scared:['Asustado',()=>fn((p,t)=>{const s=p.skin,j=Math.sin(t*40)*.03;p.position.x=Math.sin(t*38)*.25;s.rightArm.rotation.x=-1.5+j;s.leftArm.rotation.x=-1.5-j;s.rightArm.rotation.z=.35;s.leftArm.rotation.z=-.35;s.head.rotation.x=-.15})]
};

// ===== extracted: items =====
// ---------- held items: 16x16 textures from Minetest Game (CC BY-SA 3.0, see vendor/texturas/LICENSE.txt),
// extruded into voxels at runtime and held in the right hand ----------
const SKIN=viewer.playerObject.skin,MeshC=SKIN.head.innerLayer.constructor,BoxG=SKIN.head.innerLayer.geometry.constructor,BufG=Object.getPrototypeOf(BoxG),Attr=SKIN.head.innerLayer.geometry.attributes.position.constructor,MatC=SKIN.layer1Material.constructor;
const TEXDIR=resolve('textures/'),ITEM_TEX={sword:'default_tool_diamondsword',pick:'default_tool_diamondpick',axe:'default_tool_diamondaxe',torch:'default_torch_on_floor',diamond:'default_diamond',apple:'default_apple'};
const BLOCK_TEX={grass:{side:['default_dirt','default_grass_side'],top:['default_grass'],bottom:['default_dirt']},tnt:{side:['tnt_side'],top:['tnt_top'],bottom:['tnt_bottom']}};
// How each item sits in the fist: tools are gripped near the end of the handle and tilted so the head points up.
// s = size of one texture pixel in world units, so every item has its real proportion next to the hand (4 wide) and head (8).
const HOLD_STYLE={sword:{grip:'handle',tilt:.5,s:.68},pick:{grip:'handle',tilt:.4,s:.62},axe:{grip:'handle',tilt:.4,s:.62},torch:{grip:'stick',tilt:0,s:.75},diamond:{grip:'center',tilt:0,s:.42},apple:{grip:'center',tilt:0,s:.45}};
const HOLD=new Set(['idle','talk','sad','shift','scared','walk']),ITEMS={'':'Nada',sword:'Espada',pick:'Pico',axe:'Hacha',torch:'Antorcha',diamond:'Diamante',apple:'Manzana',grass:'Bloque de pasto',tnt:'TNT'};
const texImg={};
const ensureItem=async key=>{const names=ITEM_TEX[key]?[ITEM_TEX[key]]:Object.values(BLOCK_TEX[key]||{}).flat();await Promise.all(names.filter(n=>!texImg[n]).map(n=>loadImg(TEXDIR+n+'.png').then(i=>texImg[n]=i).catch(()=>{})))};
function texPixels(name){const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.drawImage(texImg[name],0,0,16,16);return x.getImageData(0,0,16,16).data}
function layered(names){const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.imageSmoothingEnabled=false;names.forEach(n=>texImg[n]&&x.drawImage(texImg[n],0,0,16,16));return c}
const FACES=[[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]],[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],[[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]]];
function gripOf(d,style){const px=[];for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(d[(y*16+x)*4+3]>40)px.push([x,y]);if(!px.length)return[8,8];
 if(style==='handle'){const[e]=px.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));return[e[0]+2,e[1]-2]}
 if(style==='stick'){const[e]=px.sort((a,b)=>b[1]-a[1]);return[e[0],e[1]-3]}
 const xs=px.map(p=>p[0]),ys=px.map(p=>p[1]);return[(Math.min(...xs)+Math.max(...xs))/2,Math.max(...ys)-2]}
const itemCache={};
function itemMesh(key){if(itemCache[key])return itemCache[key];let mesh;
 if(BLOCK_TEX[key]){const b=BLOCK_TEX[key],m=c=>{const t=new Tex(c);t.magFilter=t.minFilter=1003;t.generateMipmaps=false;t.needsUpdate=true;return new MatC({map:t})};
  const S=m(layered(b.side)),Tp=m(layered(b.top)),B=m(layered(b.bottom));mesh=new MeshC(new BoxG(4.2,4.2,4.2),[S,S,Tp,B,S,S]);mesh.position.set(0,-.3,2.6)}
 else{const d=texPixels(ITEM_TEX[key]),[gx,gy]=gripOf(d,HOLD_STYLE[key].grip),sz=HOLD_STYLE[key].s||.7,pos=[],nor=[],col=[],on=(x,y)=>x>=0&&x<16&&y>=0&&y<16&&d[(y*16+x)*4+3]>40;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){if(!on(x,y))continue;const o=(y*16+x)*4,c=[d[o],d[o+1],d[o+2]].map(v=>v/255),X=(x-gx)*sz,Y=(gy-y)*sz,Z=-sz/2;
   FACES.forEach(([n,q])=>{if(n[0]&&on(x+n[0],y)||n[1]&&on(x,y-n[1]))return;const sh=n[2]?1:n[1]>0?.9:.7,v=q.map(([u,w,t])=>[X+u*sz,Y+w*sz,Z+t*sz]);
    for(const i of [0,1,2,0,2,3]){pos.push(...v[i]);nor.push(...n);col.push(c[0]*sh,c[1]*sh,c[2]*sh)}})}
  const g=new BufG();g.setAttribute('position',new Attr(new Float32Array(pos),3));g.setAttribute('normal',new Attr(new Float32Array(nor),3));g.setAttribute('color',new Attr(new Float32Array(col),3));
  mesh=new MeshC(g,new MatC({vertexColors:true}))}
 return itemCache[key]=mesh}
// Held like in the game: the fist closes on the grip; the sprite is mirrored so the head points up and away from the body.
function setItem(p,key){if(p.itemKey===key)return;if(p.item){p.player.skin.rightArm.remove(p.item);p.item=null}p.itemKey=key;if(!key||!ITEMS[key])return;
 const g=new Group(),inner=new Group(),m=itemMesh(key).clone();inner.add(m);g.add(inner);const block=!!BLOCK_TEX[key];g.position.set(-1,-10.2,block?.4:.3);
 if(!block){inner.rotation.y=Math.PI;inner.rotation.z=HOLD_STYLE[key].tilt}g.userData.block=block;p.item=g;p.player.skin.rightArm.add(g)}

// ===== personaje (un anfitrión; la skin sale de theme.characters) =====
function skinCanvas(img){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 if(img.width===64&&img.height===32){x.drawImage(img,0,0);x.drawImage(c,0,16,16,16,16,48,16,16);x.drawImage(c,40,16,16,16,32,48,16,16)}else x.drawImage(img,0,0,64,64);return c}
function isSlim(c){const d=c.getContext('2d').getImageData(54,20,2,12).data;for(let i=3;i<d.length;i+=4)if(d[i]>0)return false;return true}
const host=(()=>{const wrap=new Group(),player=new A.PlayerObject();player.backEquipment=null;player.ears.visible=false;wrap.add(player);
 const shadow=new MeshC(new BoxG(10,.2,6),new MatC({color:0x000000,transparent:true,opacity:.3,depthWrite:false}));shadow.position.y=FEET+.15;wrap.add(shadow);
 viewer.playerWrapper.add(wrap);return{wrap,player,shadow,tex:null,anim:null,animKey:'',item:null,itemKey:null,hurt:0,slim:false}})();
const skinCache={};
async function loadSkin(key){const chars=theme.characters||{},ch=chars[key]||Object.values(chars)[0];if(!ch)return null;
 const src=resolve(ch.skin);if(!skinCache[src]){const img=await loadImg(src);const cv=skinCanvas(img);skinCache[src]={src,canvas:cv,slim:typeof ch.slim==='boolean'?ch.slim:isSlim(cv)}}return skinCache[src]}
async function useSkin(key){const c=await loadSkin(key);if(!c)return;
 if(host.skinSrc===c.src)return;host.skinSrc=c.src;if(host.tex)host.tex.dispose();const t=new Tex(c.canvas);t.magFilter=t.minFilter=1003;t.generateMipmaps=false;t.needsUpdate=true;
 host.tex=t;host.player.skin.map=t;host.player.skin.modelType=c.slim?'slim':'default';host.slim=c.slim;if(host.item&&host.item.children[0])host.item.position.x=c.slim?-.5:-1}
function tint(p,red){if(p.tint===red)return;p.tint=red;const sk=p.player.skin;['layer1Material','layer1MaterialBiased','layer2Material','layer2MaterialBiased'].forEach(k=>sk[k]?.color.setRGB(1,red?.42:1,red?.42:1))}

// ===== extracted: world =====
// ---------- 3D world: block ground, hills, props, sky dome and fog per scene ----------
// Blocks are 16 units (a player is two blocks tall); the ground top sits at the players' feet.
const BK=16,GY=FEET,ColC=viewer.globalLight.color.constructor;
const easeIO=x=>{x=clamp(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2};
const TILE_ORDER=['grassTop','grass','dirt','stone','sand','nether','end','obsidian','plank','snowTop','snow','log','leaves','floor','lava','water','glass','glow','crystal','spruce','oreD','oreG','path','cactus','sandstone','bookshelf','chestF','chestS','chestT','furnF','furnS','furnT','brick','jungle','aspen','woolR','woolW','pumpS','pumpF','pumpT','cobble','craftT','craftS','tntS','tntT','pistS','pistT','lampOn'];
let ATL=null;
// Block textures: Pixel Perfection (XSSheep / Nova Wostra, CC BY-SA 4.0, via Mineclonia) in vendor/texturas-pp,
// a few from Minetest Game (CC BY-SA 3.0). "name*#hex" tints a greyscale texture (grass and leaves get their biome green).
const BLOCK_MT={grassTop:['pp:mcl_core_grass_block_top*#8cc056'],grass:['pp:default_dirt','pp:mcl_core_grass_block_side_overlay*#8cc056'],dirt:['pp:default_dirt'],stone:['pp:default_stone'],sand:['pp:default_sand'],
 plank:['pp:default_wood'],log:['pp:default_tree'],leaves:['#3f7424','pp:default_leaves*#72b53c'],spruce:['#2d4f31','pp:mcl_core_leaves_spruce*#619e61'],snowTop:['pp:default_snow'],snow:['pp:mcl_core_grass_side_snowed'],
 water:['pp:default_water_source_animated*#bcd6ff'],lava:['pp:default_lava_source_animated'],obsidian:['pp:default_obsidian'],glass:['#c4e6f8','pp:default_glass'],glow:['pp:mcl_nether_glowstone'],
 oreD:['pp:mcl_core_diamond_ore'],oreG:['pp:mcl_core_gold_ore'],path:['pp:mcl_core_grass_path_top'],cactus:['pp:mcl_core_cactus_side'],sandstone:['pp:mcl_core_sandstone_normal'],nether:['pp:mcl_nether_netherrack'],end:['pp:mcl_end_end_stone'],
 bookshelf:['default_bookshelf'],chestF:['default_chest_front'],chestS:['default_chest_side'],chestT:['default_chest_top'],furnF:['default_furnace_front'],furnS:['default_furnace_side'],furnT:['default_furnace_top'],
 brick:['pp:default_stone_brick'],jungle:['pp:mcl_core_planks_spruce'],aspen:['pp:default_wood'],woolR:['pp:wool_red'],woolW:['pp:wool_white'],cobble:['pp:default_cobble']};
const texUrl=n=>n.startsWith('pp:')?resolve('textures-pp/')+n.slice(3)+'.png':TEXDIR+n+'.png',texKey=l=>l.split('*')[0];
// Las texturas de bloques se piden SOLO para el mundo que se va a mostrar (no las 40 de golpe).
const tilesOf=m=>{const ks=new Set();for(const t of m.values())BT[t].t.forEach(k=>ks.add(k));return ks};
async function ensureBlockTextures(m){const ks=tilesOf(m),need=new Set();ks.forEach(k=>(BLOCK_MT[k]||[]).filter(n=>!n.startsWith('#')).map(texKey).forEach(n=>{if(!texImg[n])need.add(n)}));
 await Promise.all([...need].map(n=>loadImg(texUrl(n)).then(i=>texImg[n]=i).catch(()=>{})));if(ATL)paintAtlas(ks)}
function mtTile(layers){if(!layers.every(n=>n.startsWith('#')||texImg[texKey(n)]))return null;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 layers.forEach(n=>{if(n.startsWith('#')){x.fillStyle=n;x.fillRect(0,0,64,64);return}const [k,tint]=n.split('*'),img=texImg[k],t=document.createElement('canvas');t.width=t.height=64;const y=t.getContext('2d');y.imageSmoothingEnabled=false;
  y.drawImage(img,0,0,16,16,0,0,64,64);if(tint){y.globalCompositeOperation='multiply';y.fillStyle=tint;y.fillRect(0,0,64,64);y.globalCompositeOperation='destination-in';y.drawImage(img,0,0,16,16,0,0,64,64)}x.drawImage(t,0,0)});return c}
let atlasCanvas=null;
function paintAtlas(keys){const x=atlasCanvas.getContext('2d');x.imageSmoothingEnabled=false;TILE_ORDER.forEach((k,n)=>{if(!keys.has(k))return;const t=(BLOCK_MT[k]&&mtTile(BLOCK_MT[k]))||tex[k];if(t)x.drawImage(t,(n%8)*64,Math.floor(n/8)*64);else{x.fillStyle='#777';x.fillRect((n%8)*64,Math.floor(n/8)*64,64,64)}});if(ATL)ATL.needsUpdate=true}
function atlasTex(){if(ATL)return ATL;makeTiles();
 tex.grassTop=tile((i,j,q)=>shade([93,168,58],.8+q*.32));tex.snowTop=tile((i,j,q)=>shade([240,248,255],.93+q*.07));
 tex.lava=tile((i,j,q)=>{const w=Math.sin(i*.9+j*.5)*.5+.5;return[255,120+w*110*q,20+40*q]});tex.water=tile((i,j,q)=>shade([48,110,200],.85+q*.2));
 tex.glass=tile((i,j)=>i===0||j===0||i===15||j===15?[210,235,245]:[165,215,245]);tex.glow=tile((i,j,q)=>shade([255,214,90],.9+q*.1));
 tex.crystal=tile((i,j,q)=>shade([255,150,235],.85+q*.15));
 tex.oreD=tile((i,j,q)=>q>.82?[80,230,220]:shade([125,125,125],.8+q*.3));tex.oreG=tile((i,j,q)=>q>.84?[250,205,60]:shade([125,125,125],.8+q*.3));tex.path=tile((i,j,q)=>shade([150,118,70],.8+q*.3));tex.cactus=tile((i,j,q)=>i%4===0?[40,90,30]:shade([80,150,50],.85+q*.2));tex.sandstone=tile((i,j,q)=>j%5===0?[200,178,120]:shade([226,205,150],.92+q*.1));tex.spruce=tile((i,j,q)=>q>.85?[20,50,30]:shade([40,90,55],.7+q*.4));
  // Pumpkins: our own pixel design (ribbed orange, carved face lit from inside).
  const pumpC=(i,q)=>i%5===0?[176,82,10]:shade([232,128,28],.86+q*.2);tex.pumpS=tile((i,j,q)=>pumpC(i,q));tex.pumpT=tile((i,j,q)=>i>=7&&i<=8&&j>=6&&j<=9?[86,60,24]:pumpC(i+j%2,q));
  const FACE=['................','................','...##......##...','..####....####..','..####....####..','................','.......##.......','......####......','................','..############..','..#..######..#..','...##########...','....#..##..#....','................','................','................'];
  tex.pumpF=tile((i,j,q)=>FACE[j][i]==='#'?(j>8?[255,214,80]:[255,232,120]):pumpC(i,q));
  // Bloques de los decorados (taller, circuito): diseño propio en píxeles, sin texturas nuevas.
  tex.craftT=tile((i,j,q)=>i===0||j===0||i===15||j===15?[90,60,30]:i%5===0||j%5===0?[110,80,44]:shade([168,128,78],.88+q*.18));
  tex.craftS=tile((i,j,q)=>j<3?shade([168,128,78],.9+q*.1):i>3&&i<12&&j>5&&j<12?(q>.5?[150,150,150]:[90,60,30]):shade([140,100,60],.85+q*.2));
  tex.tntS=tile((i,j,q)=>j>=6&&j<=9?((j===7||j===8)&&i>2&&i<13&&i%4!==0?[20,20,20]:[235,235,235]):shade([200,50,40],.85+q*.2));
  tex.tntT=tile((i,j,q)=>Math.hypot(i-7.5,j-7.5)<3?[40,40,40]:shade([200,50,40],.85+q*.2));
  tex.pistS=tile((i,j,q)=>j<4?shade([168,128,78],.9+q*.1):shade([125,125,125],.8+q*.3));tex.pistT=tile((i,j,q)=>shade([168,128,78],.88+q*.18));
  tex.lampOn=tile((i,j,q)=>i%5===0||j%5===0?[140,70,20]:shade([255,190,80],.9+q*.15));
  atlasCanvas=document.createElement('canvas');atlasCanvas.width=512;atlasCanvas.height=512;paintAtlas(new Set(TILE_ORDER));
 const t=new Tex(atlasCanvas);t.magFilter=t.minFilter=1003;t.generateMipmaps=false;t.needsUpdate=true;return ATL=t}
const BT={grass:{t:['grassTop','grass','dirt'],g:'solid'},dirt:{t:['dirt','dirt','dirt'],g:'solid'},stone:{t:['stone','stone','stone'],g:'solid'},sand:{t:['sand','sand','sand'],g:'solid'},
 nether:{t:['nether','nether','nether'],g:'solid'},end:{t:['end','end','end'],g:'solid'},obsidian:{t:['obsidian','obsidian','obsidian'],g:'solid'},plank:{t:['plank','plank','plank'],g:'solid'},
 snow:{t:['snowTop','snow','dirt'],g:'solid'},snowstone:{t:['snowTop','stone','stone'],g:'solid'},log:{t:['log','log','log'],g:'solid'},leaves:{t:['leaves','leaves','leaves'],g:'solid'},spruce:{t:['spruce','spruce','spruce'],g:'solid'},
 snowblock:{t:['snowTop','snowTop','snowTop'],g:'solid'},floor:{t:['floor','floor','floor'],g:'solid'},lava:{t:['lava','lava','lava'],g:'glow'},glow:{t:['glow','glow','glow'],g:'glow'},glass:{t:['glass','glass','glass'],g:'glow'},crystal:{t:['crystal','crystal','crystal'],g:'glow'},water:{t:['water','water','water'],g:'water'},oreD:{t:['oreD','oreD','oreD'],g:'glow'},oreG:{t:['oreG','oreG','oreG'],g:'solid'},path:{t:['path','dirt','dirt'],g:'solid'},cactus:{t:['cactus','cactus','cactus'],g:'solid'},sandstone:{t:['sandstone','sandstone','sandstone'],g:'solid'},bookshelf:{t:['plank','bookshelf','plank'],g:'solid'},chest:{t:['chestT','chestS','chestT','chestF'],g:'solid'},furnace:{t:['furnT','furnS','furnT','furnF'],g:'solid'},
 brick:{t:['brick','brick','brick'],g:'solid'},jungle:{t:['jungle','jungle','jungle'],g:'solid'},aspen:{t:['aspen','aspen','aspen'],g:'solid'},woolR:{t:['woolR','woolR','woolR'],g:'solid'},woolW:{t:['woolW','woolW','woolW'],g:'solid'},cobble:{t:['cobble','cobble','cobble'],g:'solid'},pumpkin:{t:['pumpT','pumpS','pumpT'],g:'solid'},craft:{t:['craftT','craftS','plank'],g:'solid'},tnt:{t:['tntT','tntS','tntT'],g:'solid'},piston:{t:['pistT','pistS','cobble'],g:'solid'},lamp:{t:['lampOn','lampOn','lampOn'],g:'glow'},jack:{t:['pumpT','pumpS','pumpT','pumpF'],g:'glow'}};
function worldMesh(m){const G={solid:{p:[],n:[],u:[],c:[]},glow:{p:[],n:[],u:[],c:[]},water:{p:[],n:[],u:[],c:[]}},e=.5/512;
 for(const [key,type] of m){const [x,y,z]=key.split(',').map(Number),bt=BT[type],g=G[bt.g];
  FACES.forEach(([n,q])=>{const nb=m.get((x+n[0])+','+(y+n[1])+','+(z+n[2]));if(nb&&(BT[nb].g!=='water'||bt.g==='water'))return;
   const id=TILE_ORDER.indexOf(n[1]>0?bt.t[0]:n[1]<0?bt.t[2]:n[2]>0&&bt.t[3]?bt.t[3]:bt.t[1]),col=id%8,row=Math.floor(id/8),u0=col/8+e,u1=(col+1)/8-e,v1=1-row/8-e,v0=1-(row+1)/8+e,UV=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
   const sh=n[1]>0?1:n[1]<0?.55:n[2]?.86:.74,v=q.map(([a,b,c])=>[(x+a)*BK,GY+(y+b)*BK,(z+c)*BK]),ax=n[0]?0:n[1]?1:2,oa=[0,1,2].filter(k=>k!==ax),base=[x+n[0],y+n[1],z+n[2]];
   const occ=(dx,dy,dz)=>{const t=m.get((base[0]+dx)+','+(base[1]+dy)+','+(base[2]+dz));return t&&BT[t].g!=='water'?1:0};
   const ao=q.map(cn=>{const d=[0,0,0],d1=[0,0,0],d2=[0,0,0];d1[oa[0]]=cn[oa[0]]?1:-1;d2[oa[1]]=cn[oa[1]]?1:-1;d[oa[0]]=d1[oa[0]];d[oa[1]]=d2[oa[1]];const s1=occ(...d1),s2=occ(...d2),cr=occ(...d);return[.6,.74,.87,1][s1&&s2?0:3-(s1+s2+cr)]});
   const idx=ao[0]+ao[2]<ao[1]+ao[3]?[1,2,3,1,3,0]:[0,1,2,0,2,3];
   for(const i of idx){const k=sh*ao[i];g.p.push(...v[i]);g.n.push(...n);g.u.push(...UV[i]);g.c.push(k,k,k)}})}
 const A=atlasTex(),mat={solid:new MatC({map:A,vertexColors:true}),glow:new MatC({map:A,vertexColors:true,emissive:new ColC(0xffffff),emissiveMap:A,emissiveIntensity:.85}),water:new MatC({map:A,vertexColors:true,transparent:true,opacity:.8})};
 const root=new Group();for(const k in G){const d=G[k];if(!d.p.length)continue;const g=new BufG();g.setAttribute('position',new Attr(new Float32Array(d.p),3));g.setAttribute('normal',new Attr(new Float32Array(d.n),3));
  g.setAttribute('uv',new Attr(new Float32Array(d.u),2));g.setAttribute('color',new Attr(new Float32Array(d.c),3));root.add(new MeshC(g,mat[k]))}return root}
function boxesMesh(list,glowCol){const p=[],n=[],c=[];list.forEach(([x,y,z,w,h,d,col])=>{const [cr,cg,cb]=[1,3,5].map(i=>parseInt(col.slice(i,i+2),16)/255);
  FACES.forEach(([nn,q])=>{const sh=nn[1]>0?1:nn[1]<0?.6:nn[2]?.86:.74,v=q.map(([a,b,e])=>[x+a*w,y+b*h,z+e*d]);for(const i of [0,1,2,0,2,3]){p.push(...v[i]);n.push(...nn);c.push(cr*sh,cg*sh,cb*sh)}})});
 const g=new BufG();g.setAttribute('position',new Attr(new Float32Array(p),3));g.setAttribute('normal',new Attr(new Float32Array(n),3));g.setAttribute('color',new Attr(new Float32Array(c),3));return new MeshC(g,new MatC(glowCol?{vertexColors:true,emissive:new ColC(glowCol),emissiveIntensity:.9}:{vertexColors:true}))}
function flowers(w,count,cols){const L=[];for(let i=0;i<count;i++){const x=Math.round(rnd(i*3.1)*44-22),z=Math.round(rnd(i*7.7)*44-30);if(Math.abs(x)<6&&z>-5&&z<7)continue;const h=w.h(x,z),bx=x*BK+4+rnd(i)*6,bz=z*BK+4+rnd(i+9)*6,by=GY+h*BK;
 if(i%3){L.push([bx,by,bz,2,6,2,'#3f8a2a'],[bx-1.5,by+6,bz-1.5,5,4,5,cols[i%cols.length]])}else L.push([bx,by,bz,6,4,6,'#4f9e36'])}return L}
// Más vida en el suelo (van en la misma malla de adornos: no suman llamadas de dibujo): matas de pasto, arbustos secos, algas.
function tufts(w,count,cols,seed=0){const L=[];for(let i=0;i<count;i++){const x=Math.round(rnd(i*5.3+seed)*46-23),z=Math.round(rnd(i*2.9+seed+.4)*50-36);if(Math.abs(x)<6&&z>-5&&z<7)continue;const h=w.h?w.h(x,z):0,bx=x*BK+2+rnd(i+seed)*10,bz=z*BK+2+rnd(i+seed+5)*10,by=GY+h*BK,c=cols[i%cols.length];
 L.push([bx,by,bz,1.6,4+rnd(i+1)*4,1.6,c],[bx+2.4,by,bz+1,1.6,3+rnd(i+2)*3,1.6,c],[bx+1,by,bz+2.6,1.6,5+rnd(i+3)*3,1.6,c])}return L}
/** Palmera de bloques (tronco inclinado y cuatro hojas largas) para la playa. */
function palm(L,x,z,h){const bx=x*BK,bz=z*BK;for(let k=0;k<h;k++)L.push([bx+5+k*.9,GY+k*10,bz+5,6,10,6,'#8a6a3a']);const cx=bx+8+h*.9,cy=GY+h*10,cz=bz+8;
 L.push([cx-4,cy,cz-4,8,4,8,'#4f9e36'],[cx-2,cy-6,cz+1,4,4,4,'#6b4a2b']);
 for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const w=dx?20:6,d=dz?20:6;L.push([cx-w/2+dx*12,cy-1,cz-d/2+dz*12,w,3,d,'#3f8a2a'],[cx-2+dx*24,cy-5,cz-2+dz*24,4,4,4,'#4f9e36'])}}
function clouds(n){const L=[];for(let i=0;i<n;i++){const x=rnd(i+.5)*1600-800,z=rnd(i+2.5)*1200-900,w=60+rnd(i+4)*120,d=40+rnd(i+6)*90;L.push([x,GY+330,z,w,10,d,'#ffffff'])}const m=boxesMesh(L);m.material.transparent=true;m.material.opacity=.92;m.material.emissive=new ColC(0x9a9a9a);m.userData.drift=true;return m}
const noise=(x,z)=>(Math.sin(x*.55+z*.3)+Math.sin(z*.47-x*.21)+Math.sin((x+z)*.23+1.7))/3;
// Flat stage where the players stand (x -5..5, z -4..6); hills and props grow behind it.
function land(top,fill,hill=1,peak=7){const m=new Map(),put=(x,y,z,t)=>m.set(x+','+y+','+z,t),hmap={};
 for(let x=-26;x<=25;x++)for(let z=-42;z<=30;z++){const ring=Math.max(-z-6,z-13,Math.abs(x)-13),h=ring>0&&hill?Math.max(0,Math.min(peak,Math.round((noise(x,z)+1)*1.4*hill+ring*.22*hill))):0;hmap[x+','+z]=h;for(let y=-2;y<h;y++)put(x,y,z,y===h-1?top:fill)}
 return{m,put,h:(x,z)=>hmap[x+','+z]||0}}
function tree3(w,x,z,spruce){const b=w.h(x,z);for(let y=b;y<b+4;y++)w.put(x,y,z,'log');const L=spruce?'spruce':'leaves';
 if(spruce){[[b+2,2],[b+3,1],[b+4,1],[b+5,0]].forEach(([y,r])=>{for(let i=-r;i<=r;i++)for(let k=-r;k<=r;k++)if(!(i===0&&k===0&&y<b+4))w.put(x+i,y,z+k,L)});w.put(x,b+6,z,'snow');return}
 for(let y=b+3;y<=b+4;y++)for(let i=-2;i<=2;i++)for(let k=-2;k<=2;k++)if(!(Math.abs(i)===2&&Math.abs(k)===2)&&!(i===0&&k===0))w.put(x+i,y,z+k,L);
 for(let i=-1;i<=1;i++)for(let k=-1;k<=1;k++)w.put(x+i,b+5,z+k,L);w.put(x,b+6,z,L)}
const TREES=[[-12,-9],[11,-10],[-15,-15],[14,-17],[4,-19],[-6,-22],[10,-26],[-12,-29],[1,-33],[-18,2],[19,-2],[-8,18],[9,20],[-20,14],[18,16],[0,25]];
const WORLDS={
 pradera:()=>{const w=land('grass','dirt');TREES.forEach(([x,z])=>tree3(w,x,z));w.deco=[...flowers(w,70,['#e8323a','#ffd84a','#8fd3ff','#ffffff']),...tufts(w,60,['#5aa83a','#4f9e36','#6fbf45'])];w.sky=12;return w},
 bosque:()=>{const w=land('grass','dirt',.8,5);const T=[];for(let i=0;i<40;i++){const x=Math.round(rnd(i*1.7)*48-24),z=Math.round(rnd(i*4.3)*60-38);if(Math.abs(x)<7&&z>-6&&z<8)continue;T.push([x,z,i%3===0])}
  T.forEach(([x,z,sp])=>tree3(w,x,z,sp));w.deco=[...flowers(w,90,['#ff8ad0','#ffd84a','#ffffff','#b58cff']),...tufts(w,70,['#4a8f2f','#3f7f2a','#5aa83a'],7)];w.sky=8;return w},
 cueva:()=>{const m=new Map(),put=(x,y,z,t)=>m.set(x+','+y+','+z,t);for(let x=-10;x<=9;x++)for(let z=-8;z<=8;z++){put(x,-1,z,'stone');put(x,-2,z,'stone')}
  for(let x=-10;x<=9;x++)for(let y=0;y<=6;y++){const q=rnd(x*13+y*7);put(x,y,-8,q>.9?'oreD':q>.82?'oreG':'stone')}
  for(const x of [-10,9])for(let z=-8;z<=6;z++)for(let y=0;y<=6;y++){const q=rnd(z*11+y*5+x);put(x,y,z,q>.92?'oreD':q>.85?'oreG':'stone')}
  for(let x=-10;x<=9;x++)for(let z=-8;z<=6;z++)put(x,7,z,'stone');for(let x=-3;x<=2;x++)put(x,-1,-6,'lava');put(-9,2,-3,'glow');put(8,2,-2,'glow');put(-4,3,-7,'glow');put(5,3,-7,'glow');
  for(let y=0;y<=2;y++){put(-6,y,-5,'stone');put(6,y,-4,'stone')}m.box=[-132,132,-100,132];m.ceil=86;return m},
 desierto:()=>{const w=land('sand','sand',.7,4);[[-10,-9],[9,-11],[-15,-18],[15,-6],[4,-22],[-20,4],[18,12]].forEach(([x,z],i)=>{const b=w.h(x,z);for(let y=b;y<b+2+(i%2);y++)w.put(x,y,z,'cactus')});
  for(let k=0;k<7;k++)for(let x=-7+k;x<=7-k;x++)for(let z=-34+k;z<=-20-k;z++)w.put(x,w.h(0,-27)+k,z,'sandstone');w.deco=tufts(w,26,['#8a6a3a','#a07a40','#6b4a2b'],3);w.sky=4;return w},
 aldea:()=>{const w=land('grass','dirt',.6,4);for(let z=-20;z<=7;z++)for(const x of [-1,0])w.put(x,-1,z,'path');
  const house=(cx,cz)=>{for(let x=cx-2;x<=cx+2;x++)for(let z=cz-2;z<=cz+2;z++)for(let y=0;y<=3;y++){const edge=Math.abs(x-cx)===2||Math.abs(z-cz)===2;if(!edge)continue;const corner=Math.abs(x-cx)===2&&Math.abs(z-cz)===2;
    w.put(x,y,z,corner?'log':(y===1||y===2)&&(x===cx||z===cz)&&!(z===cz+2&&x===cx&&y<3&&false)?'glass':'plank')}for(let k=0;k<3;k++)for(let x=cx-3+k;x<=cx+3-k;x++)for(let z=cz-3;z<=cz+3;z++)w.put(x,4+k,z,'plank');w.put(cx,0,cz+2,'path')};
  house(-8,-8);house(8,-10);house(-9,-19);house(10,-21);TREES.slice(2).forEach(([x,z])=>tree3(w,x,z));w.deco=[...flowers(w,40,['#e8323a','#ffd84a']),...tufts(w,40,['#5aa83a','#4f9e36'],11)];w.sky=10;return w},
 noche:()=>{const w=land('grass','dirt');TREES.forEach(([x,z])=>tree3(w,x,z));w.put(-7,0,-2,'log');w.put(-7,1,-2,'glow');w.put(7,0,-3,'log');w.put(7,1,-3,'glow');w.deco=[...flowers(w,40,['#8fd3ff','#ffffff']),...tufts(w,40,['#2f5a2a','#3a6a32'],5)];return w},
 casa:()=>{const w=land('grass','dirt',.8,5),put=w.put,X0=-9,X1=8,Z0=-6,Z1=7;TREES.forEach(([x,z])=>{if(Math.abs(x)>11||z<-9)tree3(w,x,z)});
  for(let x=X0;x<=X1;x++)for(let z=Z0;z<=Z1;z++){put(x,-1,z,'aspen');for(let y=0;y<=7;y++)w.m.delete(x+','+y+','+z)}
  const wall=(x,y,z,pillar)=>put(x,y,z,y===0?'brick':pillar?'log':'jungle');
  for(let x=X0;x<=X1;x++)for(let y=0;y<=5;y++){if(y>=2&&y<=3&&((x>=-3&&x<=-1)||(x>=4&&x<=6)))continue;wall(x,y,Z0,[X0,-4,3,X1].includes(x))}
  for(const x of [X0,X1])for(let z=Z0;z<=4;z++)for(let y=0;y<=5;y++){if(y>=2&&y<=3&&z>=0&&z<=2)continue;wall(x,y,z,[Z0,-1,4].includes(z))}
  for(let x=X0;x<=X1;x++)for(let z=Z0;z<=4;z++)put(x,6,z,'jungle');for(const z of [-3,1])for(let x=X0+1;x<X1;x++)put(x,5,z,'log');
  for(let x=-8;x<=-6;x++)for(let y=0;y<=2;y++)put(x,y,-5,'bookshelf');put(-2,0,-5,'chest');put(5,0,-5,'furnace');put(6,0,-5,'furnace');put(7,0,1,'woolR');put(7,0,2,'woolW');put(-8,4,-5,'glow');put(7,4,-5,'glow');
  const D=[],cols=['#b3262d','#e8e0d0'];for(let i=0;i<10;i++)for(let k=0;k<10;k++){const edge=i===0||k===0||i===9||k===9,diag=(i+k)%4===0;D.push([-48+i*8,GY,-24+k*8,8,.8,8,edge?'#e8c35a':diag?cols[1]:cols[0]])}
  const PAINT=['#5aa0e6','#5aa0e6','#8fc4f0','#ffd84a','#4f9e36','#3f8a2a','#6b4a2b','#6b4a2b'];for(let i=0;i<12;i++)for(let k=0;k<8;k++)D.push([8+i*4,GY+34+(7-k)*4,-79.5,4,4,1,PAINT[k]]);
  D.push([4,GY+30,-80,56,2,2,'#5a3b1e'],[4,GY+66,-80,56,2,2,'#5a3b1e'],[4,GY+30,-80,2,38,2,'#5a3b1e'],[58,GY+30,-80,2,38,2,'#5a3b1e']);
  for(const [px,pz] of [[-120,90],[114,-70]])D.push([px,GY,pz,8,7,8,'#8a4b2c'],[px+1,GY+7,pz+1,6,4,6,'#3f8a2a'],[px+2,GY+11,pz+2,4,4,4,'#4f9e36']);
  w.deco=D;w.glowDeco=[];for(const [tx,tz] of [[-126.5,-40],[124.5,-40],[-126.5,72],[124.5,72]]){D.push([tx,GY+38,tz,2,8,2,'#6b4a2b']);w.glowDeco.push([tx-.5,GY+46,tz-.5,3,4,3,'#ffd35c'])}
  w.box=[-120,120,-72,104];w.ceil=56;return w},
 nether:()=>{const w=land('nether','nether',1.6,10);for(let x=-26;x<=25;x++)for(let z=-40;z<=-6;z++){if(noise(x*1.7,z*1.3)<-.45&&w.h(x,z)<=1)w.put(x,w.h(x,z)-1,z,'lava')}
  [[-11,-14],[9,-17],[2,-22]].forEach(([x,z])=>{for(let y=0;y<w.h(x,z);y++)w.put(x,y,z+1,'lava')});for(let x=-26;x<=25;x++)for(const z of [-10,-11])if(w.h(x,z)===0)w.put(x,-1,z,'lava');return w},
 end:()=>{const w=land('end','end',.35,2);[[-11,-10,11],[9,-12,14],[-4,-20,17],[14,-22,9],[-16,-18,13]].forEach(([x,z,h])=>{for(let y=0;y<h;y++)for(const [i,k] of [[0,0],[1,0],[0,1],[1,1]])w.put(x+i,y,z+k,'obsidian');w.put(x,h,z,'crystal')});return w},
 nieve:()=>{const w=land('snow','dirt',1.3,9);for(const [k,t] of [...w.m])if(t==='snow'){const [x,y,z]=k.split(',').map(Number);if(y>=2)w.m.set(k,'snowstone')}TREES.forEach(([x,z])=>tree3(w,x,z,true));w.sky=6;return w},
 playa:()=>{const m=new Map(),put=(x,y,z,t)=>m.set(x+','+y+','+z,t);m.skyN=1;for(let x=-26;x<=25;x++)for(let z=-42;z<=30;z++){if(z>=-4){put(x,-1,z,'sand');put(x,-2,z,'sand')}else{put(x,-1,z,'water');put(x,-2,z,'sand')}}
  // palmeras a los lados, algas bajo el agua y conchas en la arena
  const D=[];palm(D,-12,2,6);palm(D,13,-1,7);palm(D,-19,9,5);palm(D,20,7,6);
  for(let i=0;i<26;i++){const x=rnd(i*3.3)*700-350,z=-80-rnd(i*1.9)*420;if(Math.abs(x)<90&&z>-110)continue;D.push([x,GY-15,z,3,9+rnd(i)*5,3,i%2?'#2f7a3a':'#3f8a4a'])}
  for(let i=0;i<10;i++){const x=rnd(i*7.1)*560-280,z=rnd(i*4.7)*120-30;if(Math.abs(x)<80)continue;D.push([x,GY,z,3,1.2,3,i%2?'#ffd1c4':'#f4e6c8'])}
  m.deco=D;return m},
  halloween:()=>{const w=land('grass','dirt',.9,6);
   [[-12,-9],[11,-10],[-15,-17],[14,-18],[4,-21],[-6,-24],[18,-4],[-19,3]].forEach(([x,z],i)=>{const b=w.h(x,z),h=4+i%3;for(let y=b;y<b+h;y++)w.put(x,y,z,'log');w.put(x+1,b+h-1,z,'log');w.put(x+2,b+h,z,'log');w.put(x-1,b+h-2,z,'log');w.put(x-2,b+h-1,z,'log');w.put(x,b+h,z+1,'log')});
   [[-9,-6],[-6,-8],[7,-7],[10,-5],[-2,-12],[3,-13],[-12,-3],[13,-2]].forEach(([x,z],i)=>{const b=w.h(x,z);w.put(x,b,z,'cobble');w.put(x,b+1,z,'cobble');if(i%2)w.put(x+1,b+1,z,'cobble')});
   [[-6,-2],[6,-3],[-7,4],[7,5],[-4,-6],[4,-6],[-11,-12],[12,-13],[0,-16]].forEach(([x,z],i)=>w.put(x,w.h(x,z),z,i%3===2?'pumpkin':'jack'));
   w.deco=flowers(w,30,['#ff8a1f','#7a2f9a']);return w},
  estudio:()=>{const m=new Map();for(let x=-26;x<=25;x++)for(let z=-40;z<=30;z++){m.set(x+',-1,'+z,'floor');m.set(x+',-2,'+z,'floor')}return m}};
// Sky dome (equirectangular): the camera looks at u=0.25; the horizon is the middle row.
// Cielo por franjas planas (como el cielo por capas del juego), no un degradado suave; el sol es un cuadrado con un
// halo de dos escalones duros.
const mixHex=(a,b,k)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),A=p(a),B=p(b);return`rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`};
function skyCanvas(o){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.scale(.5,.5);
 const bands=[[0,o.top],[.34,mixHex(o.top,o.mid||o.hor,.5)],[.56,o.mid||o.hor],[.78,mixHex(o.mid||o.hor,o.hor,.5)],[.9,o.hor]];
 bands.forEach(([y0,col],i)=>{x.fillStyle=col;const y1=i+1<bands.length?bands[i+1][0]:1;x.fillRect(0,Math.round(y0*512),2048,Math.ceil((y1-y0)*512))});x.fillStyle=o.hor;x.fillRect(0,512,2048,512);
 if(o.stars)for(let i=0;i<420;i++){x.globalAlpha=.4+rnd(i+7)*.6;x.fillStyle=o.stars;x.fillRect(rnd(i)*2048|0,rnd(i+99)*470|0,2,2)}x.globalAlpha=1;
 if(o.sun){const [u,v,sz,col,halo]=o.sun,cx=u*2048,cy=v*1024;x.fillStyle=halo;x.globalAlpha=.45;x.fillRect(cx-sz*1.5,cy-sz*1.5,sz*3,sz*3);x.globalAlpha=.7;x.fillRect(cx-sz,cy-sz,sz*2,sz*2);x.globalAlpha=1;x.fillStyle=col;x.fillRect(cx-sz/2,cy-sz/2,sz,sz)}
 if(o.clouds)for(let i=0;i<26;i++){const cx=rnd(i+3)*2048,cy=372+rnd(i+41)*48,w=26+rnd(i+13)*50;x.fillStyle=o.clouds;x.fillRect(cx,cy,w,8);x.fillRect(cx+8,cy-5,w*.55,6)}
 if(o.mount)o.mount.forEach(([col,amp,off],L)=>{x.fillStyle=col;for(let u=0;u<2048;u+=4){const h=Math.max(2,Math.round((Math.sin(u*.011+off)+Math.sin(u*.027+off*2)+1.4)*amp))|0;x.fillRect(u,512-h,4,h)}});
 return c}
const SKIES={pradera:{top:'#3f8fe0',mid:'#8cc8f5',hor:'#cfeaff',sun:[.29,.43,22,'#fff6b0','rgba(255,246,176,.6)'],clouds:'rgba(255,255,255,.92)',mount:[['#9cc4a0',9,.3]],near:360,far:900},
 noche:{top:'#03061a',mid:'#101a45',hor:'#1c2a5a',stars:'#ffffff',sun:[.21,.44,18,'#eef2ff','rgba(200,215,255,.35)'],mount:[['#0d1433',9,.3]],near:260,far:760},
 casa:{top:'#3f8fe0',mid:'#8cc8f5',hor:'#cfeaff',sun:[.26,.43,20,'#fff6b0','rgba(255,246,176,.6)'],clouds:'rgba(255,255,255,.9)',mount:[['#9cc4a0',9,.3]],near:260,far:760},
 nether:{top:'#1a0303',mid:'#4a0f08',hor:'#7a2410',mount:[['#3a0906',14,1.2],['#5a130b',8,2]],near:120,far:520},
 end:{top:'#05020b',mid:'#150a26',hor:'#241338',stars:'#d9c9ff',mount:[['#140a22',5,.5]],near:180,far:620},
 nieve:{top:'#8fb0d6',mid:'#c6d8ec',hor:'#e7f0fa',sun:[.31,.44,16,'#ffffff','rgba(255,255,255,.5)'],mount:[['#b9c9dc',16,.8],['#dfe9f5',8,2.1]],near:300,far:820},
 playa:{top:'#ff9b63',mid:'#ffc583',hor:'#ffe0b0',sun:[.25,.485,34,'#fff0a8','rgba(255,240,170,.7)'],near:360,far:900},
 bosque:{top:'#4d97d6',mid:'#9fcbe8',hor:'#cfe6d8',sun:[.3,.42,20,'#fff6b0','rgba(255,246,176,.5)'],clouds:'rgba(255,255,255,.9)',mount:[['#6f9b72',11,.9]],near:220,far:620},
 cueva:{top:'#0b0a09',hor:'#15120f',near:120,far:380},
 desierto:{top:'#5ea8e8',mid:'#a9d3f0',hor:'#f3e2b8',sun:[.27,.41,26,'#fffbe0','rgba(255,250,210,.6)'],mount:[['#e0c48e',10,.4],['#ead3a1',6,1.8]],near:380,far:980},
 aldea:{top:'#3f8fe0',mid:'#8cc8f5',hor:'#cfeaff',sun:[.31,.42,22,'#fff6b0','rgba(255,246,176,.6)'],clouds:'rgba(255,255,255,.92)',mount:[['#9cc4a0',9,1.4]],near:340,far:880},
  halloween:{top:'#12061e',mid:'#3a1450',hor:'#5a2440',stars:'#ffe3c2',sun:[.22,.42,30,'#ffb347','rgba(255,140,50,.5)'],mount:[['#1d0b29',10,.6]],near:230,far:700},
 estudio:{top:'#0c0f0a',mid:'#1a2414',hor:'#26331c',near:140,far:460}};

// ===== animaciones propias del quiz (sobre las de skinview3d) =====
Object.assign(ANIMS,{
 think:['Pensar',()=>fn((p,t)=>{const s=p.skin;s.leftArm.rotation.x=-1.95+.05*Math.sin(t*2);s.leftArm.rotation.z=-.35;s.head.rotation.x=.12;s.head.rotation.z=.12*Math.sin(t*.9);s.head.rotation.y=.18*Math.sin(t*.6)-.1})],
 hurt:['Golpeado',()=>fn((p,t)=>{const k=Math.max(0,1-t/.75),w=Math.sin(t*34)*k,s=p.skin;p.rotation.z=.1*w;p.position.z=-3.2*k;p.position.x=1.1*w;s.head.rotation.x=.45*k;s.rightArm.rotation.x=.6*k;s.leftArm.rotation.x=.6*k;s.rightArm.rotation.z=-.3*k;s.leftArm.rotation.z=.3*k})]
});
HOLD.add('think');HOLD.add('hurt');

// ===== ambiente: partículas 2D sobre el 3D (coordenadas virtuales 1080x1920) =====
const AMBIENT={
 noche(c,t){bits.slice(0,16).forEach(b=>{const x=b.x+Math.sin(t*b.v+b.p)*60,y=1000+(b.y%600)+Math.cos(t*b.v*1.3+b.p)*40;glow(c,x,y,26,'rgba(255,230,90,.35)');sq(c,x,y,8,'#fff27a',.6+.4*Math.sin(t*3+b.p))})},
 nether(c,t){bits.forEach(b=>{const y=VH-((b.y+t*120*b.v)%VH),x=b.x+Math.sin(t+b.p)*30;sq(c,x,y,b.s*.7|0,b.p>3?'#ffb13b':'#ff5a1c',clamp(y/VH)*.9)});glow(c,VW/2,VH,900,`rgba(255,80,20,${.12+.06*Math.sin(t*2)})`)},
 end(c,t){bits.forEach(b=>{const a=t*b.v*.6+b.p,r=220+b.s*14,x=VW/2+Math.cos(a)*r,y=1150+Math.sin(a*1.3)*260;sq(c,x,y,b.s*.6|0,b.p>3?'#c77dff':'#7b2ff7',.75)})},
 nieve(c,t){bits.forEach(b=>{const y=(b.y+t*90*b.v)%VH,x=b.x+Math.sin(t*1.5+b.p)*40;sq(c,x,y,b.s*.6|0,'#ffffff',.85)})},
 cueva(c,t){bits.slice(0,12).forEach(b=>{const x=b.x+Math.sin(t*b.v+b.p)*30,y=900+(b.y%700);sq(c,x,y,6,'#ffcf6a',.25+.25*Math.sin(t*2+b.p))})},
 halloween(c,t){bits.slice(0,14).forEach(b=>{const x=b.x+Math.sin(t*b.v+b.p)*50,y=VH-((b.y+t*60*b.v)%VH);glow(c,x,y,22,'rgba(255,140,40,.3)');sq(c,x,y,6,'#ffb347',.5+.4*Math.sin(t*3+b.p))})}
};
// ===== clima (scene.clima): partículas 2D baratas encima del 3D, en las mismas coordenadas virtuales. Sin mallas ni texturas:
// cada fotograma son a lo sumo ~80 rectángulos o un solo trazo. En nivel bajo (360x640 o degradado) va la mitad. =====
const lite=()=>W<=360;
const wrap=(v,m)=>((v%m)+m)%m;
const CLIMA={
 lluvia(c,t){const n=lite()?40:80;c.strokeStyle='rgba(205,222,255,.5)';c.lineWidth=3;c.beginPath();
  for(let i=0;i<n;i++){const b=bits[i%40],x=wrap(b.x+i*53-t*240,VW+200)-100,y=wrap(b.y+i*97+t*1650*(.8+b.v*.3),VH+200)-100;c.moveTo(x,y);c.lineTo(x-14,y+46)}c.stroke()},
 polen(c,t){const n=lite()?12:24;for(let i=0;i<n;i++){const b=bits[i],x=b.x+Math.sin(t*.4*b.v+b.p)*80,y=480+wrap(b.y*.6+Math.cos(t*.3*b.v+b.p)*60-t*12,900);sq(c,x,y,6,'#fff3a0',.5+.3*Math.sin(t*2+b.p))}},
 hojas(c,t){const n=lite()?10:20,cols=['#6fae3a','#4f9e36','#d98b2b','#c6a13a'];for(let i=0;i<n;i++){const b=bits[i],y=wrap(b.y+t*70*b.v,VH+100)-50,x=b.x+Math.sin(t*1.2*b.v+b.p)*90;
  c.save();c.translate(x,y);c.rotate(Math.sin(t*2+b.p)*.8);c.globalAlpha=.85;c.fillStyle=cols[i%4];c.fillRect(-7,-5,14,10);c.restore()}c.globalAlpha=1},
 arena(c,t){const n=lite()?14:28;c.fillStyle='rgba(235,210,150,.42)';for(let i=0;i<n;i++){const b=bits[i],x=wrap(b.x-t*520*b.v,VW+300)-150,y=700+(b.y%1000);c.fillRect(x,y,60+b.s*4,3)}},
 nevada(c,t){AMBIENT.nieve(c,t)},
 luciernagas(c,t){AMBIENT.noche(c,t)},
 goteo(c,t){for(let i=0;i<(lite()?4:8);i++){const b=bits[i],p=wrap(t*.5*b.v+b.p,1.4),x=120+(b.x*.8)%840;if(p<1)sq(c,x,600+p*p*900,8,'#8fc8ff',.7);else{const k=(p-1)/.4;sq(c,x-14*k,1500,6,'#8fc8ff',.6*(1-k));sq(c,x+14*k,1500,6,'#8fc8ff',.6*(1-k))}}},
 polvo(c,t){c.fillStyle='rgba(255,236,190,.07)';c.beginPath();c.moveTo(620,0);c.lineTo(860,0);c.lineTo(560,1500);c.lineTo(260,1500);c.closePath();c.fill();
  for(let i=0;i<(lite()?10:20);i++){const b=bits[i],y=wrap(b.y*.7+t*20*b.v,1400),x=300+wrap(b.x*.4+Math.sin(t*.5+b.p)*40,300)+(1400-y)*.2;sq(c,x,y,5,'#fff2c8',.5)}},
 ceniza(c,t){AMBIENT.nether(c,t)}
};

// ===== mundo: bloques, cielo, niebla y luz por escenario (y por hora del día / lluvia) =====
const worldCache={},skyCache=new Map();let worldShown=null,lookShown=null;
const sun=new (viewer.cameraLight.constructor)(0xfff1d6,1.1,0,0);sun.position.set(420,760,520);viewer.scene.add(sun);
const SUN={pradera:1.15,bosque:1,aldea:1.15,desierto:.85,playa:.8,nieve:.7,noche:.25,halloween:.3,casa:.55,cueva:0,nether:.45,end:.3,estudio:.6};
const LIGHT={pradera:[1,[1,1,1]],noche:[.7,[.75,.8,1]],casa:[1.05,[1,.93,.84]],nether:[.9,[1,.78,.62]],end:[.85,[.9,.84,1]],nieve:[1,[.92,.96,1]],playa:[1,[1,.93,.84]],
 bosque:[.95,[.95,1,.92]],cueva:[.6,[1,.9,.8]],desierto:[1.05,[1,.95,.85]],aldea:[1,[1,1,1]],halloween:[.72,[1,.78,.9]],estudio:[1,[1,1,1]]};
// Hora del día (scene.hora) para los lugares al aire libre: cambia el cielo (franjas planas), el sol/luna, la luz, la niebla y el
// color de las nubes. Sin hora (o «dia») se ve como siempre.
const HORAS={
 tarde:{top:'#2c3e8f',mid:'#e0785a',hor:'#ffb36b',sun:[.27,.47,30,'#ffb347','rgba(255,170,80,.6)'],light:[.86,[1,.8,.62]],sunI:.75,grade:[1.05,1.2,1.07,1.9,.55],cloud:0xffc8a8},
 amanecer:{top:'#4a6fc0',mid:'#f4a9b8',hor:'#ffe1b0',sun:[.33,.48,24,'#fff1c4','rgba(255,220,190,.6)'],light:[.95,[1,.9,.86]],sunI:.9,grade:[1.06,1.12,1.05,.9,.5],cloud:0xfff0f0},
 noche:{top:'#03061a',mid:'#101a45',hor:'#1c2a5a',stars:'#ffffff',sun:[.21,.44,18,'#eef2ff','rgba(200,215,255,.35)'],light:[.62,[.72,.78,1]],sunI:.22,grade:GRADE.noche,cloud:0x39436a},
};
const LLUVIA={top:'#59677a',mid:'#7d8a98',hor:'#a6b0ba',light:[.8,[.86,.9,.96]],sunI:.35,grade:[.98,.85,1.02,-.4,.55],cloud:0x8a939c};
function skyFor(key,hora,lluvia){const base=SKIES[key],h=HORAS[hora],o={...base};
 if(h){Object.assign(o,{top:h.top,mid:h.mid,hor:h.hor,sun:h.sun,stars:h.stars||null});if(base.mount)o.mount=base.mount.map(([c,a,f])=>[mixHex(c,h.top,.55),a,f]);if(base.clouds)o.clouds=hora==='noche'?'rgba(120,130,170,.35)':'rgba(255,214,190,.85)'}
 if(lluvia){Object.assign(o,{top:LLUVIA.top,mid:LLUVIA.mid,hor:hora==='noche'?'#2a3346':LLUVIA.hor,sun:null,stars:null,clouds:'rgba(220,225,232,.9)'});if(hora==='noche'){o.top='#0d1220';o.mid='#1d2638'}if(base.mount)o.mount=base.mount.map(([c,a,f])=>[mixHex(c,'#5a6573',.6),a,f]);o.near=base.near*.7;o.far=base.far*.75}
 return o}
let sceneTok=0;
const worldKey=k=>WORLDS[k]?k:(theme.defaultWorld&&WORLDS[theme.defaultWorld]?theme.defaultWorld:'pradera');
// Crea (una sola vez) la malla del mundo; las texturas de bloques se piden aquí. Oculta hasta que showWorld la muestre.
async function ensureWorld(key,tok){
 if(worldCache[key])return true;
 performance.mark?.('te-world-start');const w=WORLDS[key](),bm=w instanceof Map?w:w.m;performance.mark?.('te-world-data');await ensureBlockTextures(bm);performance.mark?.('te-world-textures');if(tok!==undefined&&tok!==sceneTok)return false;if(worldCache[key])return true;
 const g=worldMesh(bm);performance.mark?.('te-world-mesh');g.userData={h:w.h,box:(w.box||bm.box),ceil:(w.ceil??bm.ceil),m:bm};if(w.deco)g.add(boxesMesh(w.deco));if(w.glowDeco)g.add(boxesMesh(w.glowDeco,0xffb040));if(w.sky)g.add(clouds(w.sky));g.visible=false;worldCache[key]=g;viewer.scene.add(g);return true}
/** Lienzo del cielo (1024x512, 2 MB: son franjas planas, no pierde nada): se guardan como mucho 3 (el actual, el anterior y el precargado). */
function skyCanvasFor(key,hora,lluvia){const k=key+'|'+(hora||'')+'|'+(lluvia?1:0);let c=skyCache.get(k);if(c){skyCache.delete(k);skyCache.set(k,c);return c}
 c=skyCanvas(skyFor(key,hora,lluvia));skyCache.set(k,c);while(skyCache.size>3)skyCache.delete(skyCache.keys().next().value);return c}
async function showWorld(key,tok,hora=null,clima=null){
 key=worldKey(key);const lluvia=clima==='lluvia',look=key+'|'+(hora||'')+'|'+(lluvia?1:0);if(lookShown===look)return;
 if(!(await ensureWorld(key,tok)))return;
 if(tok!==undefined&&tok!==sceneTok)return;
 if(worldShown!==key){for(const g of Object.values(worldCache))g.visible=false;worldCache[key].visible=true;worldShown=key}
 lookShown=look;
 const sk=skyFor(key,hora,lluvia),h=HORAS[hora];viewer.loadBackground(skyCanvasFor(key,hora,lluvia),303);performance.mark?.('te-sky');const bt=viewer.scene.background;bt.magFilter=bt.minFilter=1003;bt.generateMipmaps=false;
 viewer.scene.fog={isFog:true,name:'',color:new ColC(sk.hor),near:sk.near*1.4,far:sk.far*1.35};
 const[g,[rr,gg,b]]=(lluvia?LLUVIA.light:h?.light)||LIGHT[key]||LIGHT.pradera,si=(lluvia?LLUVIA.sunI:h?.sunI)??SUN[key]??.8;sun.intensity=si*1.3;setGrade(key);
 const gr=lluvia?LLUVIA.grade:h?.grade;if(gr){const u=gradeFX.uniforms;[u.exposure.value,u.sat.value,u.con.value,u.warm.value,u.vig.value]=gr}
 sun.color.setRGB(rr,gg,b);viewer.globalLight.intensity=L0.g*g;viewer.globalLight.color.setRGB(rr,gg,b);viewer.cameraLight.intensity=L0.c*(.5+.3*g);
 const cloud=(lluvia?LLUVIA.cloud:h?.cloud)??0x9a9a9a;worldCache[key].children.forEach(m=>{if(m.userData.drift)m.material.emissive.setHex(cloud)})}

// ===== cámara =====
// Sin plano de cine (scene.camara): orbita despacio alrededor del anfitrión como siempre. Con plano: modo cine (abajo).
const proj=(x,y,z=0)=>{const v=new V3(x,y,z).project(viewer.camera);return[(v.x+1)/2*W,(1-v.y)/2*H]};
function keepCam(pos){const u=worldCache[worldShown]?.userData;if(!u)return pos;if(u.box){pos[0]=Math.max(u.box[0],Math.min(u.box[1],pos[0]));pos[2]=Math.max(u.box[2],Math.min(u.box[3],pos[2]))}
 const bx=Math.floor(pos[0]/BK),bz=Math.floor(pos[2]/BK);let top=GY+(u.h?u.h(bx,bz):0)*BK;if(u.m){for(let y=12;y>=-1;y--){const t=u.m.get(bx+','+y+','+bz);if(t&&t!=='water'&&GY+(y+1)*BK<=(u.ceil??1e9)){top=Math.max(top,GY+(y+1)*BK);break}}}
 pos[1]=Math.max(pos[1],top+5);if(u.ceil!=null)pos[1]=Math.min(pos[1],u.ceil);return pos}
// Encuadre (scene.shot): x = dónde queda el personaje en pantalla (fracción del ancho, + derecha), zoom (1 = normal),
// yaw = ángulo de la cámara alrededor del personaje (rad), height = cámara más alta o más baja. La cámara se desplaza de
// lado (no el personaje), así el globo y las partículas siguen anclados a él. `nudge` lo corre un poco más para
// hacerle espacio a un objeto que explica.
let camT=0,shake=0,push=0,shot={x:0,zoom:1,yaw:0,height:0},nudgeX=0,nudgeTo=0,reduced=!!opts.reducedMotion;
// ── modo cine (theme.cine.planos, como los 7 planos de SkinLibre Clips): cada plano es
//   el (elevación de la cámara en grados: + desde arriba, − desde abajo), az (giro extra alrededor del personaje, rad),
//   zoom, ty (altura a la que mira), roll (inclinación «holandesa», rad), orbit (amplitud de una órbita lenta, rad),
//   travel (amplitud de un travelling lateral lento, fracción del ancho) y oy (sube el encuadre: fracción del alto; deja al
//   personaje en la mitad de arriba, sobre el panel de la pregunta).
// Entre preguntas el plano cambia un poco (VARIANTES) y la cámara viaja hasta él en ~1,5 s; la variante 4 es el plano
// detalle del objeto en la mano. Con movimiento reducido no hay órbita, travelling ni variantes: el plano base, quieto.
const VARIANTES=[{},{zoom:1.12,az:.12},{az:-.18,el:6},{zoom:.9,el:-4,az:.07},{foco:1,zoom:1.25,el:4}];
const CAM0={el:10,az:0,zoom:1,ty:-5,roll:0,orbit:0,travel:0,oy:0,foco:0};
let plano=null,variante=0,camCur=null;
function camGoal(){if(!plano)return null;const g={...CAM0,...plano},v=reduced?{}:VARIANTES[variante]||{};
 return{...g,el:g.el+(v.el||0),az:g.az+(v.az||0),zoom:g.zoom*(v.zoom||1),foco:v.foco||0,orbit:reduced?0:g.orbit,travel:reduced?0:g.travel}}
const tmpV=new V3();
let viewOy=0;
function setOy(oy){if(Math.abs(oy-viewOy)<1e-3)return;viewOy=oy;const c=viewer.camera;if(Math.abs(oy)<1e-3)c.clearViewOffset();else c.setViewOffset(W,H,0,Math.round(oy*H),W,H);c.updateProjectionMatrix()}
function camera(dt){const cfg=Object.assign({dist:92,height:2,lookY:-8,sway:.12,swaySpeed:.5},theme.camera||{},((theme.camera||{}).worlds||{})[worldShown]||{}),c=viewer.camera;
 camT+=dt;push=Math.max(0,push-dt*1.4);nudgeX+=(nudgeTo-nudgeX)*(reduced?1:1-Math.exp(-dt*8));
 const goal=camGoal();
 if(!goal){setOy(0);
  const yaw=shot.yaw||0,a=Math.sin(camT*cfg.swaySpeed)*cfg.sway+yaw,dist=cfg.dist/(shot.zoom||1)*(1-.1*easeOut(push)),hgt=cfg.height+(shot.height||0);
  const hw=dist*Math.tan(c.fov*Math.PI/360)*c.aspect,off=-((shot.x||0)+nudgeX)*2*hw,rx=Math.cos(a),rz=-Math.sin(a);
  const pos=keepCam([Math.sin(a)*dist+rx*off,hgt,Math.cos(a)*dist+rz*off]);
  c.up.set(0,1,0);c.position.set(...pos);c.lookAt(rx*off,cfg.lookY+(shot.height||0)*.35,rz*off);
  if(!enter||enter.kind!=='gira')host.wrap.rotation.y=yaw*.85-((shot.x||0)+nudgeX)*.9}
 else{
  if(!camCur||reduced)camCur={...goal};else{const k=1-Math.exp(-dt*1.6);for(const p in goal)camCur[p]+=(goal[p]-camCur[p])*k}
  const q=camCur,orb=q.orbit*Math.sin(camT*.11),az=(shot.yaw||0)*.5+q.az+orb,el=q.el*Math.PI/180;
  let dist=cfg.dist/((shot.zoom||1)*q.zoom)*(1-.1*easeOut(push)),tx=0,ty=q.ty,tz=0;
  if(q.foco>.01){const it=host.item;if(it)it.getWorldPosition(tmpV);else tmpV.set(0,12,0);const f=clamp(q.foco)*.6;tx+=(tmpV.x-tx)*f;ty+=(tmpV.y-ty)*f;tz+=(tmpV.z-tz)*f;dist*=1-.35*clamp(q.foco)}
  dist=Math.max(26,dist);
  const hw=dist*Math.tan(c.fov*Math.PI/360)*c.aspect,off=-((shot.x||0)+nudgeX)*2*hw*(1-.5*clamp(q.foco))+q.travel*Math.sin(camT*.09)*2*hw,rx=Math.cos(az),rz=-Math.sin(az);
  const pos=keepCam([tx+Math.sin(az)*Math.cos(el)*dist+rx*off,ty+Math.sin(el)*dist,tz+Math.cos(az)*Math.cos(el)*dist+rz*off]);
  c.up.set(0,1,0);c.position.set(...pos);c.lookAt(tx+rx*off,ty,tz+rz*off);if(q.roll)c.rotateZ(q.roll);setOy(q.oy);
  if(!enter||enter.kind!=='gira')host.wrap.rotation.y=az*.55-((shot.x||0)+nudgeX)*.9}
 if(shake>0){shake=Math.max(0,shake-dt);c.position.x+=(Math.random()-.5)*shake*5;c.position.y+=(Math.random()-.5)*shake*5}c.updateMatrixWorld()}

// ===== entrada al llegar a un lugar nuevo (scene.enter): camina desde el lado, cae de arriba, gira o saluda =====
let enter=null;
const ENTER_DUR={camina:.9,salta:.65,gira:.7,saluda:1.3};
function stepEnter(dt){if(!enter)return;enter.t+=dt;const p=Math.min(1,enter.t/ENTER_DUR[enter.kind]),k=easeOut(p),s=host.player.skin,side=(shot.x||0)<0?-1:1;
 host.wrap.position.set(0,0,0);
 if(enter.kind==='camina'){host.wrap.position.x=(1-k)*36*side;const sw=Math.sin(enter.t*13)*(1-p)*.9;s.rightLeg.rotation.x=sw;s.leftLeg.rotation.x=-sw;s.leftArm.rotation.x=-sw*.8}
 else if(enter.kind==='salta'){host.wrap.position.y=(1-k)*46-Math.sin(clamp((p-.7)/.3)*Math.PI)*1.5}
 else if(enter.kind==='gira'){host.wrap.rotation.y=(shot.yaw||0)*.85-(shot.x||0)*.9+(1-k)*Math.PI*2}
 else if(enter.kind==='saluda'){s.leftArm.rotation.z=(2.5+Math.sin(enter.t*14)*.35)*Math.sin(Math.min(1,p*1.2)*Math.PI);s.leftArm.rotation.x=0}
 host.shadow.position.y=FEET+.15-host.wrap.position.y;
 if(p>=1){enter=null;host.wrap.position.set(0,0,0);host.shadow.position.y=FEET+.15}}

// ===== decorados (scene.props): bloques detrás del personaje, del lado libre del encuadre =====
// Coordenadas en bloques: x hacia el lado libre (0 = detrás del personaje), y hacia arriba, z hacia atrás (0 = fila del decorado).
const iglu=(()=>{const L=[];for(let x=0;x<=4;x++)for(let z=-5;z<=-1;z++){const dx=x-2,dz=z+3,ring=Math.max(Math.abs(dx),Math.abs(dz))===2&&!(Math.abs(dx)===2&&Math.abs(dz)===2);
 if(ring&&!(x===2&&z===-1)){L.push([x,0,z,'snowblock']);L.push([x,1,z,'snowblock'])}if(Math.abs(dx)<=1&&Math.abs(dz)<=1)L.push([x,2,z,'snowblock'])}return L})();
const PROPS={
 taller:{b:[[1,0,0,'craft'],[2,0,0,'furnace'],[2,0,-1,'chest'],[0,0,-1,'chest']]},
 biblioteca:{b:[[0,0,-1,'bookshelf'],[1,0,-1,'bookshelf'],[2,0,-1,'bookshelf'],[0,1,-1,'bookshelf'],[1,1,-1,'bookshelf'],[2,1,-1,'bookshelf']],x:'mesa'},
 circuito:{b:[[1,0,0,'piston'],[2,0,0,'lamp'],[2,0,-1,'tnt'],[0,0,-1,'lamp']],x:'polvo'},
 corral:{b:[[2,0,0,'pumpkin'],[0,0,-1,'woolW']],x:'cerca'},
 portal:{b:[[0,0,-1,'obsidian'],[1,0,-1,'obsidian'],[2,0,-1,'obsidian'],[3,0,-1,'obsidian'],[0,1,-1,'obsidian'],[0,2,-1,'obsidian'],[0,3,-1,'obsidian'],[3,1,-1,'obsidian'],[3,2,-1,'obsidian'],[3,3,-1,'obsidian'],[0,4,-1,'obsidian'],[1,4,-1,'obsidian'],[2,4,-1,'obsidian'],[3,4,-1,'obsidian']],x:'portal'},
 campamento:{b:[[2,0,-1,'chest']],x:'campamento'},
 mina:{b:[[0,0,-1,'stone'],[1,0,-1,'oreD'],[1,1,-1,'stone'],[2,0,-1,'oreG'],[2,1,-1,'stone'],[2,2,-1,'stone'],[0,1,-1,'oreG']],x:'antorcha'},
 // nuevos (modo cine): granja de trigo, iglú, cristales del End, ruinas con pararrayos y muelle con bote
 granja:{b:[[3,0,1,'plank']],x:'granja'},
 iglu:{b:iglu,x:'iglu'},
 cristales:{b:[[2,0,-2,'obsidian'],[2,1,-2,'obsidian'],[2,2,-2,'obsidian'],[3,0,-2,'obsidian'],[3,1,-2,'obsidian'],[2,3,-2,'crystal']],x:'coro'},
 ruinas:{b:[[0,0,-1,'sandstone'],[0,1,-1,'sandstone'],[0,2,-1,'sandstone'],[0,3,-1,'sandstone'],[2,0,-2,'sandstone'],[2,1,-2,'sandstone'],[3,0,0,'sandstone'],[1,0,-2,'cobble']],x:'pararrayos'},
 muelle:{b:[],x:'muelle'},
};
const PROP_Z={cueva:-6,casa:-5,playa:-4,end:-6,nether:-6};
const propCache={};let propShown=null;
/** Piezas sueltas de cada decorado (cajas de color). bx(i) = borde izquierdo del bloque i ya reflejado hacia el lado libre. */
function propExtras(kind,Y,Z,s){const L=[],G=[],bx=i=>s>0?i*BK:-(i+1)*BK;
 if(kind==='mesa'){const x=bx(1);L.push([x,Y,Z,16,12,16,'#1b1029'],[x,Y+12,Z,16,2,16,'#b02e26'],[x+5,Y+17,Z+5,6,2,6,'#8b4a2b']);G.push([x+1,Y+12,Z+1,3,3,3,'#2fd3c9'],[x+12,Y+12,Z+12,3,3,3,'#2fd3c9'])}
 if(kind==='polvo')G.push([Math.min(bx(1),bx(2))+8,Y+.2,Z+7,16,.8,2,'#ff3020']);
 if(kind==='cerca'){for(let i=0;i<3;i++)L.push([bx(i)+6,Y,Z+6,4,16,4,'#a0784a']);L.push([Math.min(bx(0),bx(2))+6,Y+6,Z+7,36,2,2,'#8a643a'],[Math.min(bx(0),bx(2))+6,Y+12,Z+7,36,2,2,'#8a643a'])}
 if(kind==='portal')L.portal=[Math.min(bx(1),bx(2)),Y+16,Z-8,32,48];
 if(kind==='campamento'){const x=bx(1);L.push([x,Y,Z,16,5,32,'#7a5a36'],[x,Y+5,Z+8,16,3,24,'#b02e26'],[x,Y+5,Z,16,3,8,'#e9ecec']);const f=bx(0);L.push([f+2,Y,Z+20,12,3,3,'#5c3d1e'],[f+6,Y,Z+16,3,3,12,'#5c3d1e']);G.push([f+5,Y+3,Z+18,6,8,6,'#ffb040'])}
 if(kind==='antorcha'){const x=bx(0)+6;L.push([x,Y+16,Z-10,3,10,3,'#8a5a2b']);G.push([x-.5,Y+26,Z-10.5,4,4,4,'#ffd35c'])}
 if(kind==='granja'){for(let r=0;r<3;r++){const x0=bx(r);L.push([x0+1,Y,Z-22,14,1.6,40,'#5c3d1e']);for(let k=0;k<5;k++){const z=Z-20+k*8,c=(r+k)%3?'#c9b23a':'#7fae3a';
   L.push([x0+3,Y+1.6,z,2,6+((r*7+k*3)%4),2,c],[x0+7,Y+1.6,z+3,2,5+((r*5+k)%4),2,c],[x0+11,Y+1.6,z+1,2,7+((r+k)%3),2,c])}}
  const hx=bx(3);L.push([hx+2,Y,Z-20,12,10,12,'#d8b84a'],[hx+2,Y+4,Z-20,12,2,12,'#a08a30'])}
 if(kind==='iglu'){const x=bx(2)+5;G.push([x,Y,Z-14,6,6,3,'#ffcf6a'])}
 if(kind==='coro'){const x=bx(0)+6;L.push([x,Y,Z-20,4,26,4,'#7a5a8a'],[x-8,Y+14,Z-20,12,4,4,'#7a5a8a'],[x-8,Y+18,Z-20,4,10,4,'#7a5a8a'],[x+4,Y+20,Z-20,10,4,4,'#7a5a8a'],[x+10,Y+24,Z-20,4,8,4,'#7a5a8a']);
  G.push([x-1,Y+26,Z-21,6,5,6,'#d9a0ff'],[x-9,Y+28,Z-21,6,5,6,'#d9a0ff'],[x+9,Y+32,Z-21,6,5,6,'#d9a0ff'])}
 if(kind==='pararrayos'){const x=bx(0)+6;L.push([bx(1),Y,Z-6,40,12,12,'#d8c08a'],[bx(1)+4,Y+12,Z-6,8,4,12,'#c9b07a']);G.push([x+1,Y+64,Z-10,3,20,3,'#e0864a'],[x,Y+84,Z-11,5,3,5,'#f0a060'])}
 if(kind==='muelle'){const x=bx(0)+2;L.push([x,Y-2,Z-110,28,3,118,'#a0784a']);for(let k=0;k<5;k++){L.push([x-2,Y-16,Z-104+k*26,4,16,4,'#6b4f2a'],[x+26,Y-16,Z-104+k*26,4,16,4,'#6b4f2a']);L.push([x,Y+1,Z-108+k*24,28,.4,2,'#7a5a36'])}
  const b=s>0?x+40:x-30;L.push([b,Y-6,Z-90,16,6,30,'#8a643a'],[b+2,Y-3,Z-88,12,3.2,26,'#5c3d1e']);G.push([x+26,Y+1,Z-6,4,5,4,'#ffd35c'])}
 return[L,G]}
// Interior del portal del Nether: velo morado translúcido con remolino de píxeles que se desplaza (como en el juego), con
// una textura de 16x16 generada aquí (sin archivo ni casilla nueva en el atlas) y un solo material para todos los portales.
let portalTex=null;const portals=[];
function portalMesh(x,y,z,w,h){if(!portalTex){const c=document.createElement('canvas');c.width=c.height=16;const k=c.getContext('2d');
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){const v=.5+.5*Math.sin(i*.9+Math.sin(j*.7)*2.2+j*.35),q=rnd(i*13+j*7);k.fillStyle=`rgb(${(90+90*v+30*q)|0},${(20+40*v*q)|0},${(170+80*v)|0})`;k.fillRect(i,j,1,1)}
  portalTex=new Tex(c);portalTex.magFilter=portalTex.minFilter=1003;portalTex.generateMipmaps=false;portalTex.wrapS=portalTex.wrapT=1000;portalTex.repeat.set(w/16,h/16);portalTex.needsUpdate=true}
 const p=[[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],uv=[[0,0],[1,0],[1,1],[0,1]],pos=[],nor=[],uvs=[];for(const i of [0,1,2,0,2,3]){pos.push(...p[i]);nor.push(0,0,1);uvs.push(...uv[i])}
 const g=new BufG();g.setAttribute('position',new Attr(new Float32Array(pos),3));g.setAttribute('normal',new Attr(new Float32Array(nor),3));g.setAttribute('uv',new Attr(new Float32Array(uvs),2));
 const m=new MatC({map:portalTex,transparent:true,opacity:.78,emissive:new ColC(0x7a2cff),emissiveMap:portalTex,emissiveIntensity:.9,depthWrite:false});m.side=2;const mesh=new MeshC(g,m);portals.push(m);return mesh}
async function showProps(key,world,side){
 const want=key&&PROPS[key]?`${key}|${side}|${world}`:null;if(propShown===want)return;
 for(const g of Object.values(propCache))g.visible=false;propShown=want;if(!want)return;
 if(!propCache[want]){const def=PROPS[key],z0=PROP_Z[world]??-6,m=new Map();
  for(const [x,y,z,t] of def.b)m.set((side*x+(side<0?-1:0))+','+y+','+(z0+z),t);
  await ensureBlockTextures(m);if(propShown!==want)return;
  const g=m.size?worldMesh(m):new Group(),[L,G]=propExtras(def.x,GY,z0*BK,side);if(L.length)g.add(boxesMesh(L));if(G.length)g.add(boxesMesh(G,0xff8040));if(L.portal)g.add(portalMesh(...L.portal));
  propCache[want]=g;viewer.scene.add(g)}
 propCache[want].visible=true}

// ===== fauna de fondo (scene.fauna): animales de bloques que pasean detrás del personaje =====
// Una malla por animal (cajas de color fusionadas, sin texturas): 2-3 llamadas de dibujo más por escena; en nivel bajo, 2 como
// mucho. Cajas [x, y, z, ancho, alto, fondo, color] en unidades del juego (16 = un bloque), el animal mirando hacia +z.
const legs4=(w,d,h,c)=>[[-w/2,0,-d/2,3,h,3,c],[w/2-3,0,-d/2,3,h,3,c],[-w/2,0,d/2-3,3,h,3,c],[w/2-3,0,d/2-3,3,h,3,c]];
const MOBS={
 ovejas:{n:3,walk:5,body:[...legs4(8,12,6,'#d9c8b4'),[-5,6,-7,10,8,14,'#e9ecec'],[-3,9,6,6,6,6,'#d9c8b4'],[-3.5,12,6.5,7,3,4,'#e9ecec'],[-2,11,12.1,1.5,1.5,.2,'#222222'],[.5,11,12.1,1.5,1.5,.2,'#222222']]},
 vacas:{n:2,walk:4,body:[...legs4(10,14,8,'#3a2a20'),[-6,8,-8,12,9,16,'#4a3426'],[-3,9,-4,6,9.2,6,'#e9e6e0'],[-4,11,7,8,7,6,'#4a3426'],[-3,11,12.6,6,3,.6,'#d9b8a8'],[-5,17,9,2,2,1,'#e0d8c8'],[3,17,9,2,2,1,'#e0d8c8']]},
 gallinas:{n:3,walk:6,body:[[-2,0,0,1,4,1,'#e8b030'],[1,0,0,1,4,1,'#e8b030'],[-3,4,-3,6,5,7,'#f4f4f4'],[-2,8,3,4,5,3,'#f4f4f4'],[-1,9.5,6,2,1.5,2,'#e8a030'],[-1,8,6,2,1.5,1,'#d02020']]},
 lobos:{n:2,walk:7,body:[...legs4(6,10,6,'#c8c8c8'),[-3,6,-6,6,6,12,'#d8d8d8'],[-3,7,6,6,6,5,'#d8d8d8'],[-1.5,7,11,3,3,3,'#b0b0b0'],[-3,13,8,2,2,1,'#d8d8d8'],[1,13,8,2,2,1,'#d8d8d8'],[-1,9,-10,2,2,4,'#d8d8d8']]},
 zorros:{n:2,walk:7,body:[...legs4(6,9,4,'#3a2a20'),[-3,4,-5,6,5,10,'#e07a2a'],[-3,5,5,6,5,4,'#e07a2a'],[-1.5,5,9,3,2,3,'#f4f4f4'],[-3,10,6,2,2,1,'#e07a2a'],[1,10,6,2,2,1,'#e07a2a'],[-2,4,-11,4,4,6,'#e07a2a'],[-1.5,4.5,-13,3,3,2,'#f4f4f4']]},
 conejos:{n:3,walk:9,hop:1,body:[[-2,0,-3,4,4,6,'#a07a50'],[-1.5,3,2,3,3,3,'#a07a50'],[-1.2,6,3,1,3,1,'#a07a50'],[.2,6,3,1,3,1,'#a07a50'],[-1,2,-4,2,2,1,'#f4f4f4']]},
 tortugas:{n:2,walk:1.5,body:[[-5,0,-5,10,3,10,'#3f8a4a'],[-4,3,-4,8,2,8,'#5aa05a'],[-1.5,1,5,3,3,3,'#7fbf6a'],[-6,0,-4,2,1,2,'#7fbf6a'],[4,0,-4,2,1,2,'#7fbf6a'],[-6,0,2,2,1,2,'#7fbf6a'],[4,0,2,2,1,2,'#7fbf6a']]},
 murcielagos:{n:3,fly:1,walk:30,body:[[-1.5,0,-1.5,3,4,3,'#3a2a20'],[-6,2,-1,4.5,.8,3,'#2a1e16'],[1.5,2,-1,4.5,.8,3,'#2a1e16']]},
 ghasts:{n:2,fly:1,walk:5,scale:2.2,body:[[-8,0,-8,16,16,16,'#f0f0f0'],[-6,-8,-6,2,8,2,'#e0e0e0'],[-1,-10,-6,2,10,2,'#e0e0e0'],[4,-7,-6,2,7,2,'#e0e0e0'],[-6,-9,3,2,9,2,'#e0e0e0'],[3,-8,3,2,8,2,'#e0e0e0'],[-5,8,8.1,3,1,.3,'#555555'],[2,8,8.1,3,1,.3,'#555555'],[-2,3,8.1,4,2,.3,'#555555']]},
 endermans:{n:2,walk:2,body:[[-2,0,-1,1.5,14,1.5,'#141414'],[1,0,-1,1.5,14,1.5,'#141414'],[-3,14,-2,6,9,4,'#1b1b1b'],[-6,8,-1,1.5,14,1.5,'#141414'],[4.5,8,-1,1.5,14,1.5,'#141414'],[-4,23,-4,8,8,8,'#1b1b1b']],glow:[[-3,26,4.1,2.5,1,.3,'#d27aff'],[.5,26,4.1,2.5,1,.3,'#d27aff']]},
 gatos:{n:1,walk:3,body:[...legs4(4,8,4,'#e8a050'),[-2,4,-4,4,4,8,'#e8a050'],[-2.5,5,4,5,4,4,'#e8a050'],[-2,9,5,1.5,1.5,1,'#e8a050'],[.5,9,5,1.5,1.5,1,'#e8a050'],[-.5,6,-10,1,1,6,'#e8a050']]},
};
// Zona de paseo por mundo, en bloques: [x mínimo de distancia al centro, x máximo, z de, z a, altura de vuelo de, a]
const FAUNA_ZONA={_:[1.5,7,-11,-6,2,4],cueva:[1,7,-6,-1,2,5],casa:[2,6,-4,-3,0,0],nether:[3,10,-15,-10,8,11],playa:[8,15,-2,5,0,0],end:[2,8,-12,-7,0,0],noche:[1.5,7,-11,-6,3,6]};
const faunaCache=new Map();let faunaShown=null,faunaList=[];
/** Como mucho 3 grupos de animales en memoria: el más viejo se quita de la escena y libera su geometría y material. */
function podarFauna(){while(faunaCache.size>3){const [k,list]=faunaCache.entries().next().value;faunaCache.delete(k);for(const m of list){viewer.scene.remove(m.g);m.g.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.()})}}}
function groundAt(x,z){const u=worldCache[worldShown]?.userData;return GY+(u?.h?u.h(Math.floor(x/BK),Math.floor(z/BK)):0)*BK}
function showFauna(key,world,lado=1){
 const want=key&&MOBS[key]?key+'|'+world+'|'+lado:null;if(faunaShown===want)return;
 for(const f of faunaCache.values())f.forEach(m=>m.g.visible=false);faunaShown=want;faunaList=[];if(!want)return;
 if(!faunaCache.has(want)){const def=MOBS[key],z=FAUNA_ZONA[world]||FAUNA_ZONA._,list=[];
  for(let i=0;i<def.n;i++){const g=new Group(),r=n=>rnd(i*7.3+n+key.length*3.1);g.add(boxesMesh(def.body));if(def.glow)g.add(boxesMesh(def.glow,0xc060ff));g.scale.setScalar(def.scale||1);
   const side=i%3===2?-lado:+lado;list.push({g,def,cx:side*(z[0]+r(1)*(z[1]-z[0]))*BK,cz:(z[2]+r(2)*(z[3]-z[2]))*BK,fy:(z[4]+r(3)*(z[5]-z[4]))*BK,ph:r(4)*6.28,range:(1.5+r(5)*2)*BK,rot:0});viewer.scene.add(g)}
  faunaCache.set(want,list);podarFauna()}else{const l=faunaCache.get(want);faunaCache.delete(want);faunaCache.set(want,l)}
 faunaList=faunaCache.get(want).slice(0,lite()?2:3);faunaList.forEach(m=>m.g.visible=true)}
function stepFauna(t){for(const m of faunaList){const d=m.def;
 if(d.fly){const a=t*(d.walk/(m.range*1.4))+m.ph,x=m.cx+Math.cos(a)*m.range,z=m.cz+Math.sin(a)*m.range*.6;m.g.position.set(x,GY+m.fy+Math.sin(t*1.3+m.ph)*6,z);m.g.rotation.y=-a;if(d.walk>10)m.g.scale.x=(d.scale||1)*(1+.3*Math.sin(t*20+m.ph));continue}
 const a=t*(d.walk/m.range)*.5+m.ph+.6*Math.sin(t*.21+m.ph),x=m.cx+Math.sin(a)*m.range,z=m.cz+Math.sin(a*.5)*BK*.6,vx=Math.cos(a),vz=Math.cos(a*.5)*.3,want=Math.atan2(vx,vz);
 let dr=want-m.rot;dr=Math.atan2(Math.sin(dr),Math.cos(dr));m.rot+=dr*.12;m.g.rotation.y=m.rot;
 const mov=Math.abs(vx),bob=d.hop?Math.abs(Math.sin(a*9))*4*mov:Math.abs(Math.sin(a*14))*.7*mov;m.g.position.set(x,groundAt(x,z)+bob,z)}}

// ===== bucle por fotograma =====
let simT=0,clima=null;
function play(name){const def=ANIMS[name]||ANIMS.idle,pl=host.player;pl.skin.resetJoints();pl.position.set(0,0,0);pl.rotation.set(0,0,0);host.anim=def[1]();host.animKey=ANIMS[name]?name:'idle'}
function frame(dt){simT+=dt;
 if(host.anim)host.anim.update(host.player,dt);
 const arm=host.player.skin.rightArm;
 if(host.item){const hold=HOLD.has(host.animKey),up=hold||host.animKey==='point';if(hold){arm.rotation.x=-1.05+.05*Math.sin(simT*2.38);arm.rotation.z=.42}
  if(up){host.item.rotation.order='ZYX';host.item.rotation.set(-arm.rotation.x,0,-arm.rotation.z)}else{host.item.rotation.order='XYZ';host.item.rotation.set(host.item.userData.block?.3:1.2,0,0)}}
 stepEnter(reduced?0:dt);host.hurt=Math.max(0,host.hurt-dt);tint(host,host.hurt>0);
 const g=worldCache[worldShown];if(g)g.children.forEach(m=>{if(m.userData.drift)m.position.x=((simT*5)%1600)-800});
 stepFauna(simT);if(portalTex&&propShown?.startsWith('portal')){portalTex.offset.y=(simT*.35)%1;portalTex.offset.x=Math.sin(simT*.8)*.06;for(const m of portals)m.opacity=.7+.1*Math.sin(simT*2.3)}camera(dt);viewer.render();oc.drawImage(glc,0,0,W,H);
 const amb=AMBIENT[worldShown],cl=clima&&CLIMA[clima],noct=lookShown?.includes('|noche|')&&!cl&&!amb;
 if(amb||cl||noct){oc.save();oc.scale(W/VW,H/VH);if(amb)amb(oc,simT);if(cl)cl(oc,simT);if(noct)AMBIENT.noche(oc,simT);oc.restore()}}

// ===== interfaz hacia el motor =====
play('idle');
return {
 /** Carga lo que haga falta (mundo, skin, objeto, decorado, fauna) y lo muestra con su plano, hora y clima. */
 async setScene({world,host:who,item,props,shot:sh,enter:en,plano:pl,hora,clima:cl,fauna}={}){const tok=++sceneTok,wk=worldKey(world||theme.defaultWorld||'pradera');
  shot={x:0,zoom:1,yaw:0,height:0,...(sh||{})};const side=(shot.x||0)>.02?-1:1;
  const jobs=[useSkin(who),showWorld(wk,tok,hora,cl),showProps(props,wk,side)];
  if(item&&(ITEM_TEX[item]||BLOCK_TEX[item]))jobs.push(ensureItem(item));
  await Promise.all(jobs);if(tok!==sceneTok)return;
  plano=pl||null;camCur=null;variante=0;clima=cl||null;showFauna(fauna,wk,-side);
  setItem(host,item&&(ITEM_TEX[item]||BLOCK_TEX[item])?item:'');enter=en&&ENTER_DUR[en]&&!reduced?{kind:en,t:0}:null;if(!enter){host.wrap.position.set(0,0,0);host.shadow.position.y=FEET+.15}if(host.item&&host.item.children[0])host.item.position.x=host.slim?-.5:-1},
 play(name){play(name)},
 /** Pequeño cambio de plano entre preguntas (determinista: n = pregunta, seed = número del Tap). La pregunta 3 de la mitad de los
  *  Taps con objeto en la mano es un plano detalle del objeto. */
 plano(n,seed=0){variante=!n?0:(n===2&&host.item&&seed%2===0)?4:1+((seed+n)%3)},
 /** Deja listo (sin mostrar) el siguiente escenario: skin, objeto, malla del mundo y su cielo. Se llama en reposo. */
 async preload({world,host:who,item,hora,clima:cl}={}){const wk=worldKey(world||theme.defaultWorld||'pradera');await Promise.all([loadSkin(who),ensureWorld(wk),item&&(ITEM_TEX[item]||BLOCK_TEX[item])?ensureItem(item):0]);skyCanvasFor(wk,hora,cl==='lluvia')},
 /** Efectos de cámara/cuerpo que el motor dispara con las reacciones. */
 fx(name){if(name==='hurt'){host.hurt=.4;shake=Math.max(shake,.22)}else if(name==='push')push=1;else if(name==='shake')shake=Math.max(shake,.2)},
 frame,
 anchor(name){const y={head:12,top:20,chest:4,feet:-16}[name]??12,p=host.wrap.position;return proj(p.x,y+host.player.position.y+p.y,p.z)},
 /** Corre al personaje en pantalla (fracción del ancho) para hacerle sitio a un objeto que explica. */
 nudge(dx,now){nudgeTo=dx||0;if(now||reduced)nudgeX=nudgeTo},
 setSize(w,h){W=Math.round(w);H=Math.round(h);out.width=W;out.height=H;viewer.setSize(W,H);viewOy=-1;setOy(camCur?.oy||0);if(faunaShown){const k=faunaShown;faunaShown=null;showFauna(...k.split('|'))}},
 dispose(){try{viewer.dispose()}catch{}try{viewer.renderer.forceContextLoss()}catch{}}
};
}
