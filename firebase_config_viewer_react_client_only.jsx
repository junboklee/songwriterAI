import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileJson, Eye, EyeOff, Copy, CheckCheck, Download, Trash2, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// --- Types ---
/**
 * @typedef {Object} ServiceAccountJSON
 * @property {string} [type]
 * @property {string} [project_id]
 * @property {string} [private_key_id]
 * @property {string} [private_key]
 * @property {string} [client_email]
 * @property {(string|number)} [client_id]
 * @property {string} [auth_uri]
 * @property {string} [token_uri]
 * @property {string} [auth_provider_x509_cert_url]
 * @property {string} [client_x509_cert_url]
 * @property {string} [universe_domain]
 */

// --- Small helpers ---
const fieldLabels = {
  type: "Type",
  project_id: "Project ID",
  private_key_id: "Private Key ID",
  private_key: "Private Key",
  client_email: "Client Email",
  client_id: "Client ID",
  auth_uri: "Auth URI",
  token_uri: "Token URI",
  auth_provider_x509_cert_url: "Auth Provider x509 Cert URL",
  client_x509_cert_url: "Client x509 Cert URL",
  universe_domain: "Universe Domain",
};

const SENSITIVE_KEYS = new Set([
  "private_key",
  "private_key_id",
  "client_email",
  "client_id",
]);

