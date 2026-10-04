import { app } from './app.js';
const port=Number(process.env.PORT||8080);app.listen(port,()=>console.log(`UConnect Node/Express backend listening on http://127.0.0.1:${port}`));
