export declare const LANGUAGE_LEVELS: readonly ["basic", "conversational", "fluent", "native"];
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export declare class UserLanguage {
    id: number;
    userId: number;
    language_name: string;
    languageKey: string;
    proficiency: LanguageLevel;
    createdAt: Date;
}
