import { BuiltinMask } from "./typing";

export const CN_MASKS: BuiltinMask[] = [
  {
    avatar: "1f638",
    name: "默认",
    context: [
      {
        role: "assistant",
        content: "你好，我是你的AI助手，有什么可以帮到你的？",
        date: "",
      },
    ],
    modelConfig: {
      model: "cwRong",
      temperature: 0.3,
      max_tokens: 1024,
      presence_penalty: 1.05,
      sendMemory: true,
      historyMessageCount: 6,
      compressMessageLengthThreshold: 1000,
      top_p: 0.95,
      top_k: 50,
      do_sample: true,
      truncate: 1000,
      max_new_tokens: 1024,
    },
    lang: "cn",
    builtin: true,
  },
];
