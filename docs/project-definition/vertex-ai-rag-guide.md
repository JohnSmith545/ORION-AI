Below is a “cheap-but-real” Vertex AI RAG setup that avoids RAG Engine, uses Vertex AI Vector Search, ingests from Cloud Storage + external APIs, stores source docs in Firestore, and serves a Gemini chatbot from Firebase (React + Cloud Functions, TypeScript).
Key “latest” notes I’m basing this on:
Google’s recommended JS/TS SDK is now Google Gen AI SDK (@google/genai) for both Gemini Developer API and Vertex AI. (Google Cloud Documentation)
Vertex AI’s older “Generative AI module” in the Vertex AI SDK is being deprecated (removal date June 24, 2026), so you should build new work on @google/genai. (Google Cloud Documentation)
@google/genai latest version is currently reported as 1.41.0. (npm)
For embeddings on Vertex AI, gemini-embedding-001 is documented (3072 dimensions). (Google Cloud Documentation)
Vector Search has a baseline monthly cost because the deployed index runs on VMs (“even a minimal setup (under $100/month)…”). (Google Cloud Documentation)

1. Architecture (simple + cost-aware)
   Client (React on Firebase Hosting)
   → calls Firebase Cloud Functions (Node 20 / TypeScript) for:
   Ingest (admin-only): pull from GCS + external APIs → chunk → embed → upsert to Vector Search
   Chat: embed query → Vector Search nearest neighbors → Gemini generate → return answer + citations
   Storage
   Firestore: store canonical docs + chunk text + metadata (source URL, timestamps, ACL, etc.)
   Vertex AI Vector Search: store only vectors + minimal metadata (datapoint id, doc id, tags)
   Why this stays cheap:
   No always-on “RAG Engine reserved resources”
   You still pay for Vector Search endpoint uptime, but everything else is pay-per-use (Functions, embeddings, Gemini tokens).

2. One-time setup (GCP + Firebase)
   A) Enable APIs
   In your GCP project:
   Vertex AI API (aiplatform.googleapis.com) (Google Cloud Documentation)
   Firestore / Firebase as usual
   B) Create the Vector Search index + endpoint
   You can do this via Console or gcloud. The important part is: index dimension must match your embedding model (e.g., gemini-embedding-001 = 3072 dims). (Google Cloud Documentation)
   Cost tip: start with one small index and one public endpoint (private endpoints add networking complexity/cost). You can tighten security via IAM and by keeping all calls server-side.
   C) IAM for your Firebase Functions service account
   Grant the service account running Cloud Functions:
   Vertex AI User (or more specific permissions if you prefer tight IAM)
   Firestore access
   Storage Object Viewer (for ingestion from GCS)

3. Data model (Firestore + Vector Search IDs)
   Firestore collections
   docs/{docId}
   sourceType: "gcs" | "api"
   sourceUri
   title
   createdAt, updatedAt
   docs/{docId}/chunks/{chunkId}
   text
   tokenCountApprox
   vectorDatapointId (stable ID you also use in Vector Search)
   Vector Search datapoint
   datapointId: e.g. docId_chunkId
   featureVector: embedding floats
   optional restrict/filter metadata: (docId, sourceType, tags, tenantId)

4. Firebase Functions (TypeScript) — core code
   Install deps (functions)
   cd functions
   npm i @google/genai firebase-admin firebase-functions google-auth-library
   You’ll use @google/genai for Gemini on Vertex AI. (Google Cloud Documentation)
   functions/src/env.ts
   export const ENV = {
   projectId: process.env.GOOGLE_CLOUD_PROJECT!,
   location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
   // Vector Search
   vectorIndexResourceName: process.env.VECTOR_INDEX_RESOURCE_NAME!,
   // format: projects/{p}/locations/{loc}/indexes/{indexId}
   vectorEndpointResourceName: process.env.VECTOR_ENDPOINT_RESOURCE_NAME!,
   // format: projects/{p}/locations/{loc}/indexEndpoints/{endpointId}
   embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-001",
   chatModel: process.env.CHAT_MODEL || "gemini-2.5-flash", // adjust if you prefer
   };
   A) Google auth helper (server-side ADC)
   import { GoogleAuth } from "google-auth-library";

