import { FirebaseService } from './firebase.service';
export declare class FirebaseController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    test(token: string): Promise<string>;
}
