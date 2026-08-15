export interface Tool {
    name: string;
    description: string;
    inputSchema: object;
    execute(input: unknown): Promise<unknown>;
}