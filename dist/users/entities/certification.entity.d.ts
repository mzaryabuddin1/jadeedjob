import { User } from './user.entity';
export declare class Certification {
    id: number;
    certification_name: string;
    issuing_institution: string;
    certification_date: Date;
    certificate_file: string;
    user: User;
}
