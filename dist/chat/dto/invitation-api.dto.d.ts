export declare class InvitationProjectionDto {
    id: string;
    invitationId: string;
    status: string;
    viewerAction: 'respond' | 'cancel' | null;
}
export declare class UpdateInvitationDto {
    action: 'accept' | 'decline' | 'cancel';
}
