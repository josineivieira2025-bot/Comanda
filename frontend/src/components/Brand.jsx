import { ChefHat } from 'lucide-react';

export default function Brand({ children }) {
  return <div className="brand">
    <div className="brand-symbol" aria-hidden="true"><ChefHat /></div>
    <b><span>Chef</span>Control</b>
    {children}
  </div>;
}
