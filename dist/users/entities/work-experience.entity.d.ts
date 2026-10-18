import { Page } from 'src/pages/entities/page.entity';
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
    location: string | null;
    pageId: number | null;
    page: Page | null;
    experience_certificate: string;
    currently_working: boolean;
    user: User;
}
