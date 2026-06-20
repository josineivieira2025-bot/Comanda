export const asyncHandler=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
export const publicUser=user=>({id:user.id,name:user.name,email:user.email,role:user.role,restaurantId:user.restaurantId,permissions:user.permissions||[],active:user.active});
