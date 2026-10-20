import { expect } from "vitest";

// The API's uniform error shape: { error: true, message: string, code?: string }.
export function expectErrorShape(response: unknown) {
    expect(typeof response).toBe("object");
    expect(response).not.toBeNull();
    const body = response as Record<string, unknown>;
    expect(body.error).toBe(true);
    expect(typeof body.message).toBe("string");
}

// Pins a success response: not the error envelope, and every field the SDK reads is present with its type.
export function expectContract<T>(response: unknown, requiredFields: Record<string, string>): T {
    expect(typeof response).toBe("object");
    expect(response).not.toBeNull();
    const body = response as Record<string, unknown>;
    expect(body.error, `expected a success response, got: ${JSON.stringify(body)}`).not.toBe(true);

    for (const [field, type] of Object.entries(requiredFields)) {
        expect(body, `missing field "${field}"`).toHaveProperty(field);
        expect(typeof body[field], `field "${field}" should be ${type}`).toBe(type);
    }
    return body as T;
}

export function expectArray<T>(response: unknown, what: string): T[] {
    expect(Array.isArray(response), `expected ${what} to be an array, got: ${JSON.stringify(response)}`).toBe(true);
    return response as T[];
}
