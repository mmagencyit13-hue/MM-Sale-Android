/* V514: preserve native delete UI, confirmations, refresh and error handling. */
(()=>{'use strict';const nativeRpc=sb.rpc.bind(sb);sb.rpc=function(name,args,options){return nativeRpc(name==='erp_delete_transaction'?'erp514_delete_transaction':name,args,options)}})();
