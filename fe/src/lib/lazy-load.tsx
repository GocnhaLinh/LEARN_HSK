import React, { ComponentType, LazyExoticComponent, Suspense } from 'react';
import { PageLoader } from '@/components/layout/PageLoader';

export type PreloadableComponent<P = Record<string, never>> = React.FC<P> & {
  preload: () => Promise<unknown>;
};

/**
 * Shared lazy wrapper for named page/component exports.
 * Wraps React.lazy + Suspense with the themed PageLoader and exposes `.preload()`.
 */
export function lazyNamed<
  TModule extends Record<string, any>,
  TKey extends keyof TModule,
>(
  loader: () => Promise<TModule>,
  exportName: TKey,
  fallback: React.ReactNode = <PageLoader />,
): PreloadableComponent<
  TModule[TKey] extends ComponentType<infer P> ? P : Record<string, never>
> {
  const LazyComp = React.lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as ComponentType<any> };
  }) as LazyExoticComponent<ComponentType<any>>;

  const Wrapped: PreloadableComponent<any> = (props) => (
    <Suspense fallback={fallback}>
      <LazyComp {...props} />
    </Suspense>
  );

  Wrapped.preload = loader;
  Wrapped.displayName = `Lazy(${String(exportName)})`;
  return Wrapped;
}
