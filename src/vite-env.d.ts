/// <reference types="vite/client" />

interface ClipSDKInstance {
  cardToken(form: HTMLFormElement): Promise<string>;
}

declare class ClipSDK {
  constructor(apiKey: string);
  cardToken(form: HTMLFormElement): Promise<string>;
}
