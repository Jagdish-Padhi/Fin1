export class SoD {
  static assertNotSameActor(actorA: string, actorB: string, message: string): void {
    if (actorA && actorB && actorA === actorB) {
      throw new Error(`Segregation of Duties Violation: ${message}`);
    }
  }

  static assertNotSameOrg(orgA: string, orgB: string, message: string): void {
    if (orgA && orgB && orgA === orgB) {
      throw new Error(`Segregation of Duties Violation: ${message}`);
    }
  }
}
