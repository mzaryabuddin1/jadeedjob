import { LegalAcceptanceItemDto } from 'src/legal/dto/legal-api.dto';
export declare class RegisterSendOtpDto {
    firstName: string;
    lastName?: string;
    phone: string;
    countryId: number | string;
    languageId: number | string;
    password: string;
    email?: string;
    photoUri?: string;
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    legalAcceptances?: LegalAcceptanceItemDto[];
    clientPlatform?: 'ios' | 'android' | 'web' | 'unknown';
}
