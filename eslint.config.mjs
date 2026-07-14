import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

// Rules the community-store review BLOCKS on AND refuses to let you disable.
// `npm run lint` is our local mirror of that review — an inline eslint-disable
// silences OUR gate while the store bot still rejects the code. The local rule
// below makes disabling these fail here, so the only ways out are the right
// ones: fix the code, or raise minAppVersion deliberately.
const STORE_BLOCKING_RULES = new Set([
  "@typescript-eslint/no-deprecated",
  "obsidianmd/no-unsupported-api",
  // The 0.6.0 review (2026-07-14) rejected inline disables of this rule
  // outright ("Disabling 'obsidianmd/ui/sentence-case' is not allowed") —
  // exempt strings via brands/ignoreRegex in the rule options below instead.
  "obsidianmd/ui/sentence-case",
]);

const localPlugin = {
  rules: {
    "no-disable-store-rules": {
      meta: {
        type: "problem",
        docs: { description: "Disallow inline-disabling lint rules the Obsidian store review blocks on." },
        schema: [],
      },
      create(context) {
        const source = context.sourceCode ?? context.getSourceCode();
        return {
          Program() {
            for (const comment of source.getAllComments()) {
              const match = /^\s*eslint-disable(?:-next-line|-line)?\s+([\s\S]*?)(?:\s*--\s[\s\S]*)?$/.exec(comment.value);
              if (!match) continue;
              for (const name of match[1].split(",").map((s) => s.trim()).filter(Boolean)) {
                if (STORE_BLOCKING_RULES.has(name)) {
                  context.report({
                    loc: comment.loc,
                    message: `Disabling '${name}' is not allowed — the Obsidian community-store review rejects it. Fix the underlying issue instead of silencing the rule (API rules: use a floor-safe API or raise minAppVersion deliberately; sentence-case: extend brands/ignoreRegex in eslint.config.mjs).`,
                  });
                }
              }
            }
          },
        };
      },
    },
  },
};

// Flat config (ESLint 9) running eslint-plugin-obsidianmd's **recommended** set —
// the published encoding of the community-store automated review. Errors here are
// the things the review bot blocks on; run `npm run lint` before every release.
export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/**", "dev-vault/**", "scripts/**", "*.mjs"],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts", "main.ts"],
    plugins: { local: localPlugin },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "local/no-disable-store-rules": "error",
    },
  },
  {
    rules: {
      // House preferences
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // WARN, not error: no proper-noun dictionary by default, so it flags brand
      // names and hotkeys. Extend brands/acronyms/ignoreRegex as they appear —
      // NEVER an inline disable: the store review rejects those outright (seen
      // in the 0.6.0 review), and local/no-disable-store-rules now errors on
      // them. The review doesn't gate on the string violations themselves.
      "obsidianmd/ui/sentence-case": ["warn", {
        brands: ["Strong Start", "Lazy GM's Resource Document", "Lazy GM's 5e Monster Builder Resource Document", "Lazy Solo 5e", "Obsidian", "NPCs", "NPC", "5e", "Whitesparrow"],
        acronyms: ["X", "DC", "CR", "AC", "HP"], // X-card safety tool; 5e module (M10) terms
        ignoreWords: ["e.g.", "i.e."],
        // The prep step 2 heading: "strong start" as the Lazy GM concept, not
        // the plugin brand — the case-insensitive brand match would otherwise
        // demand brand casing on it.
        ignoreRegex: ["^Create a strong start$"],
      }],
    },
  }
);
