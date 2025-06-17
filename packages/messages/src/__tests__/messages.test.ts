import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { t, reloadMessages } from "../index";

const messagesDir = path.resolve(__dirname, "..", "locales");
const testFiles = [
	"test-git.json",
	"test-config.json",
	"test-commit.json",
	"test-branch.json",
];

describe("Messages Service", () => {
	beforeAll(() => {
		if (!fs.existsSync(messagesDir)) {
			fs.mkdirSync(messagesDir, { recursive: true });
		}

		fs.writeFileSync(
			path.join(messagesDir, "test-git.json"),
			JSON.stringify(
				{
					notRepository: "This folder is not a Git repository.",
					genericError: "Error executing Git command: {{errMsg}}",
				},
				null,
				2,
			),
			"utf-8",
		);

		fs.writeFileSync(
			path.join(messagesDir, "test-config.json"),
			JSON.stringify(
				{
					fileNotFound: "Configuration file not found: {{file}}",
					multi: "{{first}} and {{second}} are placeholders",
				},
				null,
				2,
			),
			"utf-8",
		);

		fs.writeFileSync(
			path.join(messagesDir, "test-commit.json"),
			JSON.stringify(
				{
					noChanges: "No files to commit.",
				},
				null,
				2,
			),
			"utf-8",
		);

		fs.writeFileSync(
			path.join(messagesDir, "test-branch.json"),
			JSON.stringify(
				{
					invalidPattern: "Branch pattern is invalid: {{pattern}}",
				},
				null,
				2,
			),
			"utf-8",
		);
		reloadMessages(messagesDir);
	});

	afterAll(() => {
		for (const f of testFiles) {
			const p = path.join(messagesDir, f);
			if (fs.existsSync(p)) fs.unlinkSync(p);
		}
	});

	it("loads exactly four JSON files", () => {
		const files = fs
			.readdirSync(messagesDir)
			.filter((f) => f.endsWith(".json"));
		expect(files).toEqual(expect.arrayContaining(testFiles));
		expect(files.length).toBeGreaterThanOrEqual(testFiles.length);
	});

	it("returns correct value for a known key without placeholders", () => {
		expect(t("test-git.notRepository")).toBe(
			"This folder is not a Git repository.",
		);
	});

	it("formats single placeholder correctly", () => {
		const err = "fatal: ambiguous argument";
		expect(t("test-git.genericError", { errMsg: err })).toBe(
			`Error executing Git command: ${err}`,
		);
	});

	it("formats multiple placeholders correctly", () => {
		expect(t("test-config.multi", { first: "Alice", second: "Bob" })).toBe(
			"Alice and Bob are placeholders",
		);
	});

	it("returns fallback error for unknown key", () => {
		expect(() => t("nonexistent.key")).toThrow(
			"Missing message key: nonexistent.key",
		);
	});

	it("throws on invalid JSON file", () => {
		fs.writeFileSync(
			path.join(messagesDir, "test-commit.json"),
			"{ bad json",
			"utf-8",
		);
		reloadMessages(messagesDir);
		expect(() => {
			t("test-commit.noChanges");
		}).toThrow("Missing message key: test-commit.noChanges");
	});
});
