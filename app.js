const L='ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function renderSummary(text){
  const el=document.getElementById('sum-tx');
  // Split on [IMG:...] tags
  const parts=text.split(/\[IMG:(.*?)\]/g);
  el.innerHTML='';
  for(let i=0;i<parts.length;i++){
    if(i%2===0){
      // plain text segment (may contain \n\n)
      if(parts[i].trim()){
        const p=document.createElement('p');
        p.style.cssText='margin:0 0 10px;white-space:pre-wrap';
        p.textContent=parts[i].replace(/^\\n\\n|^\n\n/,'').trimStart();
        el.appendChild(p);
      }
    } else {
      // image: format is "img:image/png|base64data"
      const raw=parts[i];
      if(raw.startsWith('img:')){
        const inner=raw.slice(4);
        const pipe=inner.indexOf('|');
        const mime=inner.slice(0,pipe);
        const b64=inner.slice(pipe+1);
        const img=document.createElement('img');
        img.src='data:'+mime+';base64,'+b64;
        img.style.cssText='max-width:100%;border-radius:8px;border:1px solid var(--bd);background:#fff;margin-top:10px;display:block';
        el.appendChild(img);
      }
    }
  }
}
let queue=[],idx=0,sel=[],answered=false,results=[],mode='all';
let practicePool=null;

function selMode(m,btn){mode=m;document.querySelectorAll('.mode').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');}
function shuffle(a){const r=[...a];for(let i=r.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[r[i],r[j]]=[r[j],r[i]];}return r;}
function show(id){document.getElementById(id).style.display='block';}
function hide(id){document.getElementById(id).style.display='none';}

function goHome(){showStart();}

function startQuiz(){
  let pool;
  if(mode==='all') pool=[...QS];
  else if(mode==='60') pool=shuffle([...QS]).slice(0,60);
  else if(mode==='20') pool=shuffle([...QS]).slice(0,20);
  else if(mode==='practice'){
    if(!practicePool||!practicePool.length){alert('Complete a quiz first to unlock Practice mode!');return;}
    pool=shuffle([...practicePool]);
  }
  queue=pool;idx=0;results=[];sel=[];answered=false;
  show('quiz');hide('start');hide('score');hide('review');
  document.getElementById('stats').style.display='flex';
  updateStats();renderQ();
}

function showStart(){
  show('start');hide('quiz');hide('score');hide('review');
  document.getElementById('stats').style.display='none';
  document.getElementById('pf').style.width='0%';
  const pb=document.getElementById('btn-practice');
  if(practicePool&&practicePool.length){
    pb.style.display='block';
    document.getElementById('practice-count').textContent=practicePool.length+' questions';
  } else {
    pb.style.display='none';
  }
}

function renderQ(){
  const q=queue[idx];
  if(!q){showScore();return;}
  answered=false;sel=[];
  const isMulti=q.correct&&q.correct.length>1;

  document.getElementById('qpos').textContent='Q'+(idx+1)+' / '+queue.length;
  document.getElementById('qorig').textContent='Original #'+q.num;
  document.getElementById('qmulti').style.display=isMulti?'inline':'none';

  // Render question text with code formatting
  const qtxEl=document.getElementById('qtx');
  qtxEl.innerHTML=q.question.replace(/`([^`]+)`/g,'<code>$1</code>');

  // Handle exhibit display
  const exDiv=document.getElementById('qexhibit');
  exDiv.innerHTML='';
  if(q.exhibit){
    if(q.exhibit.startsWith('img:')){
      const parts=q.exhibit.slice(4).split('|');
      const mimeType=parts[0]; const b64=parts[1];
      const label=document.createElement('div');label.className='exhibit-label';label.textContent='📷 Exhibit';
      const img=document.createElement('img');img.className='exhibit-img';img.src='data:'+mimeType+';base64,'+b64;
      exDiv.appendChild(label);exDiv.appendChild(img);
    } else if(q.exhibit.startsWith('imgs:')){
      const label=document.createElement('div');label.className='exhibit-label';label.textContent='📷 Exhibit';
      exDiv.appendChild(label);
      const imgList=q.exhibit.slice(5).split('||');
      imgList.forEach(function(entry){
        const parts=entry.split('|');
        const img=document.createElement('img');img.className='exhibit-img';img.src='data:'+parts[0]+';base64,'+parts[1];
        exDiv.appendChild(img);
      });
    } else if(q.exhibit.startsWith('desc:')){
      const label=document.createElement('div');label.className='exhibit-label';label.textContent='📋 Exhibit';
      const desc=document.createElement('div');desc.className='exhibit-desc';desc.textContent=q.exhibit.slice(5);
      exDiv.appendChild(label);exDiv.appendChild(desc);
    }
  }

  const optsDiv=document.getElementById('opts');optsDiv.innerHTML='';
  if(q.options&&q.options.length){
    q.options.forEach(function(opt,i){
      const btn=document.createElement('button');btn.className='opt';
      const top=document.createElement('div');top.className='opt-top';
      const ltr=document.createElement('span');ltr.className='oltr';ltr.textContent=L[i];
      const tx=document.createElement('span');tx.className='otx';tx.innerHTML=opt.replace(/`([^`]+)`/g,'<code>$1</code>');
      top.appendChild(ltr);top.appendChild(tx);
      const expDiv=document.createElement('div');expDiv.className='opt-exp';
      expDiv.textContent=(q.opt_explanations&&q.opt_explanations[i])?q.opt_explanations[i]:'';
      btn.appendChild(top);btn.appendChild(expDiv);
      btn.addEventListener('click',function(){toggleOpt(i,btn,isMulti);});
      optsDiv.appendChild(btn);
    });
  }

  document.getElementById('rbanner').className='rbanner';
  document.getElementById('summary').className='summary';
  document.getElementById('btnback').style.display=idx>0?'inline-flex':'none';
  if(q.is_match){
    document.getElementById('opts').innerHTML='';
    document.getElementById('btncheck').style.display='none';
    document.getElementById('btnnext').style.display='inline-flex';
    document.getElementById('rbanner').className='rbanner show rm';
    document.getElementById('rbanner').innerHTML='📋 Match question — review the correct mapping above';
    answered=true;
    results.push({q:q,correct:true,skipped:false});
    updateStats();
  } else {
    document.getElementById('btncheck').style.display='inline-flex';
    document.getElementById('btncheck').disabled=true;
    document.getElementById('btnnext').style.display='none';
  }
  if(q.show_summary&&q.summary){renderSummary(q.summary);document.getElementById('summary').className='summary show';}
  document.getElementById('pf').style.width=(idx/queue.length*100)+'%';
}

