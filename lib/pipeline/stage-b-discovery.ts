import { AppMap, AppMapRoute, PipelineContext } from './types';
import { getBrowserProvider } from '../browser';

export async function executeStageBDiscovery(
  ctx: PipelineContext,
  maxPages: number = 25
): Promise<AppMap> {
  const provider = getBrowserProvider();
  const session = await provider.createSession({
    viewport: 'desktop',
    enableVideo: false,
  });
  ctx.hyperbrowserSessionIds.push(session.id);

  const discoveredRoutes = new Map<string, AppMapRoute>();
  const visitedUrls = new Set<string>();
  const queue: string[] = [ctx.targetUrl];

  const targetParsed = new URL(ctx.targetUrl);
  const targetHost = targetParsed.hostname.toLowerCase();

  try {
    const { page } = await provider.connectPlaywright(session);

    while (queue.length > 0 && visitedUrls.size < maxPages) {
      const currentUrl = queue.shift()!;
      if (visitedUrls.has(currentUrl)) continue;
      visitedUrls.add(currentUrl);

      try {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(500);

        const pageData = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]'))
            .map((a) => (a as HTMLAnchorElement).href)
            .filter((h) => h.startsWith('http'));

          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
            .map((b) => (b.textContent || (b as HTMLInputElement).value || '').trim())
            .filter(Boolean);

          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'))
            .map((i) => (i.getAttribute('name') || i.getAttribute('id') || i.getAttribute('placeholder') || '').trim())
            .filter(Boolean);

          const forms = document.querySelectorAll('form').length;
          const title = document.title || '';

          return { links, buttons, inputs, forms, title };
        });

        const currentParsed = new URL(currentUrl);
        const routeData: AppMapRoute = {
          url: currentUrl,
          path: currentParsed.pathname + currentParsed.search,
          title: pageData.title,
          hasForms: pageData.forms > 0,
          formsCount: pageData.forms,
          interactiveElements: {
            buttons: pageData.buttons.slice(0, 10),
            inputs: pageData.inputs.slice(0, 10),
            links: pageData.links.slice(0, 20),
          },
        };

        discoveredRoutes.set(currentUrl, routeData);

        // Scope Lock: Only enqueue links on the EXACT target hostname
        for (const link of pageData.links) {
          try {
            const linkParsed = new URL(link);
            if (linkParsed.hostname.toLowerCase() === targetHost && !visitedUrls.has(link)) {
              // Strip hash fragment
              linkParsed.hash = '';
              const cleanedUrl = linkParsed.toString();
              if (!visitedUrls.has(cleanedUrl) && !queue.includes(cleanedUrl)) {
                queue.push(cleanedUrl);
              }
            }
          } catch (e) {
            // invalid link
          }
        }
      } catch (err: any) {
        console.warn(`[Discovery] Failed to crawl ${currentUrl}:`, err.message);
      }
    }
  } finally {
    await provider.stopSession(session.id);
  }

  const routes = Array.from(discoveredRoutes.values());
  const authRoutes = routes
    .map((r) => r.path)
    .filter((p) => p.includes('login') || p.includes('signin') || p.includes('signup') || p.includes('register'));

  const checkoutRoutes = routes
    .map((r) => r.path)
    .filter((p) => p.includes('pricing') || p.includes('checkout') || p.includes('billing') || p.includes('subscribe'));

  const appMap: AppMap = {
    targetUrl: ctx.targetUrl,
    hostname: targetHost,
    frameworkHints: [],
    pagesFound: routes.length,
    routes,
    authRoutes,
    checkoutRoutes,
  };

  ctx.appMap = appMap;
  return appMap;
}
