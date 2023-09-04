/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "next/core-web-vitals",
    "airbnb",
    "airbnb-typescript",
    "plugin:react/jsx-runtime",
    // "plugin:@typescript-eslint/recommended-type-checked",
    // "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    "react/function-component-definition": [
      "error",
      {
        "namedComponents": "arrow-function",
        "unnamedComponents": "arrow-function"
      }
    ],
    "@typescript-eslint/no-floating-promises": [
      "warn"
    ],
    "react/require-default-props": "off",
    "no-console": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};

module.exports = config;
