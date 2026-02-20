Google Cloud 101
Initial Permissions for Google Cloud and Firebase
Based on what we've just gone through, here is the definitive "New GCP/Firebase Project IAM Checklist" I would recommend. If you apply these permissions at the start of a new project, you will preemptively solve 99% of the deployment errors we've encountered.
The Essential IAM "Startup" Checklist for New Projects
Think of this as setting up the "scaffolding" for your project's permissions. You're giving the Google-managed tools the explicit ability to do their jobs.
Note: If you don’t plan to use Cloud Functions, you only need to worry about adding the Logs Writer role to the Compute Engine Default Service Account. You probably don’t need any of this actually.

0. Login to the Firebase CLI
   firebase login
   or
   firebase login --reauth

1. For the Cloud Build Service Account
   In the Google Cloud Console, go to IAM
   Who: [PROJECT_NUMBER]@cloudbuild.gserviceaccount.com
   Why: This account builds your code into a container. It needs to manage artifacts, create the final service, and act as the runtime identity.
   Permissions to Grant on the Project:
   roles/run.admin: To create and manage the Cloud Run service that hosts your v2 function.
   roles/artifactregistry.repoAdmin: To read from the build cache and write the new container image to Artifact Registry.
   roles/logging.logWriter: To write build logs.1
   Permission to Grant on the Runtime Service Account:
   roles/iam.serviceAccountUser: This is the most common point of failure. You must grant this role on the service account your function will run as (e.g., the App Engine default SA or your custom chatbot-backend SA).
2. For the Compute Engine Default Service Account
   Who: [PROJECT_NUMBER]-compute@developer.gserviceaccount.com
   Why: As we discovered, this account is used for specific steps in the build process, like fetching the source code.
   Permissions to Grant on the Project:
   roles/storage.objectViewer: To read your function's source code from the Cloud Storage bucket.2
   roles/logging.logWriter: To ensure detailed logs from all build steps are visible.
   roles/run.admin: To create and manage the Cloud Run service that hosts your v2 function.
   roles/artifactregistry.repoAdmin: To read from the build cache and write the new container image to Artifact Registry.
3. For the Google-Managed "Robot" Accounts (The "If All Else Fails" Fix) – Shouldn’t need this
   Who: The Google-managed Service Agents for each API.
   Why: These are supposed to be configured automatically when you enable an API, but sometimes the grant fails silently. Manually re-applying these roles can fix a project that's in a broken state.
   Permissions to Grant on the Project:
   Grant roles/cloudfunctions.serviceAgent to service-[PROJECT_NUMBER]@gcf-admin-robot.iam.gserviceaccount.com.
   Grant roles/cloudbuild.serviceAgent to service-[PROJECT_NUMBER]@gcp-sa-cloudbuild.iam.gserviceaccount.com.

This checklist covers the infrastructure permissions needed to simply get a function deployed. Your application permissions (like letting your function access Firestore or Vertex AI) are separate and should be granted to the specific custom service account your function runs as, following the principle of least privilege.
