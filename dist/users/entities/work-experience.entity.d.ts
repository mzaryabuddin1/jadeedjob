import { User } from './user.entity';
export declare class WorkExperience {
    id: number;
    company_name: string;
    designation: string;
    department: string;
    employment_type: string;
    from_date: Date;
    to_date: Date;
    key_responsibilities: string;
    experience_certificate: string;
    currently_working: boolean;
    user: User;
}
