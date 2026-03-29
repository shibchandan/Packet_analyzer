import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "server", "data");


export const config = {
  port: Number(process.env.PORT || 8000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/dpi_dashboard",
  rootDir: ROOT_DIR,
  enginePath: path.join(ROOT_DIR, "dpi_engine.exe"),
  uploadsDir: path.join(DATA_DIR, "uploads"),
  outputsDir: path.join(DATA_DIR, "outputs"),
  reportsDir: path.join(DATA_DIR, "reports"),
  logsDir: path.join(DATA_DIR, "logs")
};
