import { BuiltinMask } from "./typing";

export const EN_MASKS: BuiltinMask[] = [
  {
    avatar: "1f916",
    name: "Default Chat",
    context: [
      {
        role: "assistant",
        content: "Hello, what can I do for you?",
        date: "",
      },
    ],
    modelConfig: {
      model: "cwRong",
      temperature: 0.3,
      max_tokens: 1000,
      presence_penalty: 1.05,
      sendMemory: true,
      historyMessageCount: 4,
      compressMessageLengthThreshold: 1000,
      top_p: 0.95,
      top_k: 50,
      do_sample: true,
      truncate: 1000,
      max_new_tokens: 1024,
    },
    lang: "en",
    builtin: true,
  },
];
