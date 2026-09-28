import type { InjectionKey, Ref } from 'vue';

export type ApiBaseKey = string;
export type CatalogBaseKey = string;
export type LocaleKey = string;

export const API_BASE_KEY: InjectionKey<ApiBaseKey> = Symbol('pelican.apiBase');
export const CATALOG_BASE_KEY: InjectionKey<CatalogBaseKey> = Symbol('pelican.catalogBase');
export const LOCALE_KEY: InjectionKey<LocaleKey> = Symbol('pelican.locale');
/** Logo image URL (root `logoSrc` prop); reactive so hosts can swap it. */
export const LOGO_SRC_KEY: InjectionKey<Readonly<Ref<string>>> = Symbol('pelican.logoSrc');
/** Sanitised query string (no leading '?') appended to libertex.copy-trade.io links. */
export const LINK_PARAMS_KEY: InjectionKey<Readonly<Ref<string>>> = Symbol('pelican.linkParams');
