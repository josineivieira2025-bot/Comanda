import { seed } from '../data/seed';
const KEY='orbe.restaurant.v1';
export function loadData(){try{const value=localStorage.getItem(KEY);return value?JSON.parse(value):structuredClone(seed)}catch{return structuredClone(seed)}}
export function saveData(data){localStorage.setItem(KEY,JSON.stringify(data))}
export function resetData(){localStorage.removeItem(KEY);return structuredClone(seed)}
