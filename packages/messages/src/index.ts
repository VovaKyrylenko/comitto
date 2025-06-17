import * as fs from "node:fs";
import * as path from "node:path";

interface MsgTree {
	[key: string]: MsgValue;
}
type MsgValue = string | MsgTree;
type TemplateFn = (vars: Record<string, unknown>) => string;

const messages: MsgTree = {};
const templates = new Map<string, TemplateFn>();

function loadDir(dir: string, target: MsgTree) {
	for (const fn of fs.readdirSync(dir)) {
		const fullPath = path.join(dir, fn);
		const stat = fs.statSync(fullPath);
		if (stat.isDirectory()) {
			target[fn] = {};
			loadDir(fullPath, target[fn]);
		} else if (fn.endsWith(".json")) {
			const key = path.basename(fn, ".json");
			try {
				target[key] = JSON.parse(fs.readFileSync(fullPath, "utf8"));
			} catch {
				target[key] = {};
			}
		}
	}
}

function flatten(node: MsgTree, prefix: string, flatMap: Map<string, string>) {
	for (const [k, v] of Object.entries(node)) {
		const newKey = prefix ? `${prefix}.${k}` : k;
		if (typeof v === "string") {
			flatMap.set(newKey, v);
		} else {
			flatten(v, newKey, flatMap);
		}
	}
}

function compileTemplate(str: string): TemplateFn {
	const regex = /\{\{\s*(\w+)\s*\}\}/g;
	const parts: string[] = [];
	const vars: string[] = [];
	let lastIndex = 0;

	let match: RegExpExecArray | null = regex.exec(str);
	while (match !== null) {
		parts.push(str.slice(lastIndex, match.index));
		const varName = match[1];
		if (varName === undefined) {
			throw new Error(`Invalid template, missing variable name in '${str}'`);
		}
		vars.push(varName);
		lastIndex = regex.lastIndex;
		match = regex.exec(str);
	}
	parts.push(str.slice(lastIndex));

	return (data) => {
		let result = "";
		vars.forEach((key, idx) => {
			result += parts[idx];
			const value = data[key] as string | undefined;
			if (value == null) {
				throw new Error(`Missing var '${key}' for template.`);
			}
			result += String(value);
		});
		result += parts[vars.length];
		return result;
	};
}

const localesDir = path.resolve(__dirname, "locales");

export function reloadMessages(dir: string = localesDir) {
	for (const key of Object.keys(messages)) {
		delete messages[key];
	}
	templates.clear();

	loadDir(dir, messages);

	const flatMap = new Map<string, string>();
	flatten(messages, "", flatMap);
	for (const [key, tpl] of flatMap) {
		templates.set(key, compileTemplate(tpl));
	}
}

reloadMessages();

export function t(key: string, vars: Record<string, unknown> = {}): string {
	const fn = templates.get(key);
	if (!fn) throw new Error(`Missing message key: ${key}`);
	return fn(vars);
}
