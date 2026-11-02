/* Contact files stay on this device until selected contacts are sent in chat. */
(()=>{"use strict";
function decode(value){return value.replace(/\\[nN]/g," ").replace(/\\([,;\\])/g,"$1").trim()}
function parse(text){
 const cards=String(text).replace(/\r\n/g,"\n").replace(/\n[ \t]/g,"").match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi)||[];
 const result=[];
 for(const card of cards){let name="",fallback="",tel=[];
  for(const line of card.split(/\r?\n/)){const i=line.indexOf(":");if(i<0)continue;
   const key=line.slice(0,i).split(";")[0].split(".").pop().toUpperCase(),value=decode(line.slice(i+1));
   if(key==="FN")name=value;
   if(key==="N")fallback=value.split(";").filter(Boolean).join(" ");
   if(key==="TEL"){let phone=value.replace(/^tel:/i,"");try{phone=decodeURIComponent(phone)}catch{}if(phone.replace(/\D/g,"").length>=7)tel.push(phone.slice(0,40))}
  }
  tel=[...new Set(tel)];if(tel.length)result.push({name:[(name||fallback||"Contact").slice(0,100)],tel});
 }
 return result;
}
globalThis.MMAContactFile491={parse};
})();
