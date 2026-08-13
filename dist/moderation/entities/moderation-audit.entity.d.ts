import { User } from 'src/users/entities/user.entity';
import { ModerationReport } from './moderation-report.entity';
export declare class ModerationAudit {
    id: number;
    reportId: number;
    report: ModerationReport;
    actorUserId: number | null;
    actor: User | null;
    event: string;
    notes: string | null;
    metadata: Record<string, unknown> | null;
    dedupeKey: string | null;
    createdAt: Date;
}
