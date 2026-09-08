import {build} from 'esbuild';
await build({entryPoints:['src/experience-beam.jsx'],bundle:true,minify:true,format:'esm',define:{'process.env.NODE_ENV':'"production"'},outfile:'public/experience-beam.js'});
