export declare class MailService {
    private readonly logger;
    private transporter;
    get isConfigured(): boolean;
    private getTransporter;
    send(opts: {
        to: string;
        subject: string;
        text: string;
        html?: string;
    }): Promise<boolean>;
}