export async function getAuthClient() {
const auth = new GoogleAuth({
scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
return auth.getClient();
}

export async function getAccessToken(): Promise<string> {
const client = await getAuthClient();
const tokenResp = await client.getAccessToken();
if (!tokenResp.token) throw new Error("No access token");
return tokenResp.token;
}
B) Embeddings call (Vertex AI embeddings API)
Vertex docs show gemini-embedding-001 and discuss token limits + dimensionality options. (Google Cloud Documentation)
Using @google/genai for embeddings keeps it consistent with your chat stack.
import { GoogleGenAI } from "@google/genai";
import { ENV } from "./env";

function vertexClient() {
// These env vars tell the SDK to use Vertex AI with ADC
process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
process.env.GOOGLE_CLOUD_PROJECT = ENV.projectId;
process.env.GOOGLE_CLOUD_LOCATION = ENV.location;
return new GoogleGenAI({});
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
const ai = vertexClient();
const resp = await ai.models.embedContent({
model: ENV.embeddingModel,
contents: texts.map((t) => ({ role: "user", parts: [{ text: t }] })),
});

// SDK response shape can evolve; keep defensive parsing.
const vectors =
resp.embeddings?.map((e: any) => e.values as number[]) ??
resp.data?.map((e: any) => e.embedding?.values as number[]) ??
[];

if (vectors.length !== texts.length) {
throw new Error(`Embedding count mismatch: got ${vectors.length}, expected ${texts.length}`);
}
return vectors;
}
C) Upsert vectors into Vector Search (REST: indexes.upsertDatapoints)
Google documents an indexes.upsertDatapoints REST method. (Google Cloud Documentation)
import { getAccessToken } from "./auth";
import { ENV } from "./env";

type Datapoint = {
datapointId: string;
featureVector: number[];
restricts?: Array<{ namespace: string; allowList: string[] }>;
};

export async function upsertDatapoints(datapoints: Datapoint[]) {
const token = await getAccessToken();
const url = `https://${ENV.location}-aiplatform.googleapis.com/v1/${ENV.vectorIndexResourceName}:upsertDatapoints`;

const res = await fetch(url, {
method: "POST",
headers: {
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
},
body: JSON.stringify({ datapoints }),
});

if (!res.ok) {
const body = await res.text();
throw new Error(`upsertDatapoints failed: ${res.status} ${body}`);
}
}
D) Query Vector Search (REST: indexEndpoints.findNeighbors)
import { getAccessToken } from "./auth";
import { ENV } from "./env";

export async function findNeighbors(queryVector: number[], k = 8) {
const token = await getAccessToken();
const url = `https://${ENV.location}-aiplatform.googleapis.com/v1/${ENV.vectorEndpointResourceName}:findNeighbors`;

const res = await fetch(url, {
method: "POST",
headers: {
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
},
body: JSON.stringify({
deployedIndexId: process.env.VECTOR_DEPLOYED_INDEX_ID, // from deploy step
queries: [
{
datapoint: { featureVector: queryVector },
neighborCount: k,
},
],
}),
});

if (!res.ok) {
const body = await res.text();
throw new Error(`findNeighbors failed: ${res.status} ${body}`);
}

const json = await res.json();
// Expect something like: nearestNeighbors[0].neighbors[]
return json.nearestNeighbors?.[0]?.neighbors ?? [];
}
E) Chat endpoint (RAG + Gemini)
Use the Google Gen AI SDK (recommended) and keep the key logic server-side. (Google Cloud Documentation)
import \* as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { GoogleGenAI } from "@google/genai";
import { ENV } from "./env";
import { embedTexts } from "./embeddings";
import { findNeighbors } from "./vectorSearch";

admin.initializeApp();
const db = admin.firestore();

function vertexClient() {
process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
process.env.GOOGLE_CLOUD_PROJECT = ENV.projectId;
process.env.GOOGLE_CLOUD_LOCATION = ENV.location;
return new GoogleGenAI({});
}

export const chat = onCall({ cors: true, region: ENV.location }, async (req) => {
const question = String(req.data?.question || "").trim();
if (!question) throw new Error("Missing question");

// 1) embed the query
const [qVec] = await embedTexts([question]);

// 2) vector search
const neighbors = await findNeighbors(qVec, 8);

// 3) fetch chunk texts from Firestore
const chunkRefs = neighbors.map((n: any) => n.datapoint?.datapointId).filter(Boolean);

const chunks: Array<{ id: string; text: string; sourceUri?: string; title?: string }> = [];
for (const id of chunkRefs) {
// if your id is docId*chunkId, parse it:
const [docId, chunkId] = String(id).split("*", 2);
const snap = await db.doc(`docs/${docId}/chunks/${chunkId}`).get();
if (!snap.exists) continue;

    const chunk = snap.data() as any;
    const docSnap = await db.doc(`docs/${docId}`).get();
    const doc = docSnap.data() as any;

    chunks.push({
      id,
      text: chunk.text,
      sourceUri: doc?.sourceUri,
      title: doc?.title,
    });

}

// 4) prompt Gemini with grounded context
const ai = vertexClient();

const contextBlock = chunks
.slice(0, 6)
.map((c, i) => `SOURCE ${i + 1}\nTitle: ${c.title || "Untitled"}\nURI: ${c.sourceUri || "unknown"}\nText:\n${c.text}`)
.join("\n\n---\n\n");

const system = `You are a helpful assistant. Answer using ONLY the provided sources when possible.
If sources are insufficient, say what is missing and suggest what to ingest next.
Always include a "Sources" section that lists which SOURCE numbers you used.`;

const resp = await ai.models.generateContent({
model: ENV.chatModel,
contents: [
{ role: "user", parts: [{ text: `SYSTEM:\n${system}\n\nCONTEXT:\n${contextBlock}\n\nQUESTION:\n${question}` }] },
],
});

return {
answer: resp.text ?? "",
sources: chunks.map((c, i) => ({
sourceNo: i + 1,
title: c.title,
uri: c.sourceUri,
datapointId: c.id,
})),
};
});

