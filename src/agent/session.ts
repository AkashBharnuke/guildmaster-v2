import type { Session } from "./types.js";

const sessions = new Map<string, Session>();

export function getSession(id: string): Session {
    let session = sessions.get(id);

    if (!session) {
        session = { id, messages: [] };

        sessions.set(id, session);
    }

    return session;
}