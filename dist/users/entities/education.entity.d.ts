import { User } from './user.entity';
export declare class Education {
    id: number;
    highest_qualification: string;
    institution_name: string;
    field_of_study: string | null;
    start_year: string | null;
    graduation_year: string;
    gpa_or_grade: string;
    degree_document: string;
    description: string | null;
    user: User;
}
