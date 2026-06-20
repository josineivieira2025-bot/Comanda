import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { HttpError, publicUser } from '../lib/http.js';

export async function auth(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return next(new HttpError(401, 'Token não informado'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user?.active) return next(new HttpError(401, 'Usuário desativado'));
    req.user = publicUser(user);
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    next(new HttpError(401, 'Token inválido ou expirado'));
  }
}

const resourceByBaseUrl = { '/api/catalog': 'menu', '/api/stock': 'stock', '/api/settings': 'settings', '/api/tables': 'tables', '/api/command-cards': 'tables', '/api/finance': 'finance' };

export const roles = (...allowed) => (req, _res, next) => {
  const resource = resourceByBaseUrl[req.baseUrl];
  if (allowed.includes(req.user.role) || req.user.role === 'ADMIN' || (resource && req.user.permissions.includes(`${resource}.edit`))) return next();
  next(new HttpError(403, 'Perfil sem permissão'));
};

export const permit = (...required) => (req, _res, next) => {
  if (req.user.role === 'ADMIN' || required.some(permission => req.user.permissions.includes(permission))) return next();
  next(new HttpError(403, 'Você não tem permissão para esta ação'));
};

export const moduleAccess = (viewPermissions, editPermission) => (req, _res, next) => {
  if (req.user.role === 'ADMIN') return next();
  const required = req.method === 'GET' ? viewPermissions : [editPermission];
  if (required.some(permission => req.user.permissions.includes(permission))) return next();
  next(new HttpError(403, 'Você não tem permissão para este módulo'));
};
