import fs from "fs";

import { config } from "../config.js";


export function ensureDirs() {
  [config.uploadsDir, config.outputsDir, config.reportsDir, config.logsDir].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });
}
