declare module "mammoth" {
  export interface Result {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface Input {
    buffer?: Buffer;
    path?: string;
  }

  export function extractRawText(input: Input): Promise<Result>;
  export function convertToMarkdown(input: Input): Promise<Result>;
  export function convertToHtml(input: Input): Promise<Result>;

  const mammoth: {
    extractRawText: typeof extractRawText;
    convertToMarkdown: typeof convertToMarkdown;
    convertToHtml: typeof convertToHtml;
  };

  export default mammoth;
}
