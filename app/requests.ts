import type {
  ChatRequest,
  ChatResponse,
  ModelListResponse,
  ChatRequestHF,
  ChatResponseHF,
} from "./api/openai/typing";
import {
  Message,
  ModelConfig,
  useAccessStore,
  useAppConfig,
  useChatStore,
} from "./store";
import { showToast } from "./components/ui-lib";
import { time } from "console";
import { Stream } from "stream";

const TIME_OUT_MS = 60000;

const makeRequestParam = (
  messages: Message[],
  options?: {
    stream?: boolean;
    overrideModel?: string;
  },
): ChatRequestHF => {
  let sendMessages = messages.map((v) => ({
    role: v.role,
    content: v.content,
  }));

  const modelConfig = {
    ...useAppConfig.getState().modelConfig,
    ...useChatStore.getState().currentSession().mask.modelConfig,
  };

  // override model config
  if (options?.overrideModel) {
    modelConfig.model = options.overrideModel;
  }
  let prompt = "";
  let history = "";
  sendMessages.forEach((item, index) => {
    if (index === sendMessages.length - 1) {
      prompt = item.content;
    } else {
      let role = "User";
      if (item.role == "user") {
        role = "User";
      } else if ((item.role = "assistant")) {
        role = "Assistant";
      }
      history += prompt + role + ":" + item.content + "\n";
    }
  });
  return {
    stream: options?.stream,
    // inputs: "context:"+ history + "\n###" + prompt,
    inputs:
      "If you are a artificial intelligence assistant, please answer the user questions based on the user asks and descriptions.\n" +
      history +
      "\nUser:" +
      prompt +
      "\nAssistant:",
    history: history,
    parameters: {
      temperature: modelConfig.temperature,
      repetition_penalty: modelConfig.presence_penalty,
      max_new_tokens: modelConfig.max_tokens,
      top_p: modelConfig.top_p,
      top_k: modelConfig.top_k,
      do_sample: modelConfig.do_sample,
      truncate: modelConfig.truncate,
    },
  };
  //   return {
  //     auth: "TFof5o2HCi89znJh2v",
  //     template: "chat",
  //     prompt: prompt,
  //     history: history,
  //     stream: options?.stream,
  //     model: modelConfig.model,
  //     temperature: modelConfig.temperature,
  //     presence_penalty: modelConfig.presence_penalty,
  //     max_new_tokens: modelConfig.max_tokens,
  //   };
};

function getHeaders() {
  const accessStore = useAccessStore.getState();
  const headers = {
    Authorization: "",
    auth: "",
  };

  const makeBearer = (token: string) => `Bearer ${token.trim()}`;
  const validString = (x: string) => x && x.length > 0;

  // use user's api key first
  if (validString(accessStore.token)) {
    headers.Authorization = makeBearer(accessStore.token);
  } else {
    headers.Authorization = makeBearer(accessStore.token);
  }
  headers.auth = accessStore.token;
  return headers;
}

export function requestOpenaiClient(path: string) {
  const openaiUrl = useAccessStore.getState().gptBaseUrl;
  return (body: any, method = "POST") =>
    fetch(openaiUrl + path, {
      method,
      body: body && JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
    });
}

export async function requestChat(
  messages: Message[],
  options?: {
    model?: string;
  },
) {
  const req: ChatRequestHF = makeRequestParam(messages, {
    overrideModel: options?.model,
  });

  const res = await requestOpenaiClient("generate")(req);

  try {
    const response = (await res.json()) as ChatResponseHF;
    return response;
  } catch (error) {
    console.error("[Request Chat] ", error, res.body);
  }
}

export async function requestUsage() {
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
      .getDate()
      .toString()
      .padStart(2, "0")}`;
  const ONE_DAY = 1 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = formatDate(startOfMonth);
  const endDate = formatDate(new Date(Date.now() + ONE_DAY));

  const [used, subs] = await Promise.all([
    requestOpenaiClient(
      `dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
    )(null, "GET"),
    requestOpenaiClient("dashboard/billing/subscription")(null, "GET"),
  ]);

  const response = (await used.json()) as {
    total_usage?: number;
    error?: {
      type: string;
      message: string;
    };
  };

  const total = (await subs.json()) as {
    hard_limit_usd?: number;
  };

  if (response.error && response.error.type) {
    showToast(response.error.message);
    return;
  }

  if (response.total_usage) {
    response.total_usage = Math.round(response.total_usage) / 100;
  }

  if (total.hard_limit_usd) {
    total.hard_limit_usd = Math.round(total.hard_limit_usd * 100) / 100;
  }

  return {
    used: response.total_usage,
    subscription: total.hard_limit_usd,
  };
}
function sleep(delay: any) {
  var start = new Date().getTime();
  while (new Date().getTime() - start < delay) {
    continue;
  }
}

