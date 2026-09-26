import { TOVATI_CONFIG } from '../config/runtime-config.js';

export class RealtimeClient{
  constructor(){
    this.socket=null;
    this.handlers=new Map();
    this.retry=0;
    this.closedManually=false;
  }

  connect(){
    if(TOVATI_CONFIG.mode!=='company-server'||!TOVATI_CONFIG.realtimeEnabled) return;
    this.closedManually=false;
    const url=new URL(TOVATI_CONFIG.realtimePath,location.origin);
    url.protocol=location.protocol==='https:'?'wss:':'ws:';
    this.socket=new WebSocket(url.toString());

    this.socket.onopen=()=>{this.retry=0;};
    this.socket.onmessage=(event)=>{
      let message;
      try{message=JSON.parse(event.data);}catch{return;}
      for(const fn of this.handlers.get(message.topic)||[]) fn(message);
      for(const fn of this.handlers.get('*')||[]) fn(message);
    };
    this.socket.onclose=()=>{
      if(this.closedManually) return;
      const delay=Math.min(10000,500*(2**this.retry++));
      setTimeout(()=>this.connect(),delay);
    };
  }

  on(topic,handler){
    if(!this.handlers.has(topic)) this.handlers.set(topic,new Set());
    this.handlers.get(topic).add(handler);
    return()=>this.handlers.get(topic)?.delete(handler);
  }

  close(){
    this.closedManually=true;
    this.socket?.close();
  }
}
