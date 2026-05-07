import type { InjectionKey } from 'vue';

export type ApiBaseKey = string;
export type LocaleKey = string;

export const API_BASE_KEY: InjectionKey<ApiBaseKey> = Symbol('pelican.apiBase');
export const LOCALE_KEY: InjectionKey<LocaleKey> = Symbol('pelican.locale');
