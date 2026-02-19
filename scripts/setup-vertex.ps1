# ============================================================================
# ORION AI - Phase 1: Vertex & Firestore Setup (PowerShell)
# ============================================================================
# This script automates the setup of GCP resources for ORION AI.

$ErrorActionPreference = "Stop"

# CONFIGURATION
$PROJECT_ID = "orion-ai-487801"
$RUNTIME_SA_EMAIL = "orion-ai-sa@orion-ai-487801.iam.gserviceaccount.com"
$CLOUDBUILD_SA_EMAIL = "489484698044@cloudbuild.gserviceaccount.com"

Write-Host "Starting Phase 1 Setup for project: $PROJECT_ID" -ForegroundColor Cyan

# STEP 1: Enable APIs
Write-Host "Enabling Vertex AI, Firestore, and Cloud Build APIs..." -ForegroundColor Yellow
gcloud services enable aiplatform.googleapis.com firestore.googleapis.com cloudbuild.googleapis.com --project=$PROJECT_ID

# STEP 2: Configure Firestore
Write-Host "Checking Firestore database status..." -ForegroundColor Yellow
$databases = gcloud firestore databases list --project=$PROJECT_ID --format="value(name)"
if ($databases -notcontains "(default)") {
    Write-Host "Creating Firestore Database (Native Mode) in us-central1..." -ForegroundColor Yellow
    gcloud firestore databases create --location=us-central1 --type=firestore-native --project=$PROJECT_ID
} else {
    Write-Host "Firestore '(default)' database already exists." -ForegroundColor Green
}

# STEP 3: Setup IAM Roles
Write-Host "Granting roles to Runtime Service Account..." -ForegroundColor Yellow
$runtimeRoles = @(
    "roles/aiplatform.user",
    "roles/datastore.user",
    "roles/storage.objectViewer"
)

foreach ($role in $runtimeRoles) {
    gcloud projects add-iam-policy-binding $PROJECT_ID `
        --member="serviceAccount:$RUNTIME_SA_EMAIL" `
        --role=$role --quiet
}

Write-Host "Granting roles to Cloud Build Service Account..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$CLOUDBUILD_SA_EMAIL" `
    --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$CLOUDBUILD_SA_EMAIL" `
    --role="roles/iam.serviceAccountUser" --quiet

Write-Host "`n------------------------------------------------------------" -ForegroundColor Green
Write-Host "SETUP COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Green
Write-Host "Next Steps:"
Write-Host "1. Create the composite vector index for the 'chunks' collection."
Write-Host "   Run this command:"
Write-Host "   gcloud alpha firestore indexes composite create --collection-group=chunks --field-config field-path=embedding,vector-config='{`"dimension`":`"3072`",`"flat`":{}}'"
Write-Host "`n2. Your .env file is already updated with project details."
Write-Host "------------------------------------------------------------"
