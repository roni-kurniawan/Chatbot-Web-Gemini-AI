import { handleHealthCheck } from "./_geminiCore";

export default function handler(req: any, res: any) {
  return handleHealthCheck(req, res);
}
