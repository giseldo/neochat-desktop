const globals = require('globals');
const pluginJs = require('@eslint/js');
const pluginReact = require('eslint-plugin-react');
const pluginJsxRuntime = require('eslint-plugin-react/configs/jsx-runtime');
const babelParser = require('@babel/eslint-parser');

module.exports = [
  // 1. Global ignores
  {
    ignores: [
      "node_modules/",
      "dist/",
      "release/",
      ".pnpm-store/",
      "electron/vendor/",
      "*.config.js",
      "*.config.cjs"
    ]
  },

  // 2. JS/CJS specific config (Electron Main, Scripts, Configs etc.)
  {
    files: ["**/*.{js,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly'
      }
    },
    rules: {
        ...pluginJs.configs.recommended.rules, // Base JS rules
        'no-unused-vars': ['warn', {
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_',
            'caughtErrors': 'none' // Ignore all caught errors regardless of name
        }],
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-unreachable': 'warn'
    }
  },

  // 3. JSX specific config (React Components in Renderer)
  {
    files: ["src/renderer/**/*.jsx"],
    plugins: {
        react: pluginReact
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"]
        },
        ecmaFeatures: { jsx: true },
        sourceType: "module"
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        FileReader: 'readonly',
        alert: 'readonly'
      }
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginJsxRuntime.rules,
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrors': 'none' // Ignore all caught errors regardless of name
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unreachable': 'warn'
    }
  }
];
