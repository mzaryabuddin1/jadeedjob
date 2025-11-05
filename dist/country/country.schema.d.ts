import { Document } from 'mongoose';
export declare class Country extends Document {
    name: string;
    unicode: string;
    emoji: string;
    alpha2: string;
    alpha3: string;
    dialCode: string;
    region: string;
    capital: string;
    geo: {
        lat: number;
        long: number;
    };
    currency_code: string;
    currency_name: string;
    isActive: boolean;
    timezones: string[];
}
export declare const CountrySchema: import("mongoose").Schema<Country, import("mongoose").Model<Country, any, any, any, Document<unknown, any, Country, any> & Country & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Country, Document<unknown, {}, import("mongoose").FlatRecord<Country>, {}> & import("mongoose").FlatRecord<Country> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
