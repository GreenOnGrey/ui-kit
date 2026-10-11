export interface Manifest { version: string; classes: string[]; roots: string[]; tokens: string[] }
export interface Violation { line: number; selector: string; rule: 1 | 2 | 3; text: string }
export function classesOf(selector: string): string[];
export function compounds(selector: string): string[];
export function target(selector: string): string;
export function check(css: string, manifest: Manifest, from?: string): Violation[];
