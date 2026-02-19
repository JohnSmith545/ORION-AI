#!/bin/bash
# ============================================================================
# ORION AI - Phase 1: Vertex & Firestore Setup
# ============================================================================
# This script automates the setup of GCP resources for ORION AI.
# 1. Enables required APIs
# 2. Configures Firestore (Native Mode)
# 3. Sets up IAM roles for Service Accounts

set -euo pipefail

# CONFIGURATION - Replace these with your actual values
PROJECT_ID="orion-ai-487801"
RUNTIME_SA_EMAIL="orion-ai-sa@orion-ai-487801.iam.gserviceaccount.com"
CLOUDBUILD_SA_EMAIL="489484698044@cloudbuild.gserviceaccount.com"

echo "Starting Phase 1 Setup for project: ${PROJECT_ID}"

# STEP 1: Enable APIs
echo "Enabling Vertex AI and Firestore APIs..."
gcloud services enable aiplatform.googleapis.com \
    firestore.googleapis.com \
    --project="${PROJECT_ID}"

# STEP 2: Configure Firestore
echo "Ensuring Firestore is in Native Mode..."
# Note: If already created, this command will safely error if trying to change mode.
# We skip if it already exists.
if ! gcloud firestore databases list --project="${PROJECT_ID}" | grep -q "(default)"; then
    echo "Creating Firestore Database (Native Mode) in us-central1..."
    gcloud firestore databases create --location=us-central1 --type=firestore-native --project="${PROJECT_ID}"
else
    echo "Firestore '(default)' database already exists."
fi

# STEP 3: Setup IAM Roles
echo "Granting roles to Runtime Service Account..."
ROLES=(
    "roles/aiplatform.user"
    "roles/datastore.user"
    "roles/storage.objectViewer"
)

for ROLE in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
        --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
        --role="${ROLE}" --quiet
done

echo "Granting roles to Cloud Build Service Account..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
    --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUDBUILD_SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser" --quiet

# STEP 4: Create Vector Index (Manual Step often required via Console or gcloud alpha)
echo "------------------------------------------------------------"
echo "SETUP COMPLETED SUCCESSFULLY"
echo "------------------------------------------------------------"
echo "Next Steps:"
echo "1. Create the composite vector index for the 'chunks' collection."
echo "   Run the following if your gcloud supports it:"
echo "   gcloud alpha firestore indexes composite create \\"
echo "     --collection-group=chunks \\"
echo "     --field-config field-path=embedding_field,vector-config='{\"dimension\":\"3072\",\"flat\":{}}'"
echo ""
echo "2. Update your .env file with:"
echo "   GOOGLE_CLOUD_PROJECT=orion-ai-487801"
echo "   GOOGLE_CLOUD_LOCATION=us-central1"
echo "------------------------------------------------------------"