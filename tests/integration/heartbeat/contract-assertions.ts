import { expect } from "vitest";

// The API's uniform error shape: { error: true, message: string, code?: string }.
export function expectErrorShape(response: unknown) {
    expect(typeof response).toBe("object");
    expect(response).not.toBeNull();
    const body = response as Record<string, unknown>;
    expect(body.error).toBe(true);
    expect(typeof body.message).toBe("string");
}

// Pins that a response is either the uniform error shape, or has every required success field present and typed.
export function expectSuccessOrErrorShape(response: unknown, requiredSuccessFields: Record<string, string>) {
    expect(typeof response).toBe("object");
    expect(response).not.toBeNull();
    const body = response as Record<string, unknown>;

    if (body.error === true) {
        expectErrorShape(body);
        return;
    }

    for (const [field, type] of Object.entries(requiredSuccessFields)) {
        expect(body, `missing field "${field}"`).toHaveProperty(field);
        expect(typeof body[field], `field "${field}" should be ${type}`).toBe(type);
    }
}
