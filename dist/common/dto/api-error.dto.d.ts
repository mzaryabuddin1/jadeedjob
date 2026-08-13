export declare class ApiErrorDto {
    statusCode: number;
    error: string;
    code: string;
    message: string;
    details?: Record<string, unknown> | unknown[];
    errors?: string[];
}
