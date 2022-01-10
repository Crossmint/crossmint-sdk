import { v4 as uuidv4 } from "uuid";

export function generateClientId() {
    return uuidv4();
}