export async function requestChatStream(
  messages: Message[],
  options?: {
    modelConfig?: ModelConfig;
    overrideModel?: string;
    onMessage: (message: string, done: boolean) => void;
    onError: (error: Error, statusCode?: number) => void;
    onController?: (controller: AbortController) => void;
  },
) {
  const req = makeRequestParam(messages, {
    stream: true,
    overrideModel: options?.overrideModel,
  });

  console.log("[Request] ", req);

  const controller = new AbortController();
  const reqTimeoutId = setTimeout(() => controller.abort(), TIME_OUT_MS);

  try {
    const openaiUrl = useAccessStore.getState().gptBaseUrl;
    const res = await fetch(openaiUrl + "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    clearTimeout(reqTimeoutId);

    let responseText = "";

    const finish = () => {
      options?.onMessage(responseText, true);
      controller.abort();
    };

    if (res.ok) {
      // const reader = res.body?.getReader();
      // const decoder = new TextDecoder("utf-8");

      options?.onController?.(controller);

      for await (const measurement of parseJsonStream(res.body)) {
        if (measurement.token.text !== "</s>") {
          responseText += measurement.token.text;
        }
      }

      // while (true) {
      //   const resTimeoutId = setTimeout(() => finish(), TIME_OUT_MS);
      //   const content = await reader?.read();
      //   console.log("content", content.value)
      //   clearTimeout(resTimeoutId);
      //   if (!content || !content.value) {
      //     break;
      //   }

      //   const text = decoder.decode(content.value, { stream: true });
      //   console.log("原始数据",text)
      //   let repl = text.replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\0/g,"");
      //   repl = repl.substring(5)
      //   console.log("替换数据数据",repl)
      //   const textJson=JSON.parse(String(repl).trim());
      //   console.log("JSON对象",text)
      //   let output = ""

      //   if(textJson && textJson.token){
      //     output =  textJson.token.text
      //   }else{
      //     output = "结果返回异常"
      //   }

      //   // 需要格式化数据
      // //   if (textJson.error_code == 0){
      // //     // output = textJson.text.substring(req.prompt.length)
      // //     output = textJson.text
      // //   }else{
      // //     output = textJson.text + " (error_code: {+"+ textJson.error_code +"+})"
      // //   }

      //   responseText += output;

      //   const done = content.done;
      //   options?.onMessage(responseText, false);

      //   if (done || textJson.error_code != 0) {
      //     break;
      //   }
      // }

      finish();
    } else if (res.status === 401) {
      console.error("Unauthorized");
      options?.onError(new Error("Unauthorized"), res.status);
    } else {
      console.error("Stream Error", res.body);
      options?.onError(new Error("Stream Error"), res.status);
    }
  } catch (err) {
    console.error("NetWork Error", err);
    options?.onError(err as Error);
  }
}

async function* parseJsonStream(readableStream: any) {
  for await (const line of readLines(readableStream.getReader())) {
    const trimmedLine = line.trim().replace(/,$/, "");
    const subLine = trimmedLine.substring(5);
    if (subLine.length > 0) {
      yield JSON.parse(subLine);
    }
  }
}

async function* readLines(reader: any) {
  const textDecoder = new TextDecoder();
  let partOfLine = "";
  for await (const chunk of readChunks(reader)) {
    const chunkText = textDecoder.decode(chunk);
    const chunkLines = chunkText.split("\n");
    if (chunkLines.length === 1) {
      partOfLine += chunkLines[0];
    } else if (chunkLines.length > 1) {
      yield partOfLine + chunkLines[0];
      for (let i = 1; i < chunkLines.length - 1; i++) {
        yield chunkLines[i];
      }
      partOfLine = chunkLines[chunkLines.length - 1];
    }
  }
}

function readChunks(reader: any) {
  return {
    async *[Symbol.asyncIterator]() {
      let readResult = await reader.read();
      while (!readResult.done) {
        yield readResult.value;
        readResult = await reader.read();
      }
    },
  };
}

export async function requestWithPrompt(
  messages: Message[],
  prompt: string,
  options?: {
    model?: string;
  },
) {
  messages = messages.concat([
    {
      role: "user",
      content: prompt,
      date: new Date().toLocaleString(),
    },
  ]);

  let req: ChatRequestHF = makeRequestParam(messages, {
    overrideModel: options?.model,
  });
  const res = await requestChat(messages, options);
  let output = "";
  // 需要格式化数据
  if (res) {
    output = res.generated_text;
  } else {
    output = "结果返回异常";
  }
  // if (res && res.error_code == 0){
  //     // output = res.text.substring(req.prompt.length)
  //     output = res.text
  // }else if(res){
  //     output = res.text + " (error_code: {+"+ res.error_code +"+})"
  // }
  return output;
}

export async function requestModelList() {
  return { models: ["default"] };
  const res = await requestOpenaiClient("list_models")(null);
  try {
    const response = (await res.json()) as ModelListResponse;
    return response;
  } catch (error) {
    console.error("[Request Chat] ", error, res.body);
  }
  return "";
}

// export async function requestChatStream(
//   messages: Message[],
//   options?: {
//     modelConfig?: ModelConfig;
//     overrideModel?: ModelType;
//     onMessage: (message: string, done: boolean) => void;
//     onError: (error: Error, statusCode?: number) => void;
//     onController?: (controller: AbortController) => void;
//   },
// ) {
//   const req = makeRequestParam(messages, {
//     stream: true,
//     overrideModel: options?.overrideModel,
//   });

//   console.log("[Request] ", req);

//   const controller = new AbortController();
//   const reqTimeoutId = setTimeout(() => controller.abort(), TIME_OUT_MS);

//   try {
//     const openaiUrl = useAccessStore.getState().openaiUrl;
//     const res = await fetch(openaiUrl + "v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         ...getHeaders(),
//       },
//       body: JSON.stringify(req),
//       signal: controller.signal,
//     });

//     clearTimeout(reqTimeoutId);

//     let responseText = "";

//     const finish = () => {
//       options?.onMessage(responseText, true);
//       controller.abort();
//     };

//     if (res.ok) {
//       const reader = res.body?.getReader();
//       const decoder = new TextDecoder();

//       options?.onController?.(controller);

//       while (true) {
//         const resTimeoutId = setTimeout(() => finish(), TIME_OUT_MS);
//         const content = await reader?.read();
//         clearTimeout(resTimeoutId);

//         if (!content || !content.value) {
//           break;
//         }

//         const text = decoder.decode(content.value, { stream: true });
//         responseText += text;

//         const done = content.done;
//         options?.onMessage(responseText, false);

//         if (done) {
//           break;
//         }
//       }

//       finish();
//     } else if (res.status === 401) {
//       console.error("Unauthorized");
//       options?.onError(new Error("Unauthorized"), res.status);
//     } else {
//       console.error("Stream Error", res.body);
//       options?.onError(new Error("Stream Error"), res.status);
//     }
//   } catch (err) {
//     console.error("NetWork Error", err);
//     options?.onError(err as Error);
//   }
// }

// export async function requestWithPrompt(
//   messages: Message[],
//   prompt: string,
//   options?: {
//     model?: ModelType;
//   },
// ) {
//   messages = messages.concat([
//     {
//       role: "user",
//       content: prompt,
//       date: new Date().toLocaleString(),
//     },
//   ]);

//   const res = await requestChat(messages, options);

//   return res?.choices?.at(0)?.message?.content ?? "";
// }

// To store message streaming controller
export const ControllerPool = {
  controllers: {} as Record<string, AbortController>,

  addController(
    sessionIndex: number,
    messageId: number,
    controller: AbortController,
  ) {
    const key = this.key(sessionIndex, messageId);
    this.controllers[key] = controller;
    return key;
  },

  stop(sessionIndex: number, messageId: number) {
    const key = this.key(sessionIndex, messageId);
    const controller = this.controllers[key];
    controller?.abort();
  },

  stopAll() {
    Object.values(this.controllers).forEach((v) => v.abort());
  },

  hasPending() {
    return Object.values(this.controllers).length > 0;
  },

  remove(sessionIndex: number, messageId: number) {
    const key = this.key(sessionIndex, messageId);
    delete this.controllers[key];
  },

  key(sessionIndex: number, messageIndex: number) {
    return `${sessionIndex},${messageIndex}`;
  },
};
