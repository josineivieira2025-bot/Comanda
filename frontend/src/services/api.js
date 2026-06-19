const BASE=import.meta.env.VITE_API_URL||'http://localhost:3001/api';
export const getToken=()=>localStorage.getItem('orbe.token');
export const setToken=token=>token?localStorage.setItem('orbe.token',token):localStorage.removeItem('orbe.token');
export async function api(path,options={}){const headers={'Content-Type':'application/json',...options.headers};const token=getToken();if(token)headers.Authorization=`Bearer ${token}`;const response=await fetch(`${BASE}${path}`,{...options,headers,body:options.body&&typeof options.body!=='string'?JSON.stringify(options.body):options.body});if(response.status===204)return null;const data=await response.json().catch(()=>({}));if(!response.ok){if(response.status===401)setToken(null);throw new Error(data.message||'Falha na comunicação com a API')}return data}
export const publicApi=(path,options={})=>api(`/public${path}`,options);