function toggleOpt(i,btn,isMulti){
  if(answered)return;
  if(isMulti){
    if(sel.includes(i)){sel=sel.filter(x=>x!==i);btn.classList.remove('sel');}
    else{sel.push(i);btn.classList.add('sel');}
  } else {
    document.querySelectorAll('.opt').forEach(b=>b.classList.remove('sel'));
    sel=[i];btn.classList.add('sel');
  }
  document.getElementById('btncheck').disabled=sel.length===0;
}

function checkAnswer(){
  if(answered)return;
  const q=queue[idx];answered=true;
  const corr=[...q.correct].sort((a,b)=>a-b);
  const user=[...sel].sort((a,b)=>a-b);
  const full=JSON.stringify(user)===JSON.stringify(corr);
  const partial=!full&&user.some(i=>q.correct.includes(i));
  document.querySelectorAll('.opt').forEach(function(btn,i){
    btn.disabled=true;
    const top=btn.querySelector('.opt-top');
    const expDiv=btn.querySelector('.opt-exp');
    const isc=q.correct.includes(i),isu=sel.includes(i);
    if(isc){btn.className='opt cr';const ic=document.createElement('span');ic.className='oico';ic.textContent='✓';top.appendChild(ic);}
    else if(isu){btn.className='opt wr';const ic=document.createElement('span');ic.className='oico';ic.textContent='✗';top.appendChild(ic);}
    else btn.className='opt dim';
    if(expDiv&&expDiv.textContent.trim())expDiv.className='opt-exp show';
  });
  const rb=document.getElementById('rbanner');
  if(full){rb.className='rbanner show rc';rb.textContent='✓ Correct!';}
  else if(partial){const m=corr.filter(i=>!user.includes(i)).map(i=>L[i]).join(', ');rb.className='rbanner show rp';rb.textContent='Partial — also needed: '+m;}
  else{rb.className='rbanner show rw';rb.textContent='✗ Wrong — correct: '+corr.map(i=>L[i]).join(', ');}
  if(q.summary){renderSummary(q.summary);document.getElementById('summary').className='summary show';}
  document.getElementById('btncheck').style.display='none';
  document.getElementById('btnnext').style.display='inline-flex';
  results.push({q:q,correct:full,skipped:false});
  updateStats();
}

