import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  /* Base configuration (@eslint/js, eslint-plugin-import) */
  eslint.configs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      /* Suggestions (https://eslint.org/docs/latest/rules/#suggestions) */
      "curly": [
        "error",
        "multi-line",
        "consistent",
      ],
      "eqeqeq": [
        "error",
        "always",
        {
          "null": "ignore",
        },
      ],
      "grouped-accessor-pairs": "warn",
      "no-case-declarations": "off",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-prototype-builtins": "warn",
      "no-sparse-arrays": "warn",
      "no-undef-init": "warn",
      "no-undefined": "error",
      "no-useless-catch": "warn",
      "no-useless-constructor": "warn",
      "no-useless-escape": "warn",
      "no-useless-return": "warn",
      "prefer-promise-reject-errors": "warn",
      "prefer-rest-params": "warn",
      "require-await": "warn",
      /* Layout & Formatting (https://eslint.style/packages/js, https://eslint.style/packages/ts) */
      // NOTE: When a rule has both TS and JS version, use the TS one!
      "@stylistic/array-bracket-spacing": ["warn", "never"],
      "@stylistic/arrow-spacing": [
        "warn",
        {
          "before": true,
          "after": true,
        },
      ],
      "@stylistic/block-spacing": ["warn", "always"],
      "@stylistic/brace-style": [
        "warn",
        "1tbs",
        {
          "allowSingleLine": true,
        },
      ],
      "@stylistic/comma-dangle": [
        "warn",
        {
          "arrays": "always-multiline",
          "objects": "always-multiline",
          "imports": "always-multiline",
          "exports": "always-multiline",
          "functions": "never",
          "importAttributes": "always-multiline",
          "dynamicImports": "never",
          "enums": "always-multiline",
          "generics": "never",
          "tuples": "always-multiline",
        },
      ],
      "@stylistic/comma-spacing": [
        "warn",
        {
          "after": true,
        },
      ],
      "@stylistic/computed-property-spacing": ["warn", "never"],
      "@stylistic/dot-location": ["warn", "property"],
      "@stylistic/eol-last": ["warn", "always"],
      "@stylistic/function-call-spacing": ["warn", "never"],
      "@stylistic/generator-star-spacing": [
        "warn",
        {
          "before": false,
          "after": true,
          "method": {
            "before": true,
            "after": false,
          },
        },
      ],
      "@stylistic/indent": [
        "warn",
        2,
        {
          "SwitchCase": 1,
          "flatTernaryExpressions": true,
          "ignoredNodes": [
            // https://github.com/typescript-eslint/typescript-eslint/issues/1824#issuecomment-1378327382
            "TSUnionType",
          ],
        },
      ],
      "@stylistic/key-spacing": [
        "warn",
        {
          "beforeColon": false,
          "afterColon": true,
          "mode": "strict",
        },
      ],
      "@stylistic/keyword-spacing": [
        "warn",
        {
          "before": true,
          "after": true,
        },
      ],
      "@stylistic/max-len": [
        "warn",
        {
          "code": 180,
          "ignoreStrings": true,
          "ignoreTemplateLiterals": true,
          "ignoreRegExpLiterals": true,
        },
      ],
      "@stylistic/member-delimiter-style": "warn",
      "@stylistic/new-parens": "warn",
      "@stylistic/no-extra-semi": "warn",
      "@stylistic/no-multi-spaces": "warn",
      "@stylistic/no-multiple-empty-lines": [
        "warn",
        {
          "max": 1,
          "maxBOF": 0,
        },
      ],
      "@stylistic/no-tabs": "warn",
      "@stylistic/no-trailing-spaces": "warn",
      "@stylistic/no-whitespace-before-property": "warn",
      "@stylistic/object-curly-spacing": ["warn", "always"],
      "@stylistic/operator-linebreak": [
        "warn",
        "after",
        {
          "overrides": {
            "**": "before",
            "*": "before",
            "/": "before",
            "%": "before",
            "+": "before",
            "-": "before",
            "<<": "before",
            ">>": "before",
            ">>>": "before",
            "&&": "before",
            "||": "before",
            "??": "before",
            "&": "before",
            "|": "before",
            "^": "before",
            "?": "before",
            ":": "before",
          },
        },
      ],
      "@stylistic/quote-props": ["warn", "consistent"],
      "@stylistic/quotes": [
        "warn",
        "double",
        {
          "avoidEscape": true,
        },
      ],
      "@stylistic/rest-spread-spacing": ["warn", "never"],
      "@stylistic/semi": ["warn", "always"],
      "@stylistic/semi-spacing": [
        "warn",
        {
          "before": false,
          "after": true,
        },
      ],
      "@stylistic/semi-style": "warn",
      "@stylistic/space-before-blocks": ["warn", "always"],
      "@stylistic/space-before-function-paren": [
        "warn",
        {
          "anonymous": "never",
          "named": "never",
          "asyncArrow": "always",
        },
      ],
      "@stylistic/space-in-parens": ["warn", "never"],
      "@stylistic/space-infix-ops": "warn",
      "@stylistic/space-unary-ops": [
        "warn",
        {
          "words": true,
          "nonwords": false,
        },
      ],
      "@stylistic/switch-colon-spacing": [
        "warn",
        {
          "before": false,
          "after": true,
        },
      ],
      "@stylistic/template-curly-spacing": ["warn", "never"],
      "@stylistic/template-tag-spacing": ["warn", "never"],
      "@stylistic/type-annotation-spacing": "warn",
      "@stylistic/yield-star-spacing": ["warn", "after"],
      /* Import declarations (https://github.com/import-js/eslint-plugin-import) */
      "import/order": [
        "warn",
        {
          "groups": [
            ["builtin", "external"],
            "internal",
            "parent",
            "sibling",
            "index",
            "unknown",
          ],
          "newlines-between": "never",
          "alphabetize": {
            "order": "asc",
            "caseInsensitive": true,
          },
        },
      ],
      "import/newline-after-import": "warn",
      "import/no-unresolved": "off",
      "sort-imports": [
        "warn",
        {
          "ignoreCase": true,
          "ignoreDeclarationSort": true,
          "ignoreMemberSort": false,
          "memberSyntaxSortOrder": ["none", "all", "multiple", "single"],
          "allowSeparatedGroups": true,
        },
      ],
    },
  },
  /* Additional configuration for build scripts */
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  /* Configuration for src & test files (typescript-eslint) */
  ...tseslint.config(
    {
      files: ["**/*.ts"],
      extends: [
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
      ],
      languageOptions: {
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          project: "tsconfig.json",
        },
      },
      rules: {
        // Supported rules (https://typescript-eslint.io/rules/#supported-rules)
        "@typescript-eslint/array-type": ["error", {
          "default": "array",
          "readonly": "generic", // to support older TS versions
        }],
        "@typescript-eslint/consistent-indexed-object-style": "off",
        "@typescript-eslint/consistent-type-assertions": "off",
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/dot-notation": "off",
        "@typescript-eslint/no-confusing-void-expression": "off",
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-inferrable-types": "warn",
        "@typescript-eslint/no-invalid-void-type": "warn",
        "@typescript-eslint/no-mixed-enums": "warn",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "warn",
        "@typescript-eslint/no-require-imports": "error",
        // This rule would be useful but produces too many false positives when `noUncheckedIndexedAccess`
        // is disabled. However, enabling that would cause a lot of other false positives.
        // So we turn this lint rule off until `noUncheckedIndexedAccess` is improved.
        // See also: https://github.com/typescript-eslint/typescript-eslint/issues/6264
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/no-unsafe-declaration-merging": "warn",
        "@typescript-eslint/no-unsafe-enum-comparison": "off",
        "@typescript-eslint/no-unsafe-function-type": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/no-wrapper-object-types": "off",
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            "args": "none",
          },
        ],
        "no-useless-constructor": "off",
        "@typescript-eslint/no-useless-constructor": "warn",
        "@typescript-eslint/prefer-for-of": "off", // for compatibility reasons
        "@typescript-eslint/prefer-includes": "off",
        "prefer-promise-reject-errors": "off",
        "@typescript-eslint/prefer-promise-reject-errors": "warn",
        "@typescript-eslint/prefer-readonly": "warn",
        "@typescript-eslint/prefer-return-this-type": "warn",
        "@typescript-eslint/prefer-string-starts-ends-with": "off",
        "require-await": "off",
        "@typescript-eslint/require-await": "warn",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/switch-exhaustiveness-check": "warn",
        "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],

        "@typescript-eslint/explicit-member-accessibility": [
          "warn",
          {
            "accessibility": "no-public",
          },
        ],
        "@typescript-eslint/explicit-module-boundary-types": [
          "warn",
          {
            "allowArgumentsExplicitlyTypedAsAny": true,
          },
        ],
        // Based on: https://typescript-eslint.io/rules/naming-convention/#enforce-the-codebase-follows-eslints-camelcase-conventions
        "@typescript-eslint/naming-convention": [
          "warn",
          {
            "selector": "variable",
            "format": [
              "camelCase",
              "UPPER_CASE",
            ],
          },
          {
            "selector": "parameter",
            "format": [
              "camelCase",
            ],
            "leadingUnderscore": "allow",
          },
          {
            "selector": "variableLike",
            "format": [
              "camelCase",
            ],
          },
          {
            "selector": "enumMember",
            "format": [
              "PascalCase",
            ],
          },
          {
            "selector": [
              "classProperty",
              "objectLiteralProperty",
              "typeProperty",
              "accessor",
            ],
            "modifiers": [
              "requiresQuotes",
            ],
            "format": null,
          },
          {
            "selector": [
              "classProperty",
              "objectLiteralProperty",
              "typeProperty",
              "accessor",
            ],
            "format": [
              "camelCase",
              "UPPER_CASE",
            ],
            "modifiers": [
              "private",
            ],
            "leadingUnderscore": "allow",
          },
          {
            "selector": [
              "classProperty",
              "objectLiteralProperty",
              "typeProperty",
              "accessor",
            ],
            "format": [
              "camelCase",
              "UPPER_CASE",
            ],
          },
          {
            "selector": "memberLike",
            "format": [
              "camelCase",
            ],
          },
          {
            "selector": "typeLike",
            "format": [
              "PascalCase",
            ],
          },
        ],
      },
    },
    /* Additional configuration for src files */
    {
      files: ["src/**/*.ts"],
      rules: {
        // NOTE: Deno doesn't like type exports without the "type" keyword.
        "@typescript-eslint/consistent-type-exports": [
          "error",
          {
            "fixMixedExportsWithInlineTypeSpecifier": false,
          },
        ],
        "@typescript-eslint/consistent-type-imports": [
          "error",
          {
            "prefer": "type-imports",
            "fixStyle": "separate-type-imports",
            "disallowTypeAnnotations": false,
          },
        ],
        "@typescript-eslint/no-import-type-side-effects": "warn",
      },
    },
    /* Additional configuration for test files */
    {
      files: ["test/**/*.ts"],
      rules: {
        "@typescript-eslint/await-thenable": "off",
        "@typescript-eslint/class-literal-property-style": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-redundant-type-constituents": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-call": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/only-throw-error": "off",
        "@typescript-eslint/unbound-method": "off",
      },
    }
  ),
  /* Ignored files (https://github.com/eslint/eslint/issues/17400) */
  {
    ignores: [
      "build/",
      "coverage/",
      "dist/",
      "extra-checks/",
      "lib/",
      "node_modules/",
      "samples/",
      "src/Hash.ts",
      "src/Semver.ts",
      "test/cloudflare-worker/dist/",
      "*.log",
    ],
  },
];
