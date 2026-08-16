import neo4j, { type Driver } from "neo4j-driver";
import { settings } from "../config/settings.js";
import { Memory, MemoryStore } from "./types.js";

export class Neo4jMemory implements MemoryStore {
  private readonly driver: Driver;

  constructor() {
    this.driver = neo4j.driver(
      settings.neo4jUri,
      neo4j.auth.basic(settings.neo4jUsername, settings.neo4jPassword)
    );
  }

  async save(memory: Memory): Promise<void> {
    const session = this.driver.session();

    try {
      await session.run(
        `
                MERGE (subject:Entity {name: $subject})
                MERGE (object:Entity {name: $object})
                MERGE (subject)-[r:RELATED {type: $relationship}]->(object)
                `,
        {
          subject: memory.subject,
          relationship: memory.relationship,
          object: memory.object,
        }
      );
    } finally {
      await session.close();
    }
  }

  async search(query: string): Promise<Memory[]> {
    const session = this.driver.session();

    try {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

      const result = await session.run(
        `
            MATCH (subject:Entity)-[r:RELATED]->(object:Entity)
            WHERE any(term IN $terms
                WHERE toLower(subject.name) CONTAINS term)
            RETURN subject.name AS subject,
                   r.type AS relationship,
                   object.name AS object
            `,
        { terms }
      );

      return result.records.map((record) => ({
        subject: record.get("subject"),
        relationship: record.get("relationship"),
        object: record.get("object"),
      }));
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
