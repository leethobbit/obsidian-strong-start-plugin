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
                    message: `Disabling '${name}' is not allowed — the Obsidian community-store review rejects it. Fix the underlying issue (use a floor-safe API, or raise minAppVersion deliberately) instead of silencing the rule.`,
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
      // names and hotkeys. Extend brands/acronyms as they appear — never silence
      // the rule. The store review does not gate on it, so it must not block a
      // release; it still catches genuine Title Case slips.
      "obsidianmd/ui/sentence-case": ["warn", {
        brands: ["Lazy GM's campaign manager", "Obsidian"],
        acronyms: [],
        ignoreWords: ["e.g.", "i.e."],
      }],
    },
  }
);
