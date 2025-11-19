import { User } from './user.entity';
export declare class Education {
    id: number;
    highest_qualification: string;
    institution_name: string;
    graduation_year: string;
    gpa_or_grade: string;
    degree_document: string;
    user: User;
}
