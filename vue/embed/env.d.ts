/// <reference types="vite/client" />

// Build-time constants, see vite.embed.config.ts (`define`).

/** Root package.json version (= S3 folder in the corp pipeline) + build id. */
declare const __PELICAN_EMBED_VERSION__: string;
/** vue/package.json version of the bundled component. */
declare const __PELICAN_COMPONENT_VERSION__: string;
/** Default live-data proxy origin (env PELICAN_API_BASE). */
declare const __PELICAN_API_BASE__: string;
/** Default static catalog origin (env PELICAN_CATALOG_BASE). */
declare const __PELICAN_CATALOG_BASE__: string;