function skipQ(){
  if(answered)return;
  const q=queue[idx];answered=true;
  document.querySelectorAll('.opt').forEach(function(btn,i){
    btn.disabled=true;
    const top=btn.querySelector('.opt-top');
    const expDiv=btn.querySelector('.opt-exp');
    if(q.correct.includes(i)){btn.className='opt cr';const ic=document.createElement('span');ic.className='oico';ic.textContent='✓';top.appendChild(ic);}
    else btn.className='opt dim';
    if(expDiv&&expDiv.textContent.trim())expDiv.className='opt-exp show';
  });
  const rb=document.getElementById('rbanner');rb.className='rbanner show rp';
  rb.textContent='⏭ Skipped — correct: '+q.correct.map(i=>L[i]).join(', ');
  if(q.summary){renderSummary(q.summary);document.getElementById('summary').className='summary show';}
  results.push({q:q,correct:false,skipped:true});
  document.getElementById('btncheck').style.display='none';
  document.getElementById('btnnext').style.display='inline-flex';
  updateStats();
}

function goBack(){
  if(idx===0)return;
  if(results.length>0)results.pop();
  idx--;updateStats();renderQ();
}
function nextQ(){idx++;if(idx>=queue.length)showScore();else renderQ();}

function updateStats(){
  const sc=results;
  document.getElementById('sc').textContent=sc.filter(r=>r.correct===true).length;
  document.getElementById('sw').textContent=sc.filter(r=>r.correct===false&&!r.skipped).length;
  document.getElementById('ss').textContent=sc.filter(r=>r.skipped).length;
  document.getElementById('sm').textContent=sc.filter(r=>r.q&&r.q.correct&&r.q.correct.length>1).length;
}

function showScore(){
  hide('quiz');show('score');
  const sc=results;
  const c=sc.filter(r=>r.correct===true).length;
  const w=sc.filter(r=>r.correct===false&&!r.skipped).length;
  const s=sc.filter(r=>r.skipped).length;
  const m=sc.filter(r=>r.q&&r.q.correct&&r.q.correct.length>1).length;
  const total=sc.length;
  const pct=total>0?Math.round((c/total)*100):0;
  document.getElementById('spct').textContent=pct+'%';
  document.getElementById('snc').textContent=c;
  document.getElementById('snw').textContent=w;
  document.getElementById('sns').textContent=s;
  document.getElementById('snm').textContent=m;
  const ring=document.getElementById('sring'),ttl=document.getElementById('sttl'),det=document.getElementById('sdet');
  if(pct>=83){ring.className='sring spass';ttl.textContent='Exam Ready! 🎉';det.textContent=pct+'% — Above the ~83% CCNA passing threshold. Excellent!';}
  else if(pct>=65){ring.className='sring sclose';ttl.textContent='Almost There 💪';det.textContent=pct+'% — Getting close. Review wrong answers and try again.';}
  else{ring.className='sring sfail';ttl.textContent='Keep Going 📚';det.textContent=pct+'% — Review the explanations carefully. You\'ve got this!';}
  document.getElementById('pf').style.width='100%';
  document.getElementById('scorenote').textContent='Scored: '+c+'/'+total+' questions answered';
  const seen=new Set();
  practicePool=results.filter(r=>!r.correct).map(r=>r.q).filter(q=>{
    const k=q.num;
    if(seen.has(k))return false;seen.add(k);return true;
  });
  const pb=document.getElementById('btn-practice');
  if(practicePool.length){
    pb.style.display='block';
    document.getElementById('practice-count').textContent=practicePool.length+' questions';
  }
}

function showReview(){
  hide('score');show('review');
  const list=document.getElementById('revlist');list.innerHTML='';
  const wrong=results.filter(r=>!r.correct);
  if(!wrong.length){list.innerHTML='<p style="color:var(--mu);text-align:center;padding:40px">No wrong answers! 🎉</p>';return;}
  wrong.forEach(function(r){
    const q=r.q;
    const item=document.createElement('div');item.className='rev-item';
    const ct=q.correct.map(i=>L[i]+'. '+(q.options&&q.options[i]?q.options[i].substring(0,60):'')).join(' | ');
    const inner=document.createElement('div');inner.className='rev-inner';
    const st=document.createElement('span');st.className='rev-st';st.textContent=r.skipped?'⏭':'✗';
    const info=document.createElement('div');info.className='rev-info';
    const qnum=document.createElement('div');qnum.className='rev-qnum';
    qnum.textContent='Original Q'+q.num;
    const qtx=document.createElement('div');qtx.className='rev-qtx';qtx.textContent=q.question.substring(0,120)+(q.question.length>120?'...':'');
    const ans=document.createElement('div');ans.className='rev-ans';ans.id='ra'+q.num;
    ans.textContent='✓ '+ct+(q.summary?' — '+q.summary.substring(0,100)+'...':'');
    info.appendChild(qnum);info.appendChild(qtx);info.appendChild(ans);
    inner.appendChild(st);inner.appendChild(info);item.appendChild(inner);
    item.addEventListener('click',function(){document.getElementById('ra'+q.num).classList.toggle('open');});
    list.appendChild(item);
  });
}

document.getElementById('fyear').textContent=new Date().getFullYear();
