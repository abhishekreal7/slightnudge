const cp=require('child_process'),fs=require('fs');const root='C:/dev/vibecheck-load-lab-20261101',dir='docs/editor-load-and-toolbar';
const children=[];
for(const [port,cwd] of [[3000,root],[3001,root+'/.slightnudge/repositories/m0-control-lab'],[3002,root+'/.slightnudge/repositories/m0-overfit-lab']]){
 const fd=fs.openSync(`${dir}/server-${port}-bound.log`,'a');
 const child=cp.spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd,env:{...process.env,SLIGHTNUDGE_LEGACY_STUDIO:'1'},windowsHide:true,stdio:['ignore',fd,fd]});children.push(child);console.log('SERVER',port,child.pid);child.on('exit',code=>console.log('EXIT',port,code));
}
Promise.all(children.map(child=>new Promise(resolve=>child.once('exit',resolve)))).then(()=>console.log('SERVERS CLOSED'));
