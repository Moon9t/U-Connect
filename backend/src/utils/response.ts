import { Response } from 'express';
export const ok = <T>(res:Response, data:T, message?:string) => res.json({ data, ...(message ? {message}:{}) });
export const fail = (res:Response, status:number, error:string, message?:string) => res.status(status).json({ error, ...(message ? {message}:{}) });
