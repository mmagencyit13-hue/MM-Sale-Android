(() => {
 'use strict';
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/^\s*m\s*[/.]\s*s\.?\s*|^\s*ms\s+/i,'').replace(/\b(shree|sri|shri)\b/g,'shri').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 function distance(a,b){if(a===b)return 0;if(Math.abs(a.length-b.length)>1)return 2;let i=0,j=0,errors=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errors>1)return 2;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}return errors+(i<a.length||j<b.length?1:0);}
 function rank(rows,query,label=r=>r.name||r.company_name||''){
  const q=normalize(query);if(!q)return rows;const exact=rows.filter(r=>normalize(label(r))===q);if(exact.length)return exact;
  const tokens=q.split(' ');return rows.map(r=>{const name=normalize(label(r)),words=name.split(' ');let pos=0,score=0;for(const t of tokens){let best=-1;for(let i=pos;i<words.length;i++){if(words[i]===t||words[i].startsWith(t)||(t.length>=4&&words[i].length>=4&&distance(words[i],t)<=1)){best=i;break;}}if(best<0)return null;score+=best-pos+(words[best]===t?0:1);pos=best+1;}return{r,score:score+(words.length-tokens.length)*.1};}).filter(Boolean).sort((a,b)=>a.score-b.score||label(a.r).localeCompare(label(b.r))).map(x=>x.r);
 }
 const variants=v=>[...new Set([String(v),String(v).replace(/\bshree\b/ig,'shri').replace(/\bsri\b/ig,'shri'),String(v).replace(/\bshri\b/ig,'shree')])];
 window.MMAPartySearch630={normalize,rank,variants};
})();
