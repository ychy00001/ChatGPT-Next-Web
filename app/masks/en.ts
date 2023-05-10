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
      temperature: 0.1,
      max_tokens: 1024,
      presence_penalty: 1.05,
      sendMemory: false,
      historyMessageCount: 32,
      compressMessageLengthThreshold: 2000,
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
