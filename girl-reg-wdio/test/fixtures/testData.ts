/**
 * Centralised test data fixtures.
 * All test data lives here — never inside page objects or specs.
 */

export interface MemberData {
    girl: {
        dob: string;
        grade: string;
    };
    caregiver: {
        firstName: string;
        lastName: string;
        dob: string;
        phone: string;
        address: {
            line1: string;
            line2: string;
            zip: string;
            city: string;
        };
    };
    payment: {
        cardNumber: string;
        expiryMonth: string;
        expiryYear: string;
        cvv: string;
    };
}

export const DEFAULT_MEMBER_DATA: MemberData = {
    girl: {
        dob: '06/08/2011',
        grade: '9',
    },
    caregiver: {
        firstName: 'Caregiver',
        lastName: 'Test',
        dob: '01/01/1980',
        phone: '555-555-5555',
        address: {
            line1: '234 Test St',
            line2: 'Test',
            zip: '10001',
            city: 'New York',
        },
    },
    payment: {
        cardNumber: '4111111111111111',
        expiryMonth: '4',
        expiryYear: '2028',
        cvv: '909',
    },
};

/** Generates a unique name suffix using the last 6 digits of epoch ms */
export function uniqueSuffix(): string {
    return Date.now().toString().slice(-6);
}
