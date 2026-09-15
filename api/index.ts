import healthHandler from "./health";

export default function handler(req: any, res: any) {
  return healthHandler(req, res);
}
