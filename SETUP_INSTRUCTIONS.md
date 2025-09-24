# XSLT Transformation Engine - Local Setup

## What You're Getting

This is a complete full-stack XSLT transformation application built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript  
- **Features**: XML/XSL transformation, XSD validation, file management, real-time progress tracking

## Prerequisites

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## Setup Instructions

1. **Extract the zip file** to your desired directory

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and go to:
   ```
   http://localhost:5000
   ```

## How It Works

- **Single command**: `npm run dev` starts both frontend and backend
- **Frontend**: Runs on port 5000 (Vite development server)
- **Backend**: Express server integrated with Vite
- **File storage**: Uses in-memory storage (data resets on restart)
- **File uploads**: Saved to local `uploads/` directory

## Features Available

✅ **XML/XSL file upload and management**
✅ **XSLT transformations with real-time progress**  
✅ **XSD schema validation**
✅ **XSD reverse engineering from XML**
✅ **Dependency resolution for complex XSL imports**
✅ **File preview and content inspection**
✅ **Transformation history and results viewing**
✅ **Error handling and debugging tools**

## Sample Files

The application works great with government forms like W-2 documents. You can test with:
- XML files containing structured data
- XSL stylesheets for transformation
- XSD schemas for validation

## Technical Notes

- **Storage**: Currently uses in-memory storage - data is lost on restart
- **File persistence**: Uploaded files are saved to disk in `uploads/` directory
- **Dependencies**: All necessary packages are included in package.json
- **Hot reload**: Frontend automatically refreshes during development
- **API**: Backend runs on same port as frontend (5000) with `/api/*` routes

## Troubleshooting

**Port 5000 already in use?**
- Stop other services using port 5000, or
- Modify `vite.config.ts` to use a different port

**npm install fails?**
- Try: `npm install --legacy-peer-deps`
- Or delete `package-lock.json` and try again

**File uploads not working?**
- Ensure the application has write permissions in the directory
- Check that `uploads/` directory gets created automatically

## Architecture Summary

```
/client/          # React frontend (TypeScript)
/server/          # Express backend (TypeScript)  
/shared/          # Shared types and schemas
/uploads/         # File storage directory (created automatically)
package.json      # Dependencies and scripts
vite.config.ts    # Development server configuration
```

---

**Built with collaborative AI development**
*This application was created through human-AI partnership, demonstrating real-world collaborative software engineering.*