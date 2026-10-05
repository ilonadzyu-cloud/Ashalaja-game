import {SAVE_NAMESPACE} from './config.js?v=070';

const DB_NAME='des-ne-tam-persistence';
const STORE='saves';
const AUTO=r=>`${SAVE_NAMESPACE}:run:${r}:auto`;
const MANUAL=(r,s)=>`${SAVE_NAMESPACE}:run:${r}:manual:${s}`;
const CHAPTER=(r,c)=>`${SAVE_NAMESPACE}:run:${r}:chapter:${c}`;
function localGet(key){try{return window.localStorage.getItem(key)}catch{return null}}
function localSet(key,value){try{window.localStorage.setItem(key,value);return true}catch{return false}}
function localDel(key){try{window.localStorage.removeItem(key);return true}catch{return false}}
function openDb(){
  if(typeof indexedDB==='undefined')return Promise.resolve(null);
  return new Promise(resolve=>{try{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null)}catch{resolve(null)}});
}
async function idbGet(key){const db=await openDb();if(!db)return null;return new Promise(resolve=>{try{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>resolve(null)}catch{resolve(null)}})}
async function idbSet(key,value){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const req=db.transaction(STORE,'readwrite').objectStore(STORE).put(value,key);req.onsuccess=()=>resolve(true);req.onerror=()=>resolve(false)}catch{resolve(false)}})}
async function idbDel(key){const db=await openDb();if(!db)return false;return new Promise(resolve=>{try{const req=db.transaction(STORE,'readwrite').objectStore(STORE).delete(key);req.onsuccess=()=>resolve(true);req.onerror=()=>resolve(false)}catch{resolve(false)}})}
export async function persistentRead(key){const local=localGet(key);if(local!==null)return local;const mirror=await idbGet(key);if(mirror!==null)localSet(key,mirror);return mirror}
export async function persistentWrite(key,value){const a=localSet(key,value);const b=await idbSet(key,value);return{localStorage:a,indexedDB:b}}
export async function persistentDelete(key){localDel(key);await idbDel(key)}
export function emergencyLocalWrite(key,value){return localSet(key,value)}
export async function storageCapabilities(){const probe=`${SAVE_NAMESPACE}:probe:${Date.now()}`;const result=await persistentWrite(probe,'ok');const read=await persistentRead(probe);await persistentDelete(probe);return{...result,readBack:read==='ok'}}
export async function loadRun(run){try{const raw=await persistentRead(AUTO(run));return raw?JSON.parse(raw):null}catch{return null}}
export async function listRuns(){const out=[];for(let run=1;run<=3;run++)out.push({run,state:await loadRun(run)});return out}
export async function saveRun(state){state.updatedAt=Date.now();state.lastAutosaveAt=state.updatedAt;const result=await persistentWrite(AUTO(state.runId),JSON.stringify(state));return{at:state.lastAutosaveAt,...result}}
export function emergencySaveRun(state){state.updatedAt=Date.now();state.lastAutosaveAt=state.updatedAt;return emergencyLocalWrite(AUTO(state.runId),JSON.stringify(state))}
export async function clearRun(run){await persistentDelete(AUTO(run));for(let i=1;i<=3;i++)await persistentDelete(MANUAL(run,i));for(let c=1;c<=20;c++)await persistentDelete(CHAPTER(run,c))}

export async function saveChapterCheckpoint(state,chapter=state?.chapter){if(!state||!chapter)return null;const snap=JSON.parse(JSON.stringify(state));snap.chapter=Number(chapter);snap.story={...(snap.story||{}),chapter:Number(chapter)};return persistentWrite(CHAPTER(state.runId,chapter),JSON.stringify(snap))}
export async function loadChapterCheckpoint(run,chapter){try{const raw=await persistentRead(CHAPTER(run,chapter));return raw?JSON.parse(raw):null}catch{return null}}
export async function hasChapterCheckpoint(run,chapter){return Boolean(await loadChapterCheckpoint(run,chapter))}
export async function listChapterCheckpoints(run,maxChapter=20){const out=[];for(let chapter=1;chapter<=maxChapter;chapter++){const state=await loadChapterCheckpoint(run,chapter);if(state)out.push({chapter,state})}return out}
export async function clearChapterCheckpointsAfter(run,chapter){for(let c=Number(chapter||0)+1;c<=20;c++)await persistentDelete(CHAPTER(run,c))}

export async function saveManual(state,slot){
  const snapshot=JSON.parse(JSON.stringify(state));
  snapshot.__chapterCheckpoint=await loadChapterCheckpoint(state.runId,Number(state.chapter||state.story?.chapter||1));
  return persistentWrite(MANUAL(state.runId,slot),JSON.stringify(snapshot));
}
export async function loadManual(run,slot){try{const raw=await persistentRead(MANUAL(run,slot));return raw?JSON.parse(raw):null}catch{return null}}
export async function listManual(run){const out=[];for(let slot=1;slot<=3;slot++)out.push({slot,state:await loadManual(run,slot)});return out}
export const saveKeys={AUTO,MANUAL,CHAPTER};
