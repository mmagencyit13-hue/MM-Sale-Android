(()=>{"use strict";
// Print override is presentation only; never changes the saved company tag.
window.MMACommissionProfile592=function(bill){
 const override=document.getElementById("commissionPrintCompany")?.value||"";
 const saved=bill?window.v289BillCompany(bill):{};
 const id=override||saved.id||"";
 const profile=v39Profiles.find(p=>String(p.id)===String(id))||(!override&&saved.name?v39Profiles.find(p=>String(p.company_name).trim().toLowerCase()===String(saved.name).trim().toLowerCase()):undefined);
 if(!profile)return profile;
 const address=String(profile.address||"");
 const sameOffice=/jaipur/i.test(address)&&/B[ -]?21/i.test(address)&&/GTC|Golcha|M\s*I\s*ROAD/i.test(address);
 return sameOffice?{...profile,address:"GF-B-21, Golcha Trade Centre near Police control room M.I. road Jaipur"}:profile;
};
const select=document.getElementById("commissionPrintCompany");
if(select){select.options[0].textContent="Bill company (default)";select.title="Optional print override only; bills remain visible";}
})();
