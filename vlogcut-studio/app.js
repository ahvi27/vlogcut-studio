'use strict';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const state = { clips: [], style: 'daily', selected: null, busy: '', canceled: false, drag: null };
const media = new Set(), audioSources = new WeakMap();
let ac, music = null, musicURL = null, resultURL = null, importIndex = 0;
let previewToken = 0, frameId, pendingSplit = null;
const undoStack = [], redoStack = [];
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const total = () => state.clips.reduce((n, c) => n + c.end - c.start, 0);
const fmt = n => `${Math.floor(Math.max(0,n)/60)}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
const status = text => $('status').textContent = text;
const busy = () => !!state.busy;
const snapshot = () => ({ clips:state.clips.map(c=>({...c})), style:state.style, selected:state.selected });
function checkpoint(){ undoStack.push(snapshot()); if(undoStack.length>35)undoStack.shift(); redoStack.length=0; }
function invalidate(){ $('download').hidden=true; }
function lock(){
  document.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=busy()||el.dataset.boundary==='true');
  $('cancel').hidden=state.busy!=='playback'&&state.busy!=='export';
  $('cancel').disabled=false;
  $('undo').disabled=busy()||!undoStack.length;
  $('redo').disabled=busy()||!redoStack.length;
  $('removeMusic').disabled=busy()||!music;
  document.querySelectorAll('.clip').forEach(c=>c.draggable=!busy());
}
function begin(task){state.busy=task;++previewToken;lock();}
function finish(){state.busy='';lock();}
function captionsToField(){ $('captions').value=state.clips.map(c=>c.caption).join('\n'); }
function updateStyleButtons(){ document.querySelectorAll('.style').forEach(b=>{const yes=b.dataset.style===state.style;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',yes);}); }
function restore(s){ state.clips=s.clips.map(c=>({...c}));state.style=s.style;state.selected=s.selected;captionsToField();updateStyleButtons();invalidate();render();showSelected(); }
$('undo').onclick=()=>{if(busy()||!undoStack.length)return;redoStack.push(snapshot());restore(undoStack.pop());status('Edit undone.');};
$('redo').onclick=()=>{if(busy()||!redoStack.length)return;undoStack.push(snapshot());restore(redoStack.pop());status('Edit restored.');};
function button(text, label, action, disabled=false){ const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',label);b.title=label;b.onclick=action;b.disabled=disabled;if(disabled)b.dataset.boundary='true';return b; }
function render(){
  $('clips').replaceChildren();
  state.clips.forEach((clip,index)=>{
    const card=document.createElement('div');card.className='clip';card.dataset.id=clip.id;card.draggable=!busy();card.classList.toggle('selected-clip',clip.id===state.selected);
    const img=document.createElement('img');img.src=clip.media.thumb;img.alt=`Clip ${index+1} thumbnail`;img.draggable=false;
    const body=document.createElement('div'),title=document.createElement('div'),meta=document.createElement('div'),controls=document.createElement('div');
    title.className='clip-title';title.textContent=`${String(index+1).padStart(2,'0')} · ${clip.media.file.name}`;
    meta.className='clip-meta';meta.textContent=`${clip.media.duration.toFixed(2)}s source · ${(clip.end-clip.start).toFixed(2)}s in edit`;
    controls.className='controls';
    controls.append(button('▶',`Preview clip ${index+1}`,()=>selectClip(clip.id)),button('↑',`Move clip ${index+1} up`,()=>move(index,-1),index===0),button('↓',`Move clip ${index+1} down`,()=>move(index,1),index===state.clips.length-1));
    ['start','end'].forEach(edge=>{
      const label=document.createElement('label');label.textContent=edge==='start'?'In':'Out';
      const input=document.createElement('input');input.type='number';input.min=0;input.max=clip.media.duration;input.step='.01';input.value=clip[edge].toFixed(2);input.setAttribute('aria-label',`Clip ${index+1} ${edge}`);input.dataset.edge=edge;
      input.onchange=()=>{
        if(busy())return;
        const value=Number(input.value);
        if(!input.value.trim()||!Number.isFinite(value)||value<0||value>clip.media.duration||(edge==='start'?value>=clip.end:value<=clip.start)){
          status('Choose valid source times: In must be earlier than Out.');render();return;
        }
        checkpoint();clip[edge]=value;changed();selectClip(clip.id);
      };
      label.append(input);controls.append(label);
    });
    controls.append(button('Split',`Split clip ${index+1}`,()=>openSplit(clip)),button('↺',`Reset clip ${index+1} to full source`,()=>{if(busy())return;checkpoint();clip.start=0;clip.end=clip.media.duration;changed();selectClip(clip.id);status('Full source range restored.');}),button('×',`Remove clip ${index+1}`,()=>{
      if(busy())return;checkpoint();state.clips=state.clips.filter(c=>c.id!==clip.id);if(state.selected===clip.id)state.selected=state.clips[0]?.id||null;changed();showSelected();
    }));
    card.ondragstart=e=>{if(busy()||e.target.closest('input,button')){e.preventDefault();return;}state.drag=clip.id;e.dataTransfer.setData('text/plain',clip.id);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');};
    card.ondragend=()=>{state.drag=null;card.classList.remove('dragging');};
    card.ondragover=e=>{if(!busy()&&state.drag)e.preventDefault();};
    card.ondrop=e=>{e.preventDefault();if(busy()||!state.drag||state.drag===clip.id)return;const from=state.clips.findIndex(c=>c.id===state.drag),to=state.clips.findIndex(c=>c.id===clip.id);if(from<0||to<0)return;checkpoint();const [moved]=state.clips.splice(from,1);state.clips.splice(to,0,moved);changed();};
    body.append(title,meta,controls);card.append(img,body);$('clips').append(card);
  });
  $('stats').textContent=`${state.clips.length} clips · ${fmt(total())}`;
  $('time').textContent=`0:00 / ${fmt(total())}`;
  $('empty').hidden=state.clips.length>0;$('progress').value=0;
  if(!state.clips.length)ctx.clearRect(0,0,720,1280);
  lock();
}
function pruneMedia(){
  const retained=new Set(state.clips.map(c=>c.media));
  [...undoStack,...redoStack].forEach(s=>s.clips.forEach(c=>retained.add(c.media)));
  for(const resource of [...media])if(!retained.has(resource)){
    resource.video.pause();audioSources.get(resource.video)?.disconnect();resource.video.removeAttribute('src');resource.video.load();URL.revokeObjectURL(resource.url);media.delete(resource);
  }
}
function changed(){captionsToField();invalidate();render();pruneMedia();}
function move(index,delta){if(busy())return;const next=index+delta;if(next<0||next>=state.clips.length)return;checkpoint();[state.clips[index],state.clips[next]]=[state.clips[next],state.clips[index]];changed();showSelected();}
function mediaEvent(element,event,action){
  return new Promise((resolve,reject)=>{
    let timer;
    const cleanup=()=>{clearTimeout(timer);element.removeEventListener(event,ok);element.removeEventListener('error',bad);};
    const ok=()=>{cleanup();resolve();},bad=()=>{cleanup();reject(Error('Unsupported or damaged media. Try an H.264 MP4 or a WebM video.'));};
    element.addEventListener(event,ok,{once:true});element.addEventListener('error',bad,{once:true});
    timer=setTimeout(()=>{cleanup();reject(Error('Media reading timed out. Try a shorter file or another codec.'));},20000);
    try{action?.();}catch(e){cleanup();reject(e);}
  });
}
async function seek(video,time){if(Math.abs(video.currentTime-time)<.003&&video.readyState>=2)return;await mediaEvent(video,'seeked',()=>video.currentTime=time);}
let previewQueue=Promise.resolve();
function selectClip(id){if(busy())return;state.selected=id;document.querySelectorAll('.clip').forEach(c=>c.classList.toggle('selected-clip',c.dataset.id===id));showSelected();}
function showSelected(){
  const token=++previewToken;
  previewQueue=previewQueue.catch(()=>{}).then(async()=>{
    if(token!==previewToken||busy())return;
    const clip=state.clips.find(c=>c.id===state.selected)||state.clips[0];if(!clip)return;
    state.selected=clip.id;await seek(clip.media.video,clip.start);
    if(token===previewToken&&!busy()){const offset=state.clips.slice(0,state.clips.indexOf(clip)).reduce((sum,c)=>sum+c.end-c.start,0);draw(clip,offset);}
  }).catch(e=>{if(token===previewToken)status(e.message);});
  return previewQueue;
}
async function add(fileList){
  if(busy())return;
  const files=Array.from(fileList);if(!files.length)return;
  begin('import');await previewQueue;
  let added=0;const errors=[];checkpoint();
  try{
    for(const file of files){
      if(!file.type.startsWith('video/')&&!/\.(mp4|mov|m4v|webm)$/i.test(file.name)){errors.push(`${file.name}: choose a video file.`);continue;}
      status(`Reading ${file.name}…`);
      const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='auto';video.playsInline=true;video.muted=true;
      try{
        await mediaEvent(video,'loadeddata',()=>{video.src=url;video.load();});
        if(!Number.isFinite(video.duration)||video.duration<=0||!video.videoWidth)throw Error('Cannot read video duration or dimensions.');
        await seek(video,Math.min(.1,video.duration/2));
        const thumb=document.createElement('canvas');thumb.width=90;thumb.height=160;thumb.getContext('2d').drawImage(video,0,0,90,160);
        const resource={file,url,video,duration:video.duration,thumb:thumb.toDataURL('image/jpeg',.8),order:importIndex++};media.add(resource);
        state.clips.push({id:uid(),media:resource,start:0,end:video.duration,caption:''});added++;
      }catch(e){video.removeAttribute('src');video.load();URL.revokeObjectURL(url);errors.push(`${file.name}: ${e.message}`);}
    }
    if(!added)undoStack.pop();
    if(!state.selected)state.selected=state.clips[0]?.id||null;
    $('dupResults').textContent='';changed();
  }finally{finish();}
  await showSelected();
  status(`${added} clip${added===1?'':'s'} added.${errors.length?' '+errors.join(' · '):' Arrange your moments and find your rhythm.'}`);
}
['add','drop','bannerAdd'].forEach(id=>$(id).onclick=()=>{if(!busy())$('files').click();});
$('files').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';add(files);};
['dragenter','dragover'].forEach(name=>$('drop').addEventListener(name,e=>{e.preventDefault();if(!busy())$('drop').classList.add('over');}));
$('drop').ondragleave=()=>$('drop').classList.remove('over');
$('drop').ondrop=e=>{e.preventDefault();$('drop').classList.remove('over');add(e.dataTransfer.files);};
window.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
function openSplit(clip){if(busy())return;pendingSplit=clip.id;$('splitTime').value=((clip.start+clip.end)/2).toFixed(2);$('splitTime').min=clip.start;$('splitTime').max=clip.end;$('splitLabel').textContent=`Source time in seconds · ${clip.start.toFixed(2)}–${clip.end.toFixed(2)}`;$('splitError').textContent='';$('splitDialog').showModal();$('splitTime').select();}
$('closeSplit').onclick=()=>$('splitDialog').close();
$('splitForm').onsubmit=e=>{e.preventDefault();const clip=state.clips.find(c=>c.id===pendingSplit),value=Number($('splitTime').value);if(!clip||!Number.isFinite(value)||value<=clip.start||value>=clip.end){$('splitError').textContent='Choose a time strictly inside the selected range.';return;}checkpoint();const second={...clip,id:uid(),start:value,caption:''};clip.end=value;state.clips.splice(state.clips.indexOf(clip)+1,0,second);$('splitDialog').close();changed();showSelected();status('Clip split. Trim or remove either section to cut out repeated parts.');};
document.querySelectorAll('.style').forEach(b=>b.onclick=()=>{if(busy()||state.style===b.dataset.style)return;checkpoint();state.style=b.dataset.style;updateStyleButtons();invalidate();showSelected();lock();status('Style applied to preview and export. Use the cut button to change pacing.');});
$('auto').onclick=()=>{
  if(busy())return;if(!state.clips.length){status('Add video clips first.');return;}
  checkpoint();const order=$('order').value;
  if(order==='import')state.clips.sort((a,b)=>a.media.order-b.media.order);
  if(order==='name')state.clips.sort((a,b)=>a.media.file.name.localeCompare(b.media.file.name,undefined,{numeric:true}));
  if(order==='date')state.clips.sort((a,b)=>a.media.file.lastModified-b.media.file.lastModified);
  if(order==='short')state.clips.sort((a,b)=>a.media.duration-b.media.duration);
  const lengths=state.clips.map(c=>Math.min(c.end-c.start,{daily:4,quick:2,slow:6}[state.style]));
  const budget=Math.min(Number($('target').value),lengths.reduce((a,b)=>a+b,0));
  let lo=0,hi=Math.max(...lengths);
  for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(lengths.reduce((sum,n)=>sum+Math.min(n,mid),0)>budget)hi=mid;else lo=mid;}
  state.clips.forEach((c,i)=>{const length=Math.min(lengths[i],lo),old=c.end-c.start;c.start+=(old-length)*.18;c.end=c.start+length;});
  changed();showSelected();status(`Suggested ${total().toFixed(1)}s edit. Review each cut. Undo or use ↺ to restore full source ranges.`);
};
$('duplicates').onclick=async()=>{
  if(busy())return;if(!state.clips.length){status('Add clips before comparing files.');return;}
  if(!crypto.subtle){$('dupResults').textContent='Use localhost or HTTPS for duplicate detection.';return;}
  begin('analysis');$('dupResults').textContent='Comparing file contents…';
  try{
    const seen=new Map(),messages=[];let skipped=0;
    const resources=[...new Set(state.clips.map(c=>c.media))];
    const sizes=new Map();resources.forEach(r=>sizes.set(r.file.size,(sizes.get(r.file.size)||0)+1));
    for(const r of resources){
      if(sizes.get(r.file.size)<2)continue;
      if(r.file.size>250*1024*1024){skipped++;continue;}
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await r.file.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
      if(seen.has(hash))messages.push(`“${r.file.name}” is identical to “${seen.get(hash)}”. Remove the extra clip if unwanted.`);else seen.set(hash,r.file.name);
    }
    $('dupResults').textContent=(messages.join(' ')||'No identical files found among checked sources.')+(skipped?` ${skipped} source(s) over 250 MB skipped.`:'')+' Split segments from the same source are not flagged. Repeated speech/scenes need manual review.';
  }catch(e){$('dupResults').textContent=`Could not compare files: ${e.message}`;}finally{finish();}
};
function wrap(text,width){
  const words=text.trim().split(/\s+/),out=[];let line='';
  for(const word of words){let part='';const parts=[];for(const ch of word){if(part&&ctx.measureText(part+ch).width>width){parts.push(part);part=ch;}else part+=ch;}if(part)parts.push(part);
    for(const segment of parts){const test=line?line+' '+segment:segment;if(line&&ctx.measureText(test).width>width){out.push(line);line=segment;}else line=test;}
  }
  if(line)out.push(line);return out;
}
function textOverlay(text,y,hook){
  if(!text.trim())return;let size=hook?48:35,lines;
  do{ctx.font=hook&&state.style!=='quick'?`italic ${size}px Georgia`:`600 ${size}px sans-serif`;lines=wrap(text,530);if(lines.length<=3)break;size-=2;}while(size>=20);
  if(lines.length>3){lines=lines.slice(0,3);let last=lines[2];while(last&&ctx.measureText(last+'…').width>530)last=last.slice(0,-1);lines[2]=last+'…';}
  const lh=size*1.3,height=lines.length*lh+26;ctx.fillStyle='rgba(16,10,22,.58)';ctx.fillRect(65,y,590,height);ctx.fillStyle='#fff6ed';ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,360,y+13+lh*(i+.5)));
}
function draw(clip,elapsed){
  const v=clip.media.video;ctx.fillStyle='#15111d';ctx.fillRect(0,0,720,1280);
  if(v.readyState>=2&&v.videoWidth){const scale=$('fit').value==='cover'?Math.max(720/v.videoWidth,1280/v.videoHeight):Math.min(720/v.videoWidth,1280/v.videoHeight);ctx.filter=state.style==='daily'?'saturate(.88) sepia(.10)':state.style==='slow'?'saturate(.72) contrast(.96)':'contrast(1.08) saturate(1.08)';ctx.drawImage(v,(720-v.videoWidth*scale)/2,(1280-v.videoHeight*scale)/2,v.videoWidth*scale,v.videoHeight*scale);ctx.filter='none';}
  if(elapsed<3)textOverlay($('hook').value,230,true);textOverlay(clip.caption||'',950,false);
}
$('captions').oninput=()=>{if(busy())return;const lines=$('captions').value.split('\n');state.clips.forEach((c,i)=>c.caption=lines[i]||'');invalidate();showSelected();};
['hook','fit'].forEach(id=>$(id).addEventListener('input',()=>{invalidate();showSelected();}));
['audio','volume'].forEach(id=>$(id).addEventListener('input',()=>{invalidate();$('volumeValue').textContent=`${Math.round(Number($('volume').value)*100)}%`;}));
$('guides').onchange=e=>$('safeGuides').hidden=!e.target.checked;
$('chooseMusic').onclick=()=>{if(!busy())$('music').click();};
$('music').onchange=async e=>{
  if(busy())return;const file=e.target.files[0];e.target.value='';if(!file)return;
  begin('music');const next=new Audio(),url=URL.createObjectURL(file);next.preload='auto';next.loop=true;
  try{await mediaEvent(next,'loadeddata',()=>{next.src=url;next.load();});if(!Number.isFinite(next.duration)||next.duration<=0)throw Error('Cannot read audio duration.');
    if(music){music.pause();audioSources.get(music)?.disconnect();music.removeAttribute('src');music.load();}
    if(musicURL)URL.revokeObjectURL(musicURL);music=next;musicURL=url;$('musicName').textContent=file.name;invalidate();status('Music ready. Preview to hear your soundtrack.');
  }catch(err){next.removeAttribute('src');next.load();URL.revokeObjectURL(url);status(`Could not load music: ${err.message}`);}finally{finish();}
};
$('removeMusic').onclick=()=>{if(busy())return;if(music){music.pause();audioSources.get(music)?.disconnect();music.removeAttribute('src');music.load();}if(musicURL)URL.revokeObjectURL(musicURL);music=null;musicURL=null;$('musicName').textContent='Add music from your device';invalidate();lock();status('Music removed.');};
function sourceFor(element){let source=audioSources.get(element);if(!source){source=ac.createMediaElementSource(element);audioSources.set(element,source);}return source;}
function bounded(promise,ms,message){let timeout;return Promise.race([promise,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error(message)),ms))]).finally(()=>clearTimeout(timeout));}
async function run(record){
  if(busy())return;if(!state.clips.length){status('Add at least one video clip first.');return;}
  if(record&&(!canvas.captureStream||!window.MediaRecorder)){status('Export is unavailable in this browser. Try desktop Chrome.');return;}
  const API=window.AudioContext||window.webkitAudioContext;
  if(!API){status('Your browser does not support the audio engine. Try desktop Chrome.');return;}
  // Resume audio synchronously from this user gesture.
  ac=ac||new API();const resumeAudio=ac.resume();begin(record?'export':'playback');state.canceled=false;
  let recorder,stream,dest,gain,musicGain,done,recorderError=null,started=false;
  const chunks=[],sources=[],duration=total();
  if(record)invalidate();
  try{
    await bounded(resumeAudio,5000,'Audio could not start. Click preview again.');await previewQueue;
    dest=ac.createMediaStreamDestination();gain=ac.createGain();gain.gain.value=Number($('audio').value);gain.connect(dest);gain.connect(ac.destination);
    for(const resource of new Set(state.clips.map(c=>c.media))){const source=sourceFor(resource.video);source.disconnect();source.connect(gain);sources.push(source);resource.video.muted=false;}
    if(music){const source=sourceFor(music);source.disconnect();musicGain=ac.createGain();musicGain.gain.value=Number($('volume').value);source.connect(musicGain);musicGain.connect(dest);musicGain.connect(ac.destination);sources.push(source);await seek(music,0);}
    if(record){
      const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
      if(!mime)throw Error('No supported recording format. Try desktop Chrome.');
      stream=canvas.captureStream(30);dest.stream.getAudioTracks().forEach(track=>stream.addTrack(track));recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});
      done=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=e=>{recorderError=e.error||Error('The browser could not record this video.');state.canceled=true;};
    }
    let offset=0;
    for(const clip of state.clips){
      if(state.canceled)break;const v=clip.media.video;state.selected=clip.id;await seek(v,clip.start);if(state.canceled)break;draw(clip,offset);
      // Do not include seeks or loading delays between clips in the output.
      await bounded(v.play(),12000,'Video could not start. Try another format.');
      if(state.canceled){v.pause();break;}
      if(music)await bounded(music.play(),10000,'Music could not start. Remove it or choose another file.');
      if(recorder){if(!started){recorder.start(250);started=true;}else if(recorder.state==='paused')recorder.resume();}
      await new Promise((resolve,reject)=>{
        let last=v.currentTime,lastMovement=performance.now();
        const tick=()=>{
          if(v.error){reject(Error('Video playback failed.'));return;}
          if(state.canceled||v.currentTime>=clip.end||v.ended){v.pause();resolve();return;}
          if(v.currentTime!==last){last=v.currentTime;lastMovement=performance.now();}else if(performance.now()-lastMovement>15000){reject(Error('Video playback stalled. Try a shorter clip or another codec.'));return;}
          const elapsed=Math.min(duration,offset+Math.max(0,v.currentTime-clip.start));draw(clip,elapsed);$('time').textContent=`${fmt(elapsed)} / ${fmt(duration)}`;$('progress').value=elapsed/duration*100;
          status(`${record?'Exporting':'Previewing'} · ${Math.min(100,Math.round(elapsed/duration*100))}%${record?' · Keep this tab visible':''}`);frameId=requestAnimationFrame(tick);
        };tick();
      });
      v.pause();if(music)music.pause();if(recorder?.state==='recording')recorder.pause();offset+=clip.end-clip.start;
    }
    if(recorder&&started){if(recorder.state!=='inactive')recorder.stop();await bounded(done,12000,'The recorder did not finish. Try a shorter export.');if(recorderError)throw recorderError;
      if(!state.canceled){if(!chunks.length)throw Error('No video data was produced.');const blob=new Blob(chunks,{type:recorder.mimeType});if(resultURL)URL.revokeObjectURL(resultURL);resultURL=URL.createObjectURL(blob);const extension=recorder.mimeType.includes('mp4')?'mp4':'webm';$('download').href=resultURL;$('download').download=($('project').value.replace(/[^a-z0-9_-]/gi,'-')||'my-vlog')+'.'+extension;$('download').hidden=false;status(`Export ready · ${(blob.size/1048576).toFixed(1)} MB · ${extension.toUpperCase()}. Download your story below.`);}
    }else if(!record&&!state.canceled)status('Preview complete. Refine your edit or export your story.');
    if(state.canceled)status('Stopped. No partial export was saved.');else{$('progress').value=100;$('time').textContent=`${fmt(duration)} / ${fmt(duration)}`;}
  }catch(e){if(record)invalidate();status(`Could not finish: ${e.message}`);}
  finally{
    cancelAnimationFrame(frameId);media.forEach(r=>{r.video.pause();r.video.muted=true;});music?.pause();
    if(recorder&&started&&recorder.state!=='inactive'){recorder.stop();try{await bounded(done,5000,'Cleanup timeout');}catch{}}
    sources.forEach(s=>{try{s.disconnect();}catch{}});gain?.disconnect();musicGain?.disconnect();stream?.getTracks().forEach(t=>t.stop());dest?.stream.getTracks().forEach(t=>t.stop());finish();
  }
}
$('play').onclick=()=>run(false);$('export').onclick=()=>run(true);$('cancel').onclick=()=>{state.canceled=true;status('Stopping…');};
$('save').onclick=()=>{
  if(busy())return;
  const plan={version:2,project:$('project').value,style:state.style,hook:$('hook').value,frame:$('fit').value,originalAudio:Number($('audio').value),musicVolume:Number($('volume').value),music:music?$('musicName').textContent:null,clips:state.clips.map(c=>({file:c.media.file.name,start:c.start,end:c.end,caption:c.caption})),note:'Reference plan only. Media is not included. This file does not restore a project.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='vlogcut-edit-plan.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Edit plan downloaded for reference. Keep your original videos too.');
};
$('guideBtn').onclick=()=>$('guide').showModal();$('mobileGuide').onclick=()=>$('guide').showModal();$('closeGuide').onclick=()=>$('guide').close();
function scrollTo(id){$(id).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
$('studioNav').onclick=()=>scrollTo('footage');$('stylesNav').onclick=()=>scrollTo('presets');
document.addEventListener('keydown',e=>{if(busy()||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click();}});
window.addEventListener('beforeunload',e=>{if(state.clips.length||busy()){e.preventDefault();e.returnValue='';}});
render();
