/** Routes that render their own mobile top chrome (hide global LuxuryNavbar header). */
export function hasCustomMobileHeader(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/product/') ||
    pathname === '/profile' ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    pathname === '/verify'
  );
}
