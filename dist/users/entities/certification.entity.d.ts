import { User } from './user.entity';
export declare class Certification {
    id: number;
    certification_name: string;
    issuing_institution: string;
    certification_date: Date;
    certificate_file: string;
    expiry_date: Date | null;
    credential_id: string | null;
    credential_url: string | null;
    user: User;
}
