export type AgentEvent =
  | {
      type: "agent_started";
      input: string;
    }
  | {
      type: "tool_called";
      tool: string;
      arguments: unknown;
    }
  | {
      type: "tool_completed";
      tool: string;
      result: unknown;
    }
  | {
      type: "tool_denied";
      tool: string;
    }
  | {
      type: "agent_completed";
      output: unknown;
    }
  | {
      type: "agent_error";
      error: string;
    }
  | {
    type: "tool_retry";
    tool: string;
    attempt: number;
  }
  | {
    type: "tool_trace";
    tool: string;
    durationMs: number;
  };  
