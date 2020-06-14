export function isMinFullSentence(text: string): void {
  test("longer than 20 characters", () => {
    expect(text.length).toBeGreaterThan(20);
  });
  test("ends with a period", () => {
    expect(text.endsWith(".")).toBeTruthy();
  });
}
