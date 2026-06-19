import jwt from 'jsonwebtoken';import { HttpError } from '../lib/http.js';
export function auth(req,_res,next){const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token)return next(new HttpError(401,'Token não informado'));try{req.user=jwt.verify(token,process.env.JWT_SECRET);next()}catch{next(new HttpError(401,'Token inválido ou expirado'))}}
export const roles=(...allowed)=>(req,_res,next)=>allowed.includes(req.user.role)?next():next(new HttpError(403,'Perfil sem permissão'));
