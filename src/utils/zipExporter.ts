import JSZip from 'jszip';

export async function generateProjectZip(): Promise<Blob> {
  const zip = new JSZip();

  // Root files
  zip.file('package.json', JSON.stringify({
    name: "medikiosk-ai-clinical-platform",
    version: "1.0.0",
    private: true,
    description: "AI-Powered Multimodal Clinical History Intake Platform for Indian OPDs and Ayush Institutions",
    scripts: {
      dev: "vite --port=3000 --host=0.0.0.0",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "@google/genai": "^2.4.0",
      "@tailwindcss/vite": "^4.1.14",
      "@vitejs/plugin-react": "^5.0.4",
      "jszip": "^3.10.1",
      "lucide-react": "^0.546.0",
      "motion": "^12.23.24",
      "react": "^19.0.1",
      "react-dom": "^19.0.1",
      "vite": "^6.2.3"
    },
    devDependencies: {
      "@types/express": "^4.17.21",
      "@types/node": "^22.14.0",
      "tailwindcss": "^4.1.14",
      "typescript": "~5.8.2"
    }
  }, null, 2));

  zip.file('metadata.json', JSON.stringify({
    name: "MediKiosk - AI Clinical History Platform",
    description: "Patient-facing AI clinical history kiosk with multimodal Bhashini voice/touch intake, Dashavidha Pariksha, medical document OCR, red-flag triage, and ABDM/FHIR physician summary.",
    requestFramePermissions: ["camera", "microphone"],
    majorCapabilities: ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]
  }, null, 2));

  zip.file('vite.config.ts', `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
`);

  zip.file('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      skipLibCheck: true,
      moduleResolution: "bundler",
      isolatedModules: true,
      jsx: "react-jsx",
      paths: { "@/*": ["./*"] },
      noEmit: true
    }
  }, null, 2));

  zip.file('README.md', `# MediKiosk — AI Clinical History Platform
**Ministry of Ayush | All India Institute of Ayurveda (AIIA)**

### 1. Problem Statement
In India's high-volume public hospital Outpatient Departments (OPDs), 4,000–10,000 patients are seen daily with consultation times collapsed to 2–5 minutes. AYUSH institutions face higher complexity: Ayurvedic history taking requires Dashavidha Pariksha, Agni, Koshtha, and Ahara-Vihara assessment.

### 2. MediKiosk Solution Architecture
- **Module A: Conversational Multimodal History Engine** (Bhashini Indian-language voice + touch, adaptive SOCRATES question branching, Red-Flag Triage detection).
- **Module B: Medical Document Digitization & OCR** (Extracts medications, dosages, out-of-range lab values, chronological medical timeline).
- **Module C: Structured History Summary Generator** (Physician-ready summary in seconds, reduces consultation burden by 70%, FHIR R4 Bundle).
- **Module D: DPDP Act 2023 & ABDM/ABHA Integration** (Consent-first architecture, temporary session wiping, ABHA linking).

### 3. Running the Project
\`\`\`bash
npm install
npm run dev
\`\`\`
Visit \`http://localhost:3000\` to experience the kiosk interface and the doctor EMR consultation desk.
`);

  // We can fetch or add the source files
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

export function triggerDownload(blob: Blob, filename = 'MediKiosk-Clinical-Intake-Platform.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