5. Ingestion pipeline (GCS + API) — patterns you can copy
   A) Chunking (simple heuristic)
   Keep it simple to start: split by headings/newlines and cap by character length.
   export function chunkText(text: string, maxChars = 1200): string[] {
   const paras = text.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
   const chunks: string[] = [];
   let buf = "";

for (const p of paras) {
if ((buf + "\n\n" + p).length > maxChars) {
if (buf) chunks.push(buf);
buf = p;
} else {
buf = buf ? `${buf}\n\n${p}` : p;
}
}
if (buf) chunks.push(buf);
return chunks;
}
B) Ingest from an external API (callable admin function)
import { onCall } from "firebase-functions/v2/https";
import \* as admin from "firebase-admin";
import { chunkText } from "./chunking";
import { embedTexts } from "./embeddings";
import { upsertDatapoints } from "./vectorSearch";

const db = admin.firestore();

export const ingestFromApi = onCall({ cors: true, region: "us-central1" }, async (req) => {
// TODO: check auth / admin claim here
const url = String(req.data?.url || "");
if (!url) throw new Error("Missing url");

const res = await fetch(url);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const raw = await res.text();

const docRef = await db.collection("docs").add({
sourceType: "api",
sourceUri: url,
title: url,
createdAt: admin.firestore.FieldValue.serverTimestamp(),
updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

const chunks = chunkText(raw);
const vectors = await embedTexts(chunks);

const batch = db.batch();
const datapoints = chunks.map((text, i) => {
const chunkId = String(i).padStart(4, "0");
const datapointId = `${docRef.id}_${chunkId}`;

    batch.set(docRef.collection("chunks").doc(chunkId), {
      text,
      vectorDatapointId: datapointId,
      tokenCountApprox: Math.ceil(text.length / 4),
    });

    return {
      datapointId,
      featureVector: vectors[i],
      restricts: [{ namespace: "docId", allowList: [docRef.id] }],
    };

});

await batch.commit();
await upsertDatapoints(datapoints);

return { docId: docRef.id, chunkCount: chunks.length };
});
C) Ingest from Cloud Storage (event trigger)
Use onObjectFinalized and parse file types you care about (start with .txt / .md / .json). PDFs need extraction; keep that for later to stay cheap.

6. React (Firebase Hosting) — minimal chat UI (TypeScript)
   Install client deps
   npm i firebase
   src/firebase.ts
   import { initializeApp } from "firebase/app";
   import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
// your config
};

export const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app);
export const chatCallable = httpsCallable(functions, "chat");
src/Chat.tsx
import React, { useState } from "react";
import { chatCallable } from "./firebase";

type Msg = { role: "user" | "assistant"; text: string };

export function Chat() {
const [messages, setMessages] = useState<Msg[]>([]);
const [input, setInput] = useState("");

async function send() {
const q = input.trim();
if (!q) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");

    const resp = await chatCallable({ question: q });
    const data = resp.data as any;

    setMessages((m) => [...m, { role: "assistant", text: data.answer ?? "(no response)" }]);

}

return (

<div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
<h2>RAG Chat</h2>

      <div style={{ border: "1px solid #ddd", padding: 12, minHeight: 360 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "10px 0" }}>
            <b>{m.role === "user" ? "You" : "Bot"}:</b> {m.text}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ flex: 1, padding: 10 }}
          placeholder="Ask a question…"
        />
        <button onClick={send} style={{ padding: "10px 14px" }}>
          Send
        </button>
      </div>
    </div>

);
}

7. Cost controls that matter in practice
   Vector Search endpoint is the “always-on” cost. Keep one endpoint, one index, don’t over-provision. Google explicitly notes even minimal setups can be under ~$100/month, but it won’t be $0. (Google Cloud Documentation)
   Use Gemini Flash-tier models for chat by default, reserve “Pro” for premium routes. The Gen AI SDK docs mention Gemini 2.x / 2.5 model families supported. (Google Cloud Documentation)
   Chunk small, retrieve small (e.g., top 6 chunks), and keep prompts tight.
   Batch embedding during ingestion (up to the API’s per-request limits). (Google Cloud Documentation)
   Don’t embed PDFs/images until you must.

8. What you need to fill in (project-specific)
   Your index resource name, endpoint resource name, and deployedIndexId (from the deploy step)
   Your ingestion adapters (which APIs, auth, rate limits)
   An authorization rule so only admins can call ingestion
   If you paste your intended doc types (txt/md/html/pdf?) and one example external API you want to ingest, I can tailor the ingestion function to those formats and add a clean metadata + filtering scheme (tenant/project tags, doc types, date ranges) for Vector Search restricts.
