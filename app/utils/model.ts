import { LLMModel } from "../client/api";

export function collectModelTable(
  models: readonly LLMModel[],
  customModels: string,
) {
  const modelTable: Record<
    string,
    {
      available: boolean;
      name: string;
      displayName: string;
      provider?: LLMModel["provider"]; // Marked as optional
    }
  > = {};

  // default models
  models.forEach((m) => {
    modelTable[m.name] = {
      ...m,
      displayName: m.name, // 'provider' is copied over if it exists
    };
  });

  // server custom models
  customModels
    .split(",")
    .filter((v) => !!v && v.length > 0)
    .forEach((m) => {
      const available = !m.startsWith("-");
      const nameConfig =
        m.startsWith("+") || m.startsWith("-") ? m.slice(1) : m;
      const [name, displayName] = nameConfig.split("=");

      // enable or disable all models
      if (name === "all") {
        Object.values(modelTable).forEach(
          (model) => (model.available = available),
        );
      } else {
        modelTable[name] = {
          name,
          displayName: displayName || name,
          available,
          provider: modelTable[name]?.provider, // Use optional chaining
        };
      }
    });
  return modelTable;
}

/**
 * Generate full model table.
 */
export function collectModels(
  models: readonly LLMModel[],
  customModels: string,
) {
  const modelTable = collectModelTable(models, customModels);
  const allModels = Object.values(modelTable);

  return allModels;
}

export const getURLQuery = (url, query) => {
  // str为？之后的参数部分字符串
  const str = url.substr(url.indexOf("?") + 1);
  // arr每个元素都是完整的参数键值
  const arr = str.split("&");
  // result为存储参数键值的集合
  const result = {};
  for (let i = 0; i < arr.length; i++) {
    // item的两个元素分别为参数名和参数值
    const item = arr[i].split("=");
    result[item[0]] = item[1];
  }
  return result[query];
};
