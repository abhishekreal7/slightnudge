// Read-only diagnostics: preserve returned bytes and thrown errors exactly.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const read = fs.readFileSync;
const manifest = file => String(file).includes('.next') && String(file).endsWith('build-manifest.json');
const log = (event, file, extra = {}) => process.stderr.write('NEXT_MANIFEST_IO ' + JSON.stringify({event,file:String(file),pid:process.pid,time:Date.now(),...extra}) + '\n');
const write = fs.writeFile;
fs.writeFile = function(file, data, ...args) {
  if (!manifest(file)) return write.call(this,file,data,...args);
  log('write-start',file,{bytes:Buffer.byteLength(data),stack:new Error().stack});
  const callback = args.pop();
  return write.call(this,file,data,...args,function(error,...values){log('write-end',file,{error:error?.message});return callback.call(this,error,...values);});
};
fs.readFileSync = function (file, ...args) {
  const value = read.call(this, file, ...args);
  if (manifest(file)) log('read',file,{bytes:Buffer.byteLength(value)});
  if (String(file).includes('.next') && String(file).endsWith('.json')) {
    const body = String(value);
    try { JSON.parse(body); } catch {
      process.stderr.write('INVALID_NEXT_MANIFEST ' + JSON.stringify({file:String(file),bytes:Buffer.byteLength(body),body:body.slice(0,200),stack:new Error().stack}) + '\n');
    }
  }
  return value;
};
syncBuiltinESMExports();
