import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationJA from './locales/ja/translation.json';

// リソースの登録
const resources = {
    en: {
        translation: translationEN,
    },
    ja: {
        translation: translationJA,
    },
};

i18n
    // ブラウザの言語とOS言語を検出
    .use(LanguageDetector)
    // react-i18next にインスタンスを渡す
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en', // 検出できなかった場合のデフォルト言語
        debug: false, // 開発時は true にしてログを出力可能

        interpolation: {
            escapeValue: false, // ReactはXSSを安全に処理するため不要
        },
    });

export default i18n;
