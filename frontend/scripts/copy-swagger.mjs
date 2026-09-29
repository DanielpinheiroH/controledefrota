import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('public/api-docs',{recursive:true});
for(const name of ['swagger-ui-bundle.js','swagger-ui.css'])await copyFile(`node_modules/swagger-ui-dist/${name}`,`public/api-docs/${name}`);
