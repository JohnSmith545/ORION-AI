Hi everyone,

My advise about RAG infrastructure and costs, I wanted to share a workflow I use for my own projects. When building RAG apps, it’s easy to accidentally burn through free credits if you use enterprise-grade infrastructure.

To keep costs essentially at $0, we need to separate the two parts of RAG: The Model (which generates embeddings) and The Database (which stores and searches them).

1. The Enterprise Route (Vertex AI Vector Search)
   This is Google’s massive, ultra-fast vector database. It is designed to search millions of vectors in sub-milliseconds. It’s what you use for production-scale apps. To be that fast, it requires deploying an "Index Endpoint." This means dedicated servers are kept awake 24/7, and you are billed by the "node hour." Even if nobody is using your app, it will constantly drain your budget just sitting idle.

2. The Low-Cost "Hacker" Route (Firestore Native Vector Search)
   Google recently added kNN vector search directly into standard Firestore. Because Firestore is serverless, you only pay for the exact read/write operations you perform. If your app is idle, it costs $0.00.

How I do it:

Document Storage. Store my raw PDFs either locally in my codebase or in a basic Google Cloud Storage bucket.

Chunk & Embed (The Python Script). Write a simple Python script to read the PDFs, extract the text, and break it into chunks. Pass those chunks to a text embedding model (like text-embedding-004). You’ll pay a fraction of a cent per 1,000 characters to turn the text into vectors.

Save to Firestore. Take those vectors and save them directly into Firestore as standard NoSQL documents, alongside the original text chunk.

Query. When a user asks a question, embed their question, and use Firestore’s native findNearest() function to find the closest matching documents.

Hope this helps anyone planning their architecture!
