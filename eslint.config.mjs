import config, { generateIgnores } from "@hyoretsu/configs/eslint";

export default [generateIgnores(), ...config];
