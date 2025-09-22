Akuntansi Pro — Firebase Auth enabled
===================================

Files in this package:
- index.html
- style.css
- script.js
- manifest.json
- service-worker.js
- icon-192.png, icon-512.png
- firestore.rules (Firestore security rules sample)

IMPORTANT: Replace Firebase config placeholders in script.js before deploying.
Steps to enable Google Authentication and Firestore:

1. Create Firebase project at https://console.firebase.google.com/
2. In Project settings -> Add Web App -> Copy firebaseConfig and replace the placeholders in script.js
3. In Authentication -> Sign-in method -> Enable Google provider
4. In Firestore -> Create database
5. In Firestore -> Rules -> paste content of firestore.rules and publish
6. In Authentication -> Authorized domains -> add your GitHub Pages domain (e.g. kzkfinn.github.io)
7. Commit all files to your GitHub repo root and enable GitHub Pages (main branch, root)
8. Visit your site and click "Sign in with Google" to test.
9. After first login, data will be saved to Firestore under collection `users/{uid}`

Security notes:
- Do NOT add service account keys or other secrets to client code.
- The Firestore rules above restrict access so users can only access their own document.
- For production consider enabling App Check and monitoring usage to control costs.

