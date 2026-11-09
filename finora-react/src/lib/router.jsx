import { useEffect, useState } from 'react';

const read = () => (location.hash.slice(1) || '/').split('?')[0];
export function useRoute() {
  const [p, setP] = useState(read);
  useEffect(() => {
    const f = () => setP(read());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  const path = p.startsWith('/') ? p : '/' + p;
  return { path, parts: path.split('/').filter(Boolean) };
}
export const go = (p) => { location.hash = p; };
export const Link = ({ to, children, ...r }) => <a href={'#' + to} {...r}>{children}</a>;
