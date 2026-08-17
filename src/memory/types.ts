export interface Memory {
    subject: string;
    relationship: string;
    object: string;
}

export interface MemoryStore {
    save(memory: Memory): Promise<void>;
    search(query: string): Promise<Memory[]>
}