import type { InjectionKey } from 'vue';

export type ApiBaseKey = string;
export type CatalogBaseKey = string;
export type LocaleKey = string;

export const API_BASE_KEY: InjectionKey<ApiBaseKey> = Symbol('pelican.apiBase');
export const CATALOG_BASE_KEY: InjectionKey<CatalogBaseKey> = Symbol('pelican.catalogBase');
export const LOCALE_KEY: InjectionKey<LocaleKey> = Symbol('pelican.locale');
