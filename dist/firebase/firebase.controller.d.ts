import { FirebaseService } from './firebase.service';
export declare class FirebaseController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    test(token: string): Promise<string>;
    subscribeToFilter(filterId: number, token: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