function mask(value, show = false) {
  if (show || value === undefined || value === null) return String(value ?? "");
  const str = String(value);
  const maskChar = '*';
  if (str.length <= 8) return maskChar.repeat(Math.max(4, str.length));
  const head = str.slice(0, 4);
  const tail = str.slice(-4);
  return `${head}${maskChar.repeat(Math.max(4, str.length - 8))}${tail}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Main Component ---
export default function FirebaseConfigViewer() {
  const [json, setJson] = useState(null);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [justCopiedKey, setJustCopiedKey] = useState("");
  const inputRef = useRef(null);

  const onFiles = useCallback(
    /**
     * @param {FileList | null} files
     */
    async (files) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      try {
        const text = await file.text();
        const clean = text.replace(/^﻿/, ""); // strip BOM if present
        setRawText(clean);

        const looksLikeJson =
          file.name.toLowerCase().endsWith(".json") ||
          file.type.includes("json") ||
          clean.trim().startsWith("{");
        if (!looksLikeJson) {
          setError("파일 형식이 JSON으로 보이지 않습니다. 그래도 내용을 확인해 볼게요.");
        } else {
          setError("");
        }

        let data;
        try {
          data = JSON.parse(clean);
        } catch (e) {
          setJson(null);
          setError('JSON parsing failed: please confirm the file contains valid JSON such as { "type": "service_account", ... }.');
          return;
        }

        const missing = [];
        if (!data.project_id) missing.push("project_id");
        if (!data.client_email) missing.push("client_email");
        if (!data.private_key) missing.push("private_key");

        setJson(data);
        if (missing.length > 0) {
          setError(`JSON은 파싱되었지만 Firebase 서비스 계정 키로 보이지 않습니다. 누락된 필드: ${missing.join(", ")}`);
        } else {
          setError("");
        }
      } catch (e) {
        setError("파일을 읽는 중 오류가 발생했습니다. 다시 시도하거나 다른 파일을 선택하세요.");
        setJson(null);
      }
    },
    []
  );

const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const handleBrowse = useCallback(() => inputRef.current?.click(), []);

  const derived = useMemo(() => {
    if (!json) return null;
    const projectId = json.project_id ?? "";
    const email = json.client_email ?? "";
    const keyId = json.private_key_id ?? "";
    const hasKey = Boolean(json.private_key);

    // .env suggestion for Firebase Admin SDK in Node
    const env = [
      `FIREBASE_PROJECT_ID=${projectId}`,
      `FIREBASE_CLIENT_EMAIL=${email}`,
      // Ensure newlines are preserved using JSON.stringify trick in docs; here we just keep raw.
      `FIREBASE_PRIVATE_KEY="${(json.private_key ?? "").replace(/\n/g, "\\n")}"`,
    ].join("\n");

    return { projectId, email, keyId, hasKey, env };
  }, [json]);

  const reset = () => {
    setJson(null);
    setRawText("");
    setError("");
    setShowSecrets(false);
    setJustCopiedKey("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPaste = useCallback(() => {
    try {
      const data = JSON.parse(rawText);
      setJson(data);
      setError("");
    } catch {
      setError("Text area does not contain valid JSON.");
      setJson(null);
    }
  }, [rawText]);

  return (
    <div className="min-h-[100vh] w-full bg-gradient-to-b from-neutral-950 to-neutral-900 text-neutral-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Firebase Config Viewer</h1>
            <p className="text-neutral-300 mt-1">Upload your <span className="font-semibold">service account JSON</span> to securely view and copy credentials. Everything stays <span className="font-semibold">client‑side</span>.</p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-300">
            <ShieldCheck className="w-4 h-4" /> Client‑side only • No uploads
          </div>
        </header>

        {/* Uploader */}
        {!json ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <Card className="bg-neutral-900/60 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Upload className="w-5 h-5"/> Upload file</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  className="rounded-2xl border-2 border-dashed border-neutral-700 hover:border-neutral-500 transition-colors p-8 text-center cursor-pointer"
                  onClick={handleBrowse}
                >
                  <FileJson className="w-12 h-12 mx-auto mb-3"/>
                  <p className="font-medium">Drag & drop your <code>.json</code> here</p>
                  <p className="text-neutral-400 text-sm">or click to choose a file</p>
                  <Input ref={inputRef} type="file" accept=".json,.txt,application/json,application/octet-stream" className="hidden" onChange={(e) => onFiles(e.target.files)} />
                </div>
                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Info className="w-5 h-5"/> Or paste JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[200px] bg-neutral-950 border-neutral-800"
                  placeholder={`{
  "type": "service_account",
  "project_id": "your-project",
  ...
}`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <Button onClick={onPaste} className="">Parse JSON</Button>
                  <Button variant="secondary" onClick={() => setRawText("")}>Clear</Button>
                </div>
                <p className="text-xs text-neutral-400 mt-2">Tip: Never share this JSON publicly. Keep it in secure secrets or environment variables.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Summary Row */}
            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="bg-neutral-900/60 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-base">Project</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold truncate" title={derived?.projectId}>{derived?.projectId || "—"}</p>
                  <p className="text-xs text-neutral-400 mt-1">project_id</p>
                </CardContent>
              </Card>
              <Card className="bg-neutral-900/60 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-base">Service Account</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-medium truncate" title={json.client_email}>{json.client_email || "—"}</p>
                  <p className="text-xs text-neutral-400 mt-1">client_email</p>
                </CardContent>
              </Card>
              <Card className="bg-neutral-900/60 border-neutral-800">
                <CardHeader className="pb-2"><CardTitle className="text-base">Key</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-medium truncate" title={json.private_key_id}>{json.private_key_id || "—"}</p>
                  <p className="text-xs text-neutral-400 mt-1">private_key_id</p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setShowSecrets((s) => !s)} variant="secondary" className="">
                {showSecrets ? <EyeOff className="w-4 h-4 mr-2"/> : <Eye className="w-4 h-4 mr-2"/>}
                {showSecrets ? "Hide secrets" : "Show secrets"}
              </Button>
              <Button onClick={() => download(".env.local", derived?.env || "")}>
                <Download className="w-4 h-4 mr-2"/> Download .env
              </Button>
              <Button variant="destructive" onClick={reset}>
                <Trash2 className="w-4 h-4 mr-2"/> Remove data
              </Button>
            </div>

            {/* Key/Value Grid */}
            <Card className="bg-neutral-900/60 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Credentials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(json).map(([k, v]) => {
                    const label = fieldLabels[k] ?? k;
                    const sensitive = SENSITIVE_KEYS.has(k);
                    const value = typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v, null, 2);
                    const display = sensitive ? mask(value, showSecrets) : value;
                    const isMultiline = (value?.includes?.("\n") || value.length > 120);

                    const onCopy = async () => {
                      const ok = await copyText(String(value));
                      if (ok) {
                        setJustCopiedKey(k);
                        setTimeout(() => setJustCopiedKey(""), 1500);
                      }
                    };

                    return (
                      <div key={k} className="group border border-neutral-800 rounded-2xl p-3 bg-neutral-950/50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-neutral-400">{label}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-70 group-hover:opacity-100" onClick={onCopy}>
                            {justCopiedKey === k ? <CheckCheck className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                          </Button>
                        </div>
                        {isMultiline ? (
                          <pre className="mt-2 text-xs whitespace-pre-wrap break-all bg-neutral-900/60 rounded-xl p-3 border border-neutral-800">
                            {display}
                          </pre>
                        ) : (
                          <p className="mt-2 text-sm break-all select-text">{display || "—"}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Admin SDK .env helper */}
            <Card className="bg-neutral-900/60 border-neutral-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Use with Firebase Admin SDK (.env)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-300">Add the following to your environment variables (e.g., <code>.env.local</code> for Next.js). Ensure the private key preserves newlines as <code>\\n</code>.</p>
                <pre className="mt-3 text-xs bg-neutral-950 border border-neutral-800 rounded-xl p-3 overflow-x-auto">
{derived?.env}
                </pre>
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => copyText(derived?.env || "").then(() => setJustCopiedKey("ENV"))}>
                    {justCopiedKey === "ENV" ? <CheckCheck className="w-4 h-4 mr-2"/> : <Copy className="w-4 h-4 mr-2"/>}
                    Copy block
                  </Button>
                  <Button variant="secondary" onClick={() => download(".env.local", derived?.env || "")}>
                    <Download className="w-4 h-4 mr-2"/> Download .env
                  </Button>
                </div>
                <p className="text-xs text-neutral-400 mt-2">Note: Service account JSON <span className="font-semibold">does not include</span> client SDK fields like <code>apiKey</code>. Those live in your web app config from the Firebase Console.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <footer className="mt-10 text-xs text-neutral-400">
          <p>Security tip: Keep keys out of source control. Use secret managers (Vercel/Cloud Run/1Password) and rotate compromised keys in the Google Cloud Console.</p>
        </footer>
      </div>
    </div>
  );
}
