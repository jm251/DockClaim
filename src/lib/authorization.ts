export function assertOrganizationScope(expectedOrganizationId: string, actualOrganizationId: string) {
  if (expectedOrganizationId !== actualOrganizationId) {
    throw new Error("Organization scope mismatch.");
  }
}
