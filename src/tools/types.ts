export interface Tool {
    name: string;
    description: string;
    inputSchema: object;
    execute(input: unknown): Promise<unknown>;
    approval?: ToolApproval;
    retry?: { 
        attempts: number; 
        delayMs?: number; 
    };
    timeoutMs?: number;
}

type ToolApproval = "auto" | "approval_required";